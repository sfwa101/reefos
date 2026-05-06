
-- ============ ACTION 1: SOCIAL GRAPH & MESSAGING ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('DIRECT','GROUP','SUPPORT','ORDER_CONTEXT')),
  title text,
  context_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_context ON public.conversations(context_id);

CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN','MEMBER')),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_cp_user ON public.conversation_participants(user_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv_time ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ============ ACTION 2: MINI-PROGRAMS REGISTRY ============
CREATE TABLE public.mini_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key varchar(50) UNIQUE NOT NULL,
  name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  developer_id uuid NOT NULL,
  manifest_url text NOT NULL,
  status text NOT NULL DEFAULT 'IN_REVIEW' CHECK (status IN ('IN_REVIEW','ACTIVE','SUSPENDED')),
  version varchar(20),
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mini_apps_status ON public.mini_apps(status);

CREATE TABLE public.mini_app_installations (
  user_id uuid NOT NULL,
  mini_app_id uuid NOT NULL REFERENCES public.mini_apps(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mini_app_id)
);
CREATE INDEX idx_mai_user ON public.mini_app_installations(user_id);

-- ============ HELPER (avoid RLS recursion on participants) ============
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

-- ============ ENABLE RLS ============
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_app_installations ENABLE ROW LEVEL SECURITY;

-- ============ RLS: conversations ============
CREATE POLICY "conv_select_participant_or_admin" ON public.conversations
FOR SELECT TO authenticated
USING (public.is_conversation_participant(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "conv_insert_authenticated" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

CREATE POLICY "conv_update_participant_admin" ON public.conversations
FOR UPDATE TO authenticated
USING (public.is_conversation_participant(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "conv_delete_admin" ON public.conversations
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ RLS: conversation_participants ============
CREATE POLICY "cp_select_self_or_same_conv" ON public.conversation_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_conversation_participant(auth.uid(), conversation_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "cp_insert_self_or_admin" ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_conversation_participant(auth.uid(), conversation_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "cp_update_self" ON public.conversation_participants
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cp_delete_self_or_admin" ON public.conversation_participants
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ RLS: messages ============
CREATE POLICY "msg_select_participant" ON public.messages
FOR SELECT TO authenticated
USING (public.is_conversation_participant(auth.uid(), conversation_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "msg_insert_participant_self" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_participant(auth.uid(), conversation_id)
);

CREATE POLICY "msg_update_sender" ON public.messages
FOR UPDATE TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "msg_delete_sender_or_admin" ON public.messages
FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ RLS: mini_apps ============
CREATE POLICY "ma_select_active_or_owner_or_admin" ON public.mini_apps
FOR SELECT TO authenticated, anon
USING (status = 'ACTIVE' OR developer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ma_insert_developer_self" ON public.mini_apps
FOR INSERT TO authenticated
WITH CHECK (developer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ma_update_developer_or_admin" ON public.mini_apps
FOR UPDATE TO authenticated
USING (developer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ma_delete_admin" ON public.mini_apps
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ RLS: mini_app_installations ============
CREATE POLICY "mai_select_owner" ON public.mini_app_installations
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "mai_insert_owner" ON public.mini_app_installations
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "mai_update_owner" ON public.mini_app_installations
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "mai_delete_owner" ON public.mini_app_installations
FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ Triggers ============
CREATE TRIGGER trg_mini_apps_updated_at BEFORE UPDATE ON public.mini_apps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

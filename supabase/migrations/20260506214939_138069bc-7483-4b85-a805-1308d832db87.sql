
-- =====================================================================
-- PHASE P — WECHAT FABRIC (adapt to existing schema)
-- =====================================================================

-- ---------- conversations ----------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'OPEN';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_status_check'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_status_check CHECK (status IN ('OPEN','ARCHIVED'));
  END IF;
END $$;

-- Broaden conversation type list (drop & recreate constraint to include ORDER/VENDOR/DRIVER/GENERAL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_type_check') THEN
    ALTER TABLE public.conversations DROP CONSTRAINT conversations_type_check;
  END IF;
  ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_type_check
    CHECK (type IN ('DIRECT','GROUP','SUPPORT','ORDER_CONTEXT','ORDER','VENDOR','DRIVER','GENERAL'));
END $$;

-- ---------- messages ----------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'TEXT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_type_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_content_type_check
      CHECK (content_type IN ('TEXT','SYSTEM','IMAGE','FILE'));
  END IF;
END $$;

-- ---------- notifications ----------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'SYSTEM';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('COMMISSION','ORDER','SYSTEM','CHAT','ESCROW','PROMO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read, created_at DESC);

-- ---------- ACTION 3: Realtime publication ----------
DO $$
BEGIN
  BEGIN ALTER TABLE public.notifications REPLICA IDENTITY FULL;
  EXCEPTION WHEN others THEN NULL; END;

  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
            WHEN undefined_object THEN NULL; END;

  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
            WHEN undefined_object THEN NULL; END;
END $$;

-- ---------- ACTION 4: push_notification RPC ----------
-- Uses existing column name `read` (not is_read).
CREATE OR REPLACE FUNCTION public.push_notification(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_body    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, read)
  VALUES (p_user_id, p_type, p_title, p_body, false)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.push_notification(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_notification(uuid,text,text,text) TO authenticated, service_role;

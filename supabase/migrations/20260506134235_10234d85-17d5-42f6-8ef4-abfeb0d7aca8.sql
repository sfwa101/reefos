
DO $$
DECLARE
  v_phone text := '01055846000';
  v_email text := '01055846000@reef.local';
  v_pass  text := '558588';
  v_encrypted text;
  v_user_id uuid;
BEGIN
  v_encrypted := crypt(v_pass, gen_salt('bf'));

  SELECT id INTO v_user_id
    FROM auth.users
   WHERE phone = v_phone OR email IN (v_email, '01055846000@admin.system')
   ORDER BY created_at ASC
   LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, phone,
      email_confirmed_at, phone_confirmed_at, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, v_phone, now(), now(), v_encrypted,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role','admin','full_name','Master Admin','phone',v_phone),
      now(), now()
    );
  ELSE
    UPDATE auth.users
       SET email              = v_email,
           phone              = v_phone,
           encrypted_password = v_encrypted,
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
           raw_user_meta_data = jsonb_set(
             jsonb_set(COALESCE(raw_user_meta_data,'{}'::jsonb),'{role}','"admin"'),
             '{phone}', to_jsonb(v_phone)),
           updated_at = now()
     WHERE id = v_user_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

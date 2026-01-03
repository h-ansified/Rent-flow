
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, role)
  VALUES (
    new.id::text, -- Explicitly cast UUID to text
    new.email, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'tenant')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retira el uso del rol global "gerencial" sin tocar la capa de grupos.
-- Gerencia se mantiene como grupo/area organizacional administrada por ABAC.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    UPDATE users
    SET role = 'funcionario'::user_role
    WHERE role::text = 'gerencial';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'role_permission_policies'
  ) THEN
    DELETE FROM role_permission_policies
    WHERE role::text = 'gerencial';
  END IF;
END $$;

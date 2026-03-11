process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://bitacora_user:bitacora_pass@127.0.0.1:5432/bitacora_test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test_jwt_secret_123456789012345678901234567890";

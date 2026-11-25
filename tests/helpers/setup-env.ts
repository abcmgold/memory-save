// Test environment: no real database or bucket is contacted (research.md R14).
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.R2_ACCOUNT_ID ??= "test-account";
process.env.R2_ACCESS_KEY_ID ??= "test-key";
process.env.R2_SECRET_ACCESS_KEY ??= "test-secret";
process.env.R2_BUCKET ??= "test-bucket";
process.env.APP_TIMEZONE ??= "Asia/Ho_Chi_Minh";
process.env.CRON_SECRET ??= "test-cron-secret-0123456789abcdef";

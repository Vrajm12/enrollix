UPDATE "tenants"
SET "max_users" = 50
WHERE "slug" = 'dvcoe' AND "max_users" < 50;

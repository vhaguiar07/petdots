-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('TUTOR', 'STORE_MEMBER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(16),
    "password_hash" VARCHAR(255) NOT NULL,
    "roles" "user_role"[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Written by hand, same reason as the pd-11 migration: Prisma does not model
-- check constraints, and these two are invariants, not preferences.
--
-- `email = lower(email)` is what makes the unique index above mean "one person,
-- one account". Uniqueness over a column that still accepts `Victor@x.com`
-- next to `victor@x.com` is uniqueness over the spelling, not over the person —
-- and the normalisation would then live only in the code that happens to write
-- (ADR-0011, 3.5).
--
-- A user with an empty `roles` array is an identity that can do nothing: every
-- RolesGuard check is an intersection, and an empty set never intersects. The
-- row would authenticate and be denied everywhere, which reads as a bug in the
-- guard rather than as bad data (ADR-0011, R4).
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));
ALTER TABLE "users" ADD CONSTRAINT "users_roles_not_empty_check" CHECK (array_length("roles", 1) >= 1);

-- CreateEnum
CREATE TYPE "pet_species" AS ENUM ('DOG', 'CAT');

-- CreateTable
CREATE TABLE "tutors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "street" VARCHAR(160) NOT NULL,
    "street_number" VARCHAR(20) NOT NULL,
    "complement" VARCHAR(80),
    "neighborhood" VARCHAR(80) NOT NULL,
    "postal_code" CHAR(8) NOT NULL,
    "reference" VARCHAR(160),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tutor_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "species" "pet_species" NOT NULL,
    "birth_date" DATE,
    "weight_grams" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutors_user_id_key" ON "tutors"("user_id");

-- CreateIndex
CREATE INDEX "pets_tutor_id_idx" ON "pets"("tutor_id");

-- AddForeignKey
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Written by hand, same reason as the pd-11 and pd-12 migrations: Prisma does
-- not model check constraints, and these two are invariants, not preferences.
--
-- A pet of zero or negative grams is not a pet with an odd weight, it is a row
-- the consumption calculator (capacidade 9) would divide by. The contract
-- refuses it on the border and the domain re-checks it in the use case; this is
-- the only one of the three that also holds for a row written by a seed, a
-- script or `prisma studio`.
--
-- `postal_code` is CHAR(8) and the code normalises to eight bare digits, but
-- CHAR(8) accepts `2072-000` just as happily. The check is what makes the
-- column mean "a CEP" rather than "eight characters" — and `neighborhood` and
-- `postal_code` are read to decide who delivers to this address.
ALTER TABLE "pets" ADD CONSTRAINT "pets_weight_grams_check" CHECK ("weight_grams" > 0);
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_postal_code_check" CHECK ("postal_code" ~ '^[0-9]{8}$');

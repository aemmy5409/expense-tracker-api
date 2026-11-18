-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('bank', 'savings', 'loan', 'investment', 'other');

-- DropForeignKey
ALTER TABLE "MagicLinkToken" DROP CONSTRAINT "MagicLinkToken_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_user_id_fkey";

-- AlterTable (hand-edited: cast TEXT ids to UUID in place instead of drop/re-add, preserving data)
ALTER TABLE "User" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::uuid,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(120),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "email_verified_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "MagicLinkToken" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::uuid,
ALTER COLUMN "user_id" SET DATA TYPE UUID USING "user_id"::uuid,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "consumed_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::uuid,
ALTER COLUMN "user_id" SET DATA TYPE UUID USING "user_id"::uuid,
ALTER COLUMN "refresh_token_hash" SET DATA TYPE CHAR(64),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "Currency" (
    "code" CHAR(3) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "symbol" VARCHAR(8) NOT NULL,
    "minor_units" SMALLINT NOT NULL DEFAULT 2,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "AccountType" NOT NULL,
    "institution" VARCHAR(80),
    "account_number_last4" CHAR(4),
    "currency_code" CHAR(3) NOT NULL,
    "opening_balance_minor" BIGINT NOT NULL DEFAULT 0,
    "opening_balance_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_currency_code_idx" ON "Account"("currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "Account_user_id_name_key" ON "Account"("user_id", "name");

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Not expressible in Prisma (see schema.prisma Currency @@check comment)
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_minor_units_check" CHECK ("minor_units" BETWEEN 0 AND 4);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "requested_ip" INET,
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_hash_key" ON "MagicLinkToken"("token_hash");

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Not expressible in Prisma (see et-planning/schema.sql)
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_expires_after_created" CHECK ("expires_at" > "created_at");
CREATE INDEX "ix_magic_link_active" ON "MagicLinkToken" ("user_id") WHERE "consumed_at" IS NULL;

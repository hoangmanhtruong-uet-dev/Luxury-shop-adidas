-- Phase 3 (homepage newsletter capture).
-- Email is unique: resubscribing returns the previously issued code instead of
-- minting duplicates.
CREATE TABLE "newsletter_subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "voucherCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "newsletter_subscription_email_key" UNIQUE ("email")
);

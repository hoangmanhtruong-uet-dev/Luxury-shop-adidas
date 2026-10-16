-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin', 'editor', 'sale', 'warehouse', 'shipper');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cod', 'bank_transfer', 'momo', 'vnpay', 'stripe');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'payment_failed', 'confirmed', 'packing', 'shipping', 'delivered', 'expired', 'cancelled', 'payment_review', 'refund_pending', 'refunded', 'return_requested', 'return_approved', 'return_rejected', 'returning', 'returned');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "isSeller" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "gender" TEXT,
    "birthday" TIMESTAMP(3),
    "avatar" TEXT,
    "balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "paymentPinHash" TEXT,
    "licensePlate" TEXT,
    "transportType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(19,4) NOT NULL,
    "minOrderValue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "maxDiscount" DECIMAL(19,4),
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 100,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "detailAddress" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bankinfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bankinfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sku" VARCHAR(64),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "originalPrice" DECIMAL(19,4),
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "description" TEXT,
    "image" TEXT,
    "emoji" TEXT,
    "gradient" TEXT,
    "categoryId" TEXT,
    "badge" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "stockQuantity" INTEGER NOT NULL DEFAULT 100,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "sellerId" TEXT,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sale_event" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sale_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sale_item" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "flash_sale_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "shippingFee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "shippingProvider" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "packingStartedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "returnRequestedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "refundPendingAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "total" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusVersion" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "shipperId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyScope" TEXT,
    "idempotencyKey" VARCHAR(255),

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_transition" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" VARCHAR(32) NOT NULL,
    "toStatus" VARCHAR(32) NOT NULL,
    "actorType" VARCHAR(32) NOT NULL,
    "actorId" VARCHAR(191),
    "reason" VARCHAR(500),
    "metadata" TEXT,
    "idempotencyKey" VARCHAR(191),
    "requestHash" CHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_transition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_fulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT,
    "sellerScope" VARCHAR(191) NOT NULL,
    "shipperId" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "statusVersion" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "shippingFee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "shippingProvider" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "packingStartedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveryFailedAt" TIMESTAMP(3),
    "deliveryFailureReason" VARCHAR(500),
    "proofOfDeliveryUrl" TEXT,
    "proofRecipientName" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_fulfillment_transition" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "fromStatus" VARCHAR(32) NOT NULL,
    "toStatus" VARCHAR(32) NOT NULL,
    "actorType" VARCHAR(32) NOT NULL,
    "actorId" VARCHAR(191),
    "reason" VARCHAR(500),
    "metadata" TEXT,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_fulfillment_transition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_return" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    "reason" VARCHAR(500) NOT NULL,
    "requestedBy" VARCHAR(191) NOT NULL,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "order_return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "lineTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "fulfillmentId" TEXT,

    CONSTRAINT "orderitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" TEXT NOT NULL,
    "aggregateType" VARCHAR(64) NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" VARCHAR(96) NOT NULL,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "payload" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lockedBy" VARCHAR(191),
    "processedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastErrorCode" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "businessName" VARCHAR(191) NOT NULL,
    "taxCode" VARCHAR(64),
    "identityNumber" VARCHAR(64),
    "identityFrontUrl" TEXT,
    "identityBackUrl" TEXT,
    "businessAddress" VARCHAR(500) NOT NULL,
    "commissionRate" DECIMAL(7,4) NOT NULL DEFAULT 5,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "rejectionReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" VARCHAR(32) NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "referenceType" VARCHAR(64),
    "referenceId" TEXT,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_attempt" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "outcome" VARCHAR(32) NOT NULL,
    "proofUrl" TEXT,
    "recipientName" VARCHAR(191),
    "note" VARCHAR(500),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cod_collection" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "collectedById" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "status" VARCHAR(32) NOT NULL DEFAULT 'COLLECTED',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remittedAt" TIMESTAMP(3),

    CONSTRAINT "cod_collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_settlement" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "grossAmount" DECIMAL(19,4) NOT NULL,
    "commissionRate" DECIMAL(7,4) NOT NULL,
    "commissionAmount" DECIMAL(19,4) NOT NULL,
    "netAmount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "status" VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "payoutRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_request" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "bankInfoId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "rejectionReason" VARCHAR(500),

    CONSTRAINT "payout_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_return" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    "reason" VARCHAR(500) NOT NULL,
    "evidenceUrl" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "idempotencyKey" VARCHAR(191) NOT NULL,

    CONSTRAINT "fulfillment_return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siteconfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'MTRUONG-STORE',
    "hotline" TEXT NOT NULL DEFAULT '1900 8888',
    "contactEmail" TEXT NOT NULL DEFAULT 'support@mtruong.store',
    "address" TEXT DEFAULT 'Viá»‡t Nam',
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "momoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bankingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vnpayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "lastBackupAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siteconfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productimage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productimage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_record" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "scopeId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "method" VARCHAR(16) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PROCESSING',
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "resourceType" VARCHAR(64),
    "resourceId" TEXT,
    "errorCode" TEXT,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'completed',
    "operation" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(64) NOT NULL DEFAULT 'internal_wallet',
    "providerOutcome" VARCHAR(64) NOT NULL DEFAULT 'SUCCEEDED',
    "providerIdempotencyKey" TEXT NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "refundedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'completed',
    "operation" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(64) NOT NULL DEFAULT 'internal_wallet',
    "providerOutcome" VARCHAR(64) NOT NULL DEFAULT 'SUCCEEDED',
    "providerRefundId" TEXT,
    "sourceEventId" TEXT,
    "approvalKey" VARCHAR(191),
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_outbox_event" (
    "id" TEXT NOT NULL,
    "consumerName" VARCHAR(96) NOT NULL,
    "eventId" TEXT NOT NULL,
    "resultHash" CHAR(64),
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerName" VARCHAR(96) NOT NULL,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "channel" VARCHAR(32) NOT NULL DEFAULT 'log',
    "recipient" VARCHAR(191) NOT NULL,
    "template" VARCHAR(96) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "providerMessageId" VARCHAR(191),
    "providerIdempotencyKey" VARCHAR(191) NOT NULL,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'info',
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refundId" TEXT,
    "deterministicKey" VARCHAR(191) NOT NULL,
    "referenceType" VARCHAR(64) NOT NULL,
    "referenceId" VARCHAR(191) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "balanceBefore" DECIMAL(19,4) NOT NULL,
    "balanceAfter" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "entryType" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_audit_log" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(96) NOT NULL,
    "actorId" VARCHAR(191),
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(191) NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_heartbeat" (
    "workerId" VARCHAR(191) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "lastPollAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "inflight" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_heartbeat_pkey" PRIMARY KEY ("workerId")
);

-- CreateTable
CREATE TABLE "webhook_event" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PROCESSING',
    "orderId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_bucket" (
    "keyHash" CHAR(64) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_bucket_pkey" PRIMARY KEY ("keyHash")
);

-- CreateTable
CREATE TABLE "upload_quota_bucket" (
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "bytesUsed" BIGINT NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_quota_bucket_pkey" PRIMARY KEY ("userId","periodStart")
);

-- CreateTable
CREATE TABLE "upload_reservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quotaPeriodStart" TIMESTAMP(3) NOT NULL,
    "fileCount" INTEGER NOT NULL,
    "bytesReserved" BIGINT NOT NULL,
    "storageKeys" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'RESERVED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" VARCHAR(255) NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "purpose" VARCHAR(32) NOT NULL,
    "resourceId" VARCHAR(191),
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(64) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_code_key" ON "user"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_code_idx" ON "user"("code");

-- CreateIndex
CREATE UNIQUE INDEX "session_tokenHash_key" ON "session"("tokenHash");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_tokenHash_idx" ON "session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_tokenHash_key" ON "password_reset_token"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_token_userId_idx" ON "password_reset_token"("userId");

-- CreateIndex
CREATE INDEX "password_reset_token_tokenHash_idx" ON "password_reset_token"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_tokenHash_key" ON "verification_token"("tokenHash");

-- CreateIndex
CREATE INDEX "verification_token_userId_idx" ON "verification_token"("userId");

-- CreateIndex
CREATE INDEX "verification_token_tokenHash_idx" ON "verification_token"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_code_key" ON "voucher"("code");

-- CreateIndex
CREATE INDEX "voucher_sellerId_idx" ON "voucher"("sellerId");

-- CreateIndex
CREATE INDEX "voucher_code_idx" ON "voucher"("code");

-- CreateIndex
CREATE INDEX "address_userId_idx" ON "address"("userId");

-- CreateIndex
CREATE INDEX "bankinfo_userId_idx" ON "bankinfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "product_code_key" ON "product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_sellerId_idx" ON "product"("sellerId");

-- CreateIndex
CREATE INDEX "product_seller_deleted_created_idx" ON "product"("sellerId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "product_deleted_created_idx" ON "product"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE INDEX "product_code_idx" ON "product"("code");

-- CreateIndex
CREATE INDEX "product_stock_quantity_idx" ON "product"("stockQuantity");

-- CreateIndex
CREATE INDEX "flash_sale_event_isActive_startTime_endTime_idx" ON "flash_sale_event"("isActive", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "flash_sale_item_eventId_productId_key" ON "flash_sale_item"("eventId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "review_userId_idx" ON "review"("userId");

-- CreateIndex
CREATE INDEX "review_productId_idx" ON "review"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "review_userId_productId_key" ON "review"("userId", "productId");

-- CreateIndex
CREATE INDEX "wishlist_userId_idx" ON "wishlist"("userId");

-- CreateIndex
CREATE INDEX "wishlist_productId_idx" ON "wishlist"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_userId_productId_key" ON "wishlist"("userId", "productId");

-- CreateIndex
CREATE INDEX "order_userId_idx" ON "order"("userId");

-- CreateIndex
CREATE INDEX "order_shipperId_idx" ON "order"("shipperId");

-- CreateIndex
CREATE INDEX "order_status_idx" ON "order"("status");

-- CreateIndex
CREATE INDEX "order_paymentStatus_idx" ON "order"("paymentStatus");

-- CreateIndex
CREATE INDEX "order_user_created_idx" ON "order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "order_created_idx" ON "order"("createdAt");

-- CreateIndex
CREATE INDEX "order_status_created_idx" ON "order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "order_payment_status_created_idx" ON "order"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "order_shipper_status_created_idx" ON "order"("shipperId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_idempotencyScope_idempotencyKey_key" ON "order"("idempotencyScope", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "order_transition_idem_key" ON "order_status_transition"("idempotencyKey");

-- CreateIndex
CREATE INDEX "order_transition_order_created_idx" ON "order_status_transition"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_transition_actor_idx" ON "order_status_transition"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "seller_fulfillment_seller_status_idx" ON "seller_fulfillment"("sellerId", "status");

-- CreateIndex
CREATE INDEX "seller_fulfillment_shipper_status_idx" ON "seller_fulfillment"("shipperId", "status");

-- CreateIndex
CREATE INDEX "seller_fulfillment_status_created_idx" ON "seller_fulfillment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "seller_fulfillment_order_scope_key" ON "seller_fulfillment"("orderId", "sellerScope");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_transition_idem_key" ON "seller_fulfillment_transition"("idempotencyKey");

-- CreateIndex
CREATE INDEX "fulfillment_transition_created_idx" ON "seller_fulfillment_transition"("fulfillmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_return_idem_key" ON "order_return"("idempotencyKey");

-- CreateIndex
CREATE INDEX "order_return_order_status_idx" ON "order_return"("orderId", "status");

-- CreateIndex
CREATE INDEX "orderitem_orderId_idx" ON "orderitem"("orderId");

-- CreateIndex
CREATE INDEX "orderitem_productId_idx" ON "orderitem"("productId");

-- CreateIndex
CREATE INDEX "orderitem_fulfillment_idx" ON "orderitem"("fulfillmentId");

-- CreateIndex
CREATE UNIQUE INDEX "orderitem_orderId_productId_key" ON "orderitem"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "inv_res_orderItem_key" ON "inventory_reservation"("orderItemId");

-- CreateIndex
CREATE INDEX "inv_res_status_expires_idx" ON "inventory_reservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "inv_res_order_status_idx" ON "inventory_reservation"("orderId", "status");

-- CreateIndex
CREATE INDEX "inv_res_product_status_idx" ON "inventory_reservation"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_event_idem_key" ON "outbox_event"("idempotencyKey");

-- CreateIndex
CREATE INDEX "outbox_status_next_idx" ON "outbox_event"("status", "nextAttemptAt", "id");

-- CreateIndex
CREATE INDEX "outbox_status_lease_idx" ON "outbox_event"("status", "lockedUntil");

-- CreateIndex
CREATE INDEX "outbox_type_status_idx" ON "outbox_event"("eventType", "status");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_idx" ON "outbox_event"("aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profile_userId_key" ON "seller_profile"("userId");

-- CreateIndex
CREATE INDEX "seller_profile_status_submitted_idx" ON "seller_profile"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movement_idempotencyKey_key" ON "inventory_movement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "inventory_movement_product_created_idx" ON "inventory_movement"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_attempt_idempotencyKey_key" ON "delivery_attempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "delivery_attempt_fulfillment_idx" ON "delivery_attempt"("fulfillmentId", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cod_collection_fulfillmentId_key" ON "cod_collection"("fulfillmentId");

-- CreateIndex
CREATE INDEX "cod_collection_status_idx" ON "cod_collection"("status", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "seller_settlement_fulfillmentId_key" ON "seller_settlement"("fulfillmentId");

-- CreateIndex
CREATE INDEX "seller_settlement_seller_status_idx" ON "seller_settlement"("sellerId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "payout_request_seller_status_idx" ON "payout_request"("sellerId", "status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_return_idempotencyKey_key" ON "fulfillment_return"("idempotencyKey");

-- CreateIndex
CREATE INDEX "fulfillment_return_status_idx" ON "fulfillment_return"("fulfillmentId", "status");

-- CreateIndex
CREATE INDEX "productimage_productId_idx" ON "productimage"("productId");

-- CreateIndex
CREATE INDEX "idempotency_record_expiresAt_idx" ON "idempotency_record"("expiresAt");

-- CreateIndex
CREATE INDEX "idempotency_record_status_expiresAt_idx" ON "idempotency_record"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "idempotency_record_status_lockedAt_idx" ON "idempotency_record"("status", "lockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_record_scopeId_operation_key_key" ON "idempotency_record"("scopeId", "operation", "key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orderId_key" ON "payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerIdempotencyKey_key" ON "payment"("providerIdempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerTransactionId_key" ON "payment"("providerTransactionId");

-- CreateIndex
CREATE INDEX "payment_userId_createdAt_idx" ON "payment"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_userId_operation_idempotencyKey_key" ON "payment"("userId", "operation", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "refund_providerRefundId_key" ON "refund"("providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_source_event_key" ON "refund"("sourceEventId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_approval_key" ON "refund"("approvalKey");

-- CreateIndex
CREATE INDEX "refund_paymentId_createdAt_idx" ON "refund"("paymentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refund_userId_operation_idempotencyKey_key" ON "refund"("userId", "operation", "idempotencyKey");

-- CreateIndex
CREATE INDEX "processed_event_idx" ON "processed_outbox_event"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "processed_consumer_event_key" ON "processed_outbox_event"("consumerName", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_idem_key" ON "notification_delivery"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "notification_provider_idem_key" ON "notification_delivery"("providerIdempotencyKey");

-- CreateIndex
CREATE INDEX "notification_status_created_idx" ON "notification_delivery"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_consumer_event_key" ON "notification_delivery"("consumerName", "eventId");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_read_idx" ON "notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_refund_key" ON "wallet_ledger"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_deterministic_key" ON "wallet_ledger"("deterministicKey");

-- CreateIndex
CREATE INDEX "wallet_ledger_user_created_idx" ON "wallet_ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_entity_created_idx" ON "domain_audit_log"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_action_created_idx" ON "domain_audit_log"("action", "createdAt");

-- CreateIndex
CREATE INDEX "worker_status_expires_idx" ON "worker_heartbeat"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "webhook_event_status_createdAt_idx" ON "webhook_event"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_provider_providerEventId_key" ON "webhook_event"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "rate_limit_expires_idx" ON "rate_limit_bucket"("expiresAt");

-- CreateIndex
CREATE INDEX "upload_quota_expires_idx" ON "upload_quota_bucket"("expiresAt");

-- CreateIndex
CREATE INDEX "upload_reservation_cleanup_idx" ON "upload_reservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "upload_reservation_user_created_idx" ON "upload_reservation"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upload_asset_storage_key" ON "upload_asset"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "upload_asset_url_key" ON "upload_asset"("url");

-- CreateIndex
CREATE INDEX "upload_asset_owner_purpose_idx" ON "upload_asset"("userId", "purpose", "status");

-- CreateIndex
CREATE INDEX "upload_asset_resource_idx" ON "upload_asset"("resourceId", "purpose");

-- CreateIndex
CREATE INDEX "upload_asset_cleanup_idx" ON "upload_asset"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bankinfo" ADD CONSTRAINT "bankinfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sale_item" ADD CONSTRAINT "flash_sale_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "flash_sale_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sale_item" ADD CONSTRAINT "flash_sale_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_transition" ADD CONSTRAINT "order_transition_order_fk" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_fulfillment" ADD CONSTRAINT "seller_fulfillment_order_fk" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_fulfillment" ADD CONSTRAINT "seller_fulfillment_seller_fk" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_fulfillment" ADD CONSTRAINT "seller_fulfillment_shipper_fk" FOREIGN KEY ("shipperId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_fulfillment_transition" ADD CONSTRAINT "fulfillment_transition_fulfillment_fk" FOREIGN KEY ("fulfillmentId") REFERENCES "seller_fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return" ADD CONSTRAINT "order_return_order_fk" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_fulfillment_fk" FOREIGN KEY ("fulfillmentId") REFERENCES "seller_fulfillment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inv_res_order_fk" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inv_res_orderitem_fk" FOREIGN KEY ("orderItemId") REFERENCES "orderitem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inv_res_product_fk" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_order_fk" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profile" ADD CONSTRAINT "seller_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "seller_fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cod_collection" ADD CONSTRAINT "cod_collection_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "seller_fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cod_collection" ADD CONSTRAINT "cod_collection_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_settlement" ADD CONSTRAINT "seller_settlement_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "seller_fulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_settlement" ADD CONSTRAINT "seller_settlement_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_settlement" ADD CONSTRAINT "seller_settlement_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "payout_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_return" ADD CONSTRAINT "fulfillment_return_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "seller_fulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productimage" ADD CONSTRAINT "productimage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_record" ADD CONSTRAINT "idempotency_record_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_refund_fk" FOREIGN KEY ("refundId") REFERENCES "refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_quota_bucket" ADD CONSTRAINT "upload_quota_user_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_reservation" ADD CONSTRAINT "upload_reservation_user_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_asset" ADD CONSTRAINT "upload_asset_user_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ported money/inventory safety CHECK constraints (Supabase migration).
-- Prisma cannot model CHECK constraints, so the MySQL originals
-- (20260724120000, 20260724160000) are reproduced here verbatim in PG syntax.
-- money-audit.ts asserts their presence via information_schema.check_constraints.
ALTER TABLE product
  ADD CONSTRAINT product_stock_nonnegative_chk CHECK ("stockQuantity" >= 0),
  ADD CONSTRAINT product_reserved_nonnegative_chk CHECK ("reservedQuantity" >= 0),
  ADD CONSTRAINT product_reserved_lte_stock_chk CHECK ("reservedQuantity" <= "stockQuantity");
ALTER TABLE "user" ADD CONSTRAINT ck_user_balance_nonnegative CHECK (balance >= 0), ADD CONSTRAINT ck_user_currency_vnd CHECK (currency = 'VND');
ALTER TABLE voucher ADD CONSTRAINT ck_voucher_money_nonnegative CHECK ("discountValue" >= 0 AND "minOrderValue" >= 0 AND ("maxDiscount" IS NULL OR "maxDiscount" >= 0)), ADD CONSTRAINT ck_voucher_currency_vnd CHECK (currency = 'VND');
ALTER TABLE product ADD CONSTRAINT ck_product_price_nonnegative CHECK (price >= 0 AND ("originalPrice" IS NULL OR "originalPrice" >= 0)), ADD CONSTRAINT ck_product_currency_vnd CHECK (currency = 'VND');
ALTER TABLE "order" ADD CONSTRAINT ck_order_money_nonnegative CHECK (subtotal >= 0 AND "discountAmount" >= 0 AND "discountAmount" <= subtotal AND "shippingFee" >= 0 AND "taxAmount" >= 0 AND total >= 0), ADD CONSTRAINT ck_order_currency_vnd CHECK (currency = 'VND');
ALTER TABLE orderitem ADD CONSTRAINT ck_orderitem_money_nonnegative CHECK (price >= 0 AND "lineTotal" >= 0), ADD CONSTRAINT ck_orderitem_currency_vnd CHECK (currency = 'VND');
ALTER TABLE payment ADD CONSTRAINT ck_payment_amounts CHECK (amount >= 0 AND "refundedAmount" >= 0 AND "refundedAmount" <= amount), ADD CONSTRAINT ck_payment_currency_vnd CHECK (currency = 'VND');
ALTER TABLE refund ADD CONSTRAINT ck_refund_amount_positive CHECK (amount > 0), ADD CONSTRAINT ck_refund_currency_vnd CHECK (currency = 'VND');
ALTER TABLE wallet_ledger ADD CONSTRAINT ck_wallet_balance_nonnegative CHECK ("balanceBefore" >= 0 AND "balanceAfter" >= 0), ADD CONSTRAINT ck_wallet_currency_vnd CHECK (currency = 'VND'), ADD CONSTRAINT ck_wallet_ledger_equation CHECK ("balanceAfter" = "balanceBefore" + amount);


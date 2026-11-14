-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "changedAt" TIMESTAMP(3),
ADD COLUMN     "departureNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ticketIds" JSONB NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "gatewayRefundNo" TEXT,
    "operatorId" TEXT,
    "operatorType" TEXT NOT NULL DEFAULT 'USER',
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_changes" (
    "id" TEXT NOT NULL,
    "changeNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "oldTripId" TEXT NOT NULL,
    "newTripId" TEXT NOT NULL,
    "oldTicketIds" JSONB NOT NULL,
    "newTicketIds" JSONB NOT NULL,
    "priceDiffCents" INTEGER NOT NULL DEFAULT 0,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "operatorType" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundNo_key" ON "refunds"("refundNo");

-- CreateIndex
CREATE INDEX "refunds_orderId_idx" ON "refunds"("orderId");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "order_changes_changeNo_key" ON "order_changes"("changeNo");

-- CreateIndex
CREATE INDEX "order_changes_orderId_idx" ON "order_changes"("orderId");

-- CreateIndex
CREATE INDEX "order_changes_newTripId_idx" ON "order_changes"("newTripId");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_old_trip_id_fkey" FOREIGN KEY ("oldTripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_new_trip_id_fkey" FOREIGN KEY ("newTripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

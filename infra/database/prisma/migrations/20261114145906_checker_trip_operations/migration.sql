-- CreateTable
CREATE TABLE "trip_operations" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "checkerId" TEXT,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_operations_tripId_createdAt_idx" ON "trip_operations"("tripId", "createdAt");

-- AddForeignKey
ALTER TABLE "trip_operations" ADD CONSTRAINT "trip_operations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_operations" ADD CONSTRAINT "trip_operations_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "checkers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `changedAt` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the `order_changes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_changes" DROP CONSTRAINT "order_changes_new_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "order_changes" DROP CONSTRAINT "order_changes_old_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "order_changes" DROP CONSTRAINT "order_changes_orderId_fkey";

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "changedAt";

-- DropTable
DROP TABLE "order_changes";

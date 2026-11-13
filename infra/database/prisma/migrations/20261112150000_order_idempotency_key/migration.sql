-- Idempotency-Key 幂等下单：同一幂等键只允许一个订单（P0 方案 5.2）
ALTER TABLE "orders" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

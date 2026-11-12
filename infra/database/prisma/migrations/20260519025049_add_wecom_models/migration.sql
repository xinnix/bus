-- CreateTable
CREATE TABLE "wecom_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "corpId" TEXT NOT NULL,
    "agentId" INTEGER NOT NULL,
    "secret" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "encodingAESKey" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wecom_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wecom_messages" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "msgType" TEXT NOT NULL,
    "fromUser" TEXT,
    "toUser" TEXT,
    "content" TEXT,
    "rawXml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wecom_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wecom_events" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventKey" TEXT,
    "fromUser" TEXT,
    "content" TEXT,
    "rawXml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wecom_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wecom_configs_corpId_idx" ON "wecom_configs"("corpId");

-- CreateIndex
CREATE INDEX "wecom_configs_isActive_idx" ON "wecom_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "wecom_configs_corpId_agentId_key" ON "wecom_configs"("corpId", "agentId");

-- CreateIndex
CREATE INDEX "wecom_messages_configId_idx" ON "wecom_messages"("configId");

-- CreateIndex
CREATE INDEX "wecom_messages_createdAt_idx" ON "wecom_messages"("createdAt");

-- CreateIndex
CREATE INDEX "wecom_events_configId_idx" ON "wecom_events"("configId");

-- CreateIndex
CREATE INDEX "wecom_events_eventType_idx" ON "wecom_events"("eventType");

-- CreateIndex
CREATE INDEX "wecom_events_createdAt_idx" ON "wecom_events"("createdAt");

-- AddForeignKey
ALTER TABLE "wecom_configs" ADD CONSTRAINT "wecom_configs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wecom_configs" ADD CONSTRAINT "wecom_configs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wecom_messages" ADD CONSTRAINT "wecom_messages_configId_fkey" FOREIGN KEY ("configId") REFERENCES "wecom_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wecom_events" ADD CONSTRAINT "wecom_events_configId_fkey" FOREIGN KEY ("configId") REFERENCES "wecom_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

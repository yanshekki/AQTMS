-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `walletAddress` VARCHAR(191) NOT NULL,
    `nonce` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'VIEWER',
    `permissions` VARCHAR(191) NOT NULL DEFAULT '[]',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_walletAddress_key`(`walletAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExchangeAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exchange` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `apiKey` VARCHAR(191) NOT NULL,
    `apiSecret` VARCHAR(191) NOT NULL,
    `testnet` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DISCONNECTED',
    `testPassed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExchangeAccount_userId_idx`(`userId`),
    UNIQUE INDEX `ExchangeAccount_userId_exchange_name_key`(`userId`, `exchange`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trade` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exchangeAccountId` VARCHAR(191) NOT NULL,
    `exchangeOrderId` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `side` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `quantity` DOUBLE NOT NULL,
    `price` DOUBLE NULL,
    `stopPrice` DOUBLE NULL,
    `timeInForce` VARCHAR(191) NOT NULL DEFAULT 'GTC',
    `filledQuantity` DOUBLE NOT NULL DEFAULT 0,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Trade_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Trade_userId_idx`(`userId`),
    INDEX `Trade_exchangeAccountId_idx`(`exchangeAccountId`),
    INDEX `Trade_symbol_idx`(`symbol`),
    INDEX `Trade_status_idx`(`status`),
    INDEX `Trade_idempotencyKey_idx`(`idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `details` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewsEvent` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `channelName` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `url` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `isProcessed` BOOLEAN NOT NULL DEFAULT false,
    `isFake` BOOLEAN NULL,
    `truthScore` DOUBLE NULL,
    `sentimentScore` DOUBLE NULL,
    `relevanceScore` DOUBLE NULL,
    `compositeScore` DOUBLE NULL,
    `aiAnalysis` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    INDEX `NewsEvent_compositeScore_idx`(`compositeScore`),
    INDEX `NewsEvent_isProcessed_idx`(`isProcessed`),
    INDEX `NewsEvent_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `NewsEvent_source_sourceId_key`(`source`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExchangeAccount` ADD CONSTRAINT `ExchangeAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_exchangeAccountId_fkey` FOREIGN KEY (`exchangeAccountId`) REFERENCES `ExchangeAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

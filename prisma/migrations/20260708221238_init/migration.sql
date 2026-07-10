-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'MONITEUR', 'JUGE') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `invitationToken` VARCHAR(191) NULL,
    `invitationExpiresAt` DATETIME(3) NULL,
    `clubId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_invitationToken_key`(`invitationToken`),
    INDEX `User_clubId_idx`(`clubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Club` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Club_name_key`(`name`),
    UNIQUE INDEX `Club_externalId_key`(`externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gymnast` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `birthYear` INTEGER NULL,
    `externalId` VARCHAR(191) NULL,
    `clubId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Gymnast_externalId_key`(`externalId`),
    INDEX `Gymnast_clubId_idx`(`clubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Category_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Apparatus` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `allowsTwoVideos` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Apparatus_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Competition` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `scoringMethod` ENUM('AVERAGE', 'TRIMMED_AVERAGE') NOT NULL DEFAULT 'AVERAGE',
    `judgesPerApparatus` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Competition_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompetitionCategory` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CompetitionCategory_competitionId_categoryId_key`(`competitionId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompetitionRound` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `uploadStart` DATETIME(3) NOT NULL,
    `uploadEnd` DATETIME(3) NOT NULL,
    `judgingEnd` DATETIME(3) NOT NULL,
    `publicationAt` DATETIME(3) NOT NULL,
    `validatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CompetitionRound_competitionId_number_key`(`competitionId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompetitionApparatus` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `apparatusId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `roundId` VARCHAR(191) NULL,

    INDEX `CompetitionApparatus_roundId_idx`(`roundId`),
    UNIQUE INDEX `CompetitionApparatus_competitionId_apparatusId_key`(`competitionId`, `apparatusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Registration` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `gymnastId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `competitionCategoryId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Registration_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `Registration_competitionId_gymnastId_key`(`competitionId`, `gymnastId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Performance` (
    `id` VARCHAR(191) NOT NULL,
    `registrationId` VARCHAR(191) NOT NULL,
    `competitionApparatusId` VARCHAR(191) NOT NULL,
    `videoUrl` VARCHAR(191) NULL,
    `videoUrl2` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `status` ENUM('MISSING', 'SUBMITTED', 'JUDGING', 'JUDGED') NOT NULL DEFAULT 'MISSING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Performance_registrationId_competitionApparatusId_key`(`registrationId`, `competitionApparatusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JudgeAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `judgeId` VARCHAR(191) NOT NULL,
    `apparatusId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JudgeAssignment_judgeId_idx`(`judgeId`),
    UNIQUE INDEX `JudgeAssignment_competitionId_judgeId_apparatusId_key`(`competitionId`, `judgeId`, `apparatusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Score` (
    `id` VARCHAR(191) NOT NULL,
    `performanceId` VARCHAR(191) NOT NULL,
    `judgeId` VARCHAR(191) NOT NULL,
    `value` DECIMAL(4, 2) NOT NULL,
    `entryMode` ENUM('DIRECT', 'DEDUCTIONS') NOT NULL DEFAULT 'DEDUCTIONS',
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Score_judgeId_idx`(`judgeId`),
    UNIQUE INDEX `Score_performanceId_judgeId_key`(`performanceId`, `judgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeductionType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `value` DECIMAL(3, 1) NOT NULL,
    `maxValue` DECIMAL(3, 1) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeductionTypeApparatus` (
    `deductionTypeId` VARCHAR(191) NOT NULL,
    `apparatusId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`deductionTypeId`, `apparatusId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScoreDeduction` (
    `id` VARCHAR(191) NOT NULL,
    `scoreId` VARCHAR(191) NOT NULL,
    `deductionTypeId` VARCHAR(191) NULL,
    `value` DECIMAL(3, 1) NOT NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ScoreDeduction_scoreId_idx`(`scoreId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResultPublication` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NULL,
    `validatedById` VARCHAR(191) NOT NULL,
    `validatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ResultPublication_competitionId_idx`(`competitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Gymnast` ADD CONSTRAINT `Gymnast_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetitionCategory` ADD CONSTRAINT `CompetitionCategory_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetitionCategory` ADD CONSTRAINT `CompetitionCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetitionRound` ADD CONSTRAINT `CompetitionRound_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetitionApparatus` ADD CONSTRAINT `CompetitionApparatus_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetitionApparatus` ADD CONSTRAINT `CompetitionApparatus_apparatusId_fkey` FOREIGN KEY (`apparatusId`) REFERENCES `Apparatus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetitionApparatus` ADD CONSTRAINT `CompetitionApparatus_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `CompetitionRound`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_gymnastId_fkey` FOREIGN KEY (`gymnastId`) REFERENCES `Gymnast`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_competitionCategoryId_fkey` FOREIGN KEY (`competitionCategoryId`) REFERENCES `CompetitionCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Performance` ADD CONSTRAINT `Performance_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Performance` ADD CONSTRAINT `Performance_competitionApparatusId_fkey` FOREIGN KEY (`competitionApparatusId`) REFERENCES `CompetitionApparatus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JudgeAssignment` ADD CONSTRAINT `JudgeAssignment_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JudgeAssignment` ADD CONSTRAINT `JudgeAssignment_judgeId_fkey` FOREIGN KEY (`judgeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JudgeAssignment` ADD CONSTRAINT `JudgeAssignment_apparatusId_fkey` FOREIGN KEY (`apparatusId`) REFERENCES `Apparatus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Score` ADD CONSTRAINT `Score_performanceId_fkey` FOREIGN KEY (`performanceId`) REFERENCES `Performance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Score` ADD CONSTRAINT `Score_judgeId_fkey` FOREIGN KEY (`judgeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeductionTypeApparatus` ADD CONSTRAINT `DeductionTypeApparatus_deductionTypeId_fkey` FOREIGN KEY (`deductionTypeId`) REFERENCES `DeductionType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeductionTypeApparatus` ADD CONSTRAINT `DeductionTypeApparatus_apparatusId_fkey` FOREIGN KEY (`apparatusId`) REFERENCES `Apparatus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScoreDeduction` ADD CONSTRAINT `ScoreDeduction_scoreId_fkey` FOREIGN KEY (`scoreId`) REFERENCES `Score`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScoreDeduction` ADD CONSTRAINT `ScoreDeduction_deductionTypeId_fkey` FOREIGN KEY (`deductionTypeId`) REFERENCES `DeductionType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResultPublication` ADD CONSTRAINT `ResultPublication_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResultPublication` ADD CONSTRAINT `ResultPublication_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `CompetitionRound`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResultPublication` ADD CONSTRAINT `ResultPublication_validatedById_fkey` FOREIGN KEY (`validatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE `Score` DROP FOREIGN KEY `Score_performanceId_fkey`;

-- DropIndex
DROP INDEX `Score_performanceId_judgeId_key` ON `Score`;

-- AlterTable
ALTER TABLE `Apparatus` DROP COLUMN `allowsTwoVideos`,
    ADD COLUMN `twoAttempts` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Score` ADD COLUMN `attempt` INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX `Score_performanceId_judgeId_attempt_key` ON `Score`(`performanceId`, `judgeId`, `attempt`);

-- AddForeignKey (recréée : la suppression de l'index unique portait cette FK)
ALTER TABLE `Score` ADD CONSTRAINT `Score_performanceId_fkey` FOREIGN KEY (`performanceId`) REFERENCES `Performance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE `Gymnast` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Gymnast` ADD CONSTRAINT `Gymnast_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


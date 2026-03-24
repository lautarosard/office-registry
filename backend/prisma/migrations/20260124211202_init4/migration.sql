/*
  Warnings:

  - You are about to drop the column `mustChanguePassword` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "mustChanguePassword",
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

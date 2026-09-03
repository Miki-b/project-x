-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'TASK_NOTIFICATION';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pendingBlockReason" TEXT;

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('COLD', 'WARM', 'HOT');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "next_follow_up" TIMESTAMP(3),
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'COLD';

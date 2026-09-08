-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('CUSTOMER_PORTAL', 'ADMIN_PHONE', 'ADMIN_MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "contact_name_snapshot" TEXT,
ADD COLUMN     "contact_phone_snapshot" TEXT,
ADD COLUMN     "last_change_reason" TEXT,
ADD COLUMN     "responsible_user_id" UUID,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'CUSTOMER_PORTAL',
ADD COLUMN     "updated_by_user_id" UUID;

-- CreateTable
CREATE TABLE "booking_revisions" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "changed_fields" JSONB NOT NULL,
    "before_json" JSONB NOT NULL,
    "after_json" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_tasks" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "parent_task_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assignee_user_id" UUID,
    "due_at" TIMESTAMP(3),
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_activities" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_revisions_booking_id_occurred_at_idx" ON "booking_revisions"("booking_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_revisions_booking_id_version_key" ON "booking_revisions"("booking_id", "version");

-- CreateIndex
CREATE INDEX "operation_tasks_booking_id_status_idx" ON "operation_tasks"("booking_id", "status");

-- CreateIndex
CREATE INDEX "operation_tasks_assignee_user_id_status_due_at_idx" ON "operation_tasks"("assignee_user_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "task_activities_task_id_occurred_at_idx" ON "task_activities"("task_id", "occurred_at");

-- CreateIndex
CREATE INDEX "bookings_responsible_user_id_updated_at_idx" ON "bookings"("responsible_user_id", "updated_at");

-- CreateIndex
CREATE INDEX "bookings_source_created_at_idx" ON "bookings"("source", "created_at");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_revisions" ADD CONSTRAINT "booking_revisions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "operation_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

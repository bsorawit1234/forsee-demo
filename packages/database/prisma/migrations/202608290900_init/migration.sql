-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('OPERATOR', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "JobStage" AS ENUM ('SCHEDULED', 'EN_ROUTE', 'ARRIVED', 'IN_SERVICE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SlaHealth" AS ENUM ('ON_TRACK', 'AT_RISK', 'OVERDUE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sites" (
    "id" UUID NOT NULL,
    "customer_organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "district" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "zone_code" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "access_instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "capacity_unit" TEXT NOT NULL,
    "default_capacity" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "description_th" TEXT,
    "default_duration_minutes" INTEGER NOT NULL,
    "required_vehicle_type_id" UUID NOT NULL,
    "minimum_capacity" DECIMAL(10,2),
    "maximum_capacity" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_rules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "service_type_id" UUID,
    "vehicle_type_id" UUID,
    "day_of_week" INTEGER,
    "start_time" TEXT,
    "end_time" TEXT,
    "max_concurrent" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "registration_number" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "vehicle_type_id" UUID NOT NULL,
    "capacity" DECIMAL(10,2),
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenance" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_by_user_id" UUID NOT NULL,

    CONSTRAINT "vehicle_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "booking_number" TEXT NOT NULL,
    "customer_organization_id" UUID NOT NULL,
    "customer_site_id" UUID NOT NULL,
    "service_type_id" UUID NOT NULL,
    "requested_start_at" TIMESTAMP(3) NOT NULL,
    "requested_end_at" TIMESTAMP(3) NOT NULL,
    "confirmed_start_at" TIMESTAMP(3),
    "confirmed_end_at" TIMESTAMP(3),
    "estimated_volume" DECIMAL(10,2),
    "volume_unit" TEXT,
    "booking_status" "BookingStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "assignment_status" "AssignmentStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "job_stage" "JobStage" NOT NULL DEFAULT 'SCHEDULED',
    "sla_health" "SlaHealth" NOT NULL DEFAULT 'ON_TRACK',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "customer_note" TEXT,
    "internal_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" UUID NOT NULL,
    "confirmed_by_user_id" UUID,
    "cancelled_by_user_id" UUID,
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_assignments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "driver_user_id" UUID,
    "assigned_by_user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,

    CONSTRAINT "booking_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "status_type" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "note" TEXT,
    "metadata_json" JSONB,

    CONSTRAINT "job_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "job_event_id" UUID,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "organization_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "request_id" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_history" (
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_history_pkey" PRIMARY KEY ("version")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "organization_memberships_user_id_idx" ON "organization_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organization_id_user_id_key" ON "organization_memberships"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "customer_sites_customer_organization_id_is_active_idx" ON "customer_sites"("customer_organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_code_key" ON "vehicle_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_code_key" ON "service_types"("code");

-- CreateIndex
CREATE INDEX "service_types_required_vehicle_type_id_is_active_idx" ON "service_types"("required_vehicle_type_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_rules_code_key" ON "capacity_rules"("code");

-- CreateIndex
CREATE INDEX "capacity_rules_service_type_id_vehicle_type_id_day_of_week__idx" ON "capacity_rules"("service_type_id", "vehicle_type_id", "day_of_week", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "vehicles_vehicle_type_id_status_idx" ON "vehicles"("vehicle_type_id", "status");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_vehicle_id_starts_at_ends_at_idx" ON "vehicle_maintenance"("vehicle_id", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings"("booking_number");

-- CreateIndex
CREATE INDEX "bookings_customer_organization_id_created_at_idx" ON "bookings"("customer_organization_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_requested_start_at_requested_end_at_idx" ON "bookings"("requested_start_at", "requested_end_at");

-- CreateIndex
CREATE INDEX "bookings_booking_status_assignment_status_job_stage_idx" ON "bookings"("booking_status", "assignment_status", "job_stage");

-- CreateIndex
CREATE INDEX "bookings_sla_health_idx" ON "bookings"("sla_health");

-- CreateIndex
CREATE INDEX "booking_assignments_booking_id_is_current_idx" ON "booking_assignments"("booking_id", "is_current");

-- CreateIndex
CREATE INDEX "booking_assignments_vehicle_id_assigned_at_idx" ON "booking_assignments"("vehicle_id", "assigned_at");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_occurred_at_idx" ON "booking_status_history"("booking_id", "occurred_at");

-- CreateIndex
CREATE INDEX "job_events_booking_id_occurred_at_idx" ON "job_events"("booking_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attachments_booking_id_created_at_idx" ON "attachments"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_customer_organization_id_fkey" FOREIGN KEY ("customer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_required_vehicle_type_id_fkey" FOREIGN KEY ("required_vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_rules" ADD CONSTRAINT "capacity_rules_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_rules" ADD CONSTRAINT "capacity_rules_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_organization_id_fkey" FOREIGN KEY ("customer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_site_id_fkey" FOREIGN KEY ("customer_site_id") REFERENCES "customer_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


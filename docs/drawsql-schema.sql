-- ============================================================
-- Field Service System - PostgreSQL schema
-- Import in DrawSQL: Upload -> SQL -> PostgreSQL -> this file
-- ============================================================

-- ========================== ENUMS ==========================

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'TECHNICIAN', 'CUSTOMER');

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "TechnicianStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

CREATE TYPE "TechnicianApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TYPE "WorkOrderStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'DOCUMENT', 'OTHER');

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'BKASH', 'NAGAD', 'OTHER');

CREATE TYPE "ItemCategory" AS ENUM ('MATERIAL', 'LABOR', 'TRANSPORT', 'OTHER');

-- ========================== TABLES ==========================

CREATE TABLE "users" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    "email" text,
    "phone" text NOT NULL,
    "passwordHash" text,
    "role" "UserRole" DEFAULT 'CUSTOMER',
    "status" "UserStatus" DEFAULT 'ACTIVE',
    "avatarUrl" text,
    "lastLoginAt" timestamp(3),
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_phone_key" UNIQUE ("phone")
);

CREATE TABLE "Customer" (
    "id" text NOT NULL,
    "userId" text NOT NULL,
    "address" text NOT NULL,
    "city" text,
    "district" text,
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Customer_userId_key" UNIQUE ("userId"),
    CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Service" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "price" numeric(10,2) NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceRequest" (
    "id" text NOT NULL,
    "requestNumber" text NOT NULL,
    "customerId" text NOT NULL,
    "serviceId" text NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "status" "ServiceRequestStatus" DEFAULT 'PENDING',
    "preferredDate" timestamp(3),
    "address" text NOT NULL,
    "city" text,
    "district" text,
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    "deletedAt" timestamp(3),
    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceRequest_requestNumber_key" UNIQUE ("requestNumber"),
    CONSTRAINT "ServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON UPDATE CASCADE
);

CREATE TABLE "Technician" (
    "id" text NOT NULL,
    "userId" text NOT NULL,
    "employeeId" text,
    "status" "TechnicianStatus" DEFAULT 'AVAILABLE',
    "applicationStatus" "TechnicianApplicationStatus" DEFAULT 'PENDING',
    "skills" text,
    "bio" text,
    "rejectedReason" text,
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Technician_userId_key" UNIQUE ("userId"),
    CONSTRAINT "Technician_employeeId_key" UNIQUE ("employeeId"),
    CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkOrder" (
    "id" text NOT NULL,
    "workOrderNumber" text NOT NULL,
    "requestId" text NOT NULL,
    "customerId" text NOT NULL,
    "technicianId" text,
    "title" text NOT NULL,
    "description" text,
    "status" "WorkOrderStatus" DEFAULT 'CREATED',
    "estimatedCost" numeric(10,2),
    "actualCost" numeric(10,2),
    "startedAt" timestamp(3),
    "completedAt" timestamp(3),
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkOrder_workOrderNumber_key" UNIQUE ("workOrderNumber"),
    CONSTRAINT "WorkOrder_requestId_key" UNIQUE ("requestId"),
    CONSTRAINT "WorkOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "TechnicianAssignment" (
    "id" text NOT NULL,
    "workOrderId" text NOT NULL,
    "technicianId" text NOT NULL,
    "assignedById" text,
    "status" "AssignmentStatus" DEFAULT 'PENDING',
    "assignedAt" timestamp(3) DEFAULT now(),
    "respondedAt" timestamp(3),
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "TechnicianAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TechnicianAssignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TechnicianAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TechnicianAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ServiceVisit" (
    "id" text NOT NULL,
    "workOrderId" text NOT NULL,
    "technicianId" text NOT NULL,
    "scheduledStart" timestamp(3) NOT NULL,
    "scheduledEnd" timestamp(3),
    "actualStart" timestamp(3),
    "actualEnd" timestamp(3),
    "status" "VisitStatus" DEFAULT 'SCHEDULED',
    "notes" text,
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "ServiceVisit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceVisit_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceVisit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ServiceReport" (
    "id" text NOT NULL,
    "workOrderId" text NOT NULL,
    "technicianId" text NOT NULL,
    "diagnosis" text,
    "workPerformed" text,
    "notes" text,
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceReport_workOrderId_key" UNIQUE ("workOrderId"),
    CONSTRAINT "ServiceReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReport_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON UPDATE CASCADE
);

CREATE TABLE "Feedback" (
    "id" text NOT NULL,
    "workOrderId" text NOT NULL,
    "customerId" text NOT NULL,
    "technicianId" text,
    "rating" integer NOT NULL,
    "comment" text,
    "createdAt" timestamp(3) DEFAULT now(),
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Feedback_workOrderId_key" UNIQUE ("workOrderId"),
    CONSTRAINT "Feedback_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Invoice" (
    "id" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "workOrderId" text NOT NULL,
    "customerId" text NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "InvoiceStatus" DEFAULT 'DRAFT',
    "issuedAt" timestamp(3),
    "dueDate" timestamp(3),
    "createdAt" timestamp(3) DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Invoice_invoiceNumber_key" UNIQUE ("invoiceNumber"),
    CONSTRAINT "Invoice_workOrderId_key" UNIQUE ("workOrderId"),
    CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON UPDATE CASCADE
);

CREATE TABLE "InvoiceItem" (
    "id" text NOT NULL,
    "invoiceId" text NOT NULL,
    "title" text NOT NULL,
    "category" "ItemCategory" DEFAULT 'OTHER',
    "amount" numeric(10,2) NOT NULL,
    "addedById" text,
    "createdAt" timestamp(3) DEFAULT now(),
    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Payment" (
    "id" text NOT NULL,
    "invoiceId" text NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" DEFAULT 'PENDING',
    "transactionId" text,
    "merchantInvoiceNumber" text,
    "gatewayPaymentId" text,
    "gatewayResponse" jsonb,
    "paidAt" timestamp(3),
    "createdAt" timestamp(3) DEFAULT now(),
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_transactionId_key" UNIQUE ("transactionId"),
    CONSTRAINT "Payment_merchantInvoiceNumber_key" UNIQUE ("merchantInvoiceNumber"),
    CONSTRAINT "Payment_gatewayPaymentId_key" UNIQUE ("gatewayPaymentId"),
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Attachment" (
    "id" text NOT NULL,
    "requestId" text,
    "workOrderId" text,
    "type" "AttachmentType" NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "createdAt" timestamp(3) DEFAULT now(),
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
    "id" text NOT NULL,
    "actorId" text,
    "action" text NOT NULL,
    "entity" text NOT NULL,
    "entityId" text,
    "changes" jsonb,
    "createdAt" timestamp(3) DEFAULT now(),
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ========================== INDEXES ==========================

CREATE INDEX "Attachment_requestId_idx" ON "Attachment" ("requestId");
CREATE INDEX "Attachment_workOrderId_idx" ON "Attachment" ("workOrderId");

CREATE INDEX "Feedback_customerId_idx" ON "Feedback" ("customerId");
CREATE INDEX "Feedback_technicianId_idx" ON "Feedback" ("technicianId");

CREATE INDEX "Invoice_customerId_idx" ON "Invoice" ("customerId");
CREATE INDEX "Invoice_status_idx" ON "Invoice" ("status");

CREATE INDEX "Payment_invoiceId_idx" ON "Payment" ("invoiceId");
CREATE INDEX "Payment_status_idx" ON "Payment" ("status");

CREATE INDEX "ServiceRequest_customerId_idx" ON "ServiceRequest" ("customerId");
CREATE INDEX "ServiceRequest_serviceId_idx" ON "ServiceRequest" ("serviceId");
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest" ("status");

CREATE INDEX "ServiceVisit_workOrderId_idx" ON "ServiceVisit" ("workOrderId");
CREATE INDEX "ServiceVisit_technicianId_idx" ON "ServiceVisit" ("technicianId");

CREATE INDEX "Technician_applicationStatus_idx" ON "Technician" ("applicationStatus");

CREATE INDEX "TechnicianAssignment_workOrderId_idx" ON "TechnicianAssignment" ("workOrderId");
CREATE INDEX "TechnicianAssignment_technicianId_idx" ON "TechnicianAssignment" ("technicianId");

CREATE INDEX "users_role_idx" ON "users" ("role");
CREATE INDEX "users_status_idx" ON "users" ("status");
CREATE INDEX "users_phone_idx" ON "users" ("phone");

CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder" ("customerId");
CREATE INDEX "WorkOrder_technicianId_idx" ON "WorkOrder" ("technicianId");
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder" ("status");

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog" ("actorId");
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog" ("entity");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");

CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem" ("invoiceId");
CREATE INDEX "InvoiceItem_addedById_idx" ON "InvoiceItem" ("addedById");
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'TECHNICIAN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TechnicianStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "TechnicianApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'BKASH', 'NAGAD', 'OTHER');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "workOrderId" TEXT,
    "type" "AttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "merchantInvoiceNumber" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewayResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReport" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "diagnosis" TEXT,
    "workPerformed" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "preferredDate" TIMESTAMP(3),
    "address" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceVisit" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "status" "TechnicianStatus" NOT NULL DEFAULT 'AVAILABLE',
    "applicationStatus" "TechnicianApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "skills" TEXT,
    "bio" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianAssignment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "assignedById" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'CREATED',
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_requestId_idx" ON "Attachment"("requestId");

-- CreateIndex
CREATE INDEX "Attachment_workOrderId_idx" ON "Attachment"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_workOrderId_key" ON "Feedback"("workOrderId");

-- CreateIndex
CREATE INDEX "Feedback_customerId_idx" ON "Feedback"("customerId");

-- CreateIndex
CREATE INDEX "Feedback_technicianId_idx" ON "Feedback"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_workOrderId_key" ON "Invoice"("workOrderId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_merchantInvoiceNumber_key" ON "Payment"("merchantInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key" ON "Payment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReport_workOrderId_key" ON "ServiceReport"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_requestNumber_key" ON "ServiceRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerId_idx" ON "ServiceRequest"("customerId");

-- CreateIndex
CREATE INDEX "ServiceRequest_serviceId_idx" ON "ServiceRequest"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");

-- CreateIndex
CREATE INDEX "ServiceVisit_workOrderId_idx" ON "ServiceVisit"("workOrderId");

-- CreateIndex
CREATE INDEX "ServiceVisit_technicianId_idx" ON "ServiceVisit"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_userId_key" ON "Technician"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_employeeId_key" ON "Technician"("employeeId");

-- CreateIndex
CREATE INDEX "Technician_applicationStatus_idx" ON "Technician"("applicationStatus");

-- CreateIndex
CREATE INDEX "TechnicianAssignment_workOrderId_idx" ON "TechnicianAssignment"("workOrderId");

-- CreateIndex
CREATE INDEX "TechnicianAssignment_technicianId_idx" ON "TechnicianAssignment"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_workOrderNumber_key" ON "WorkOrder"("workOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_requestId_key" ON "WorkOrder"("requestId");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_technicianId_idx" ON "WorkOrder"("technicianId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAssignment" ADD CONSTRAINT "TechnicianAssignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAssignment" ADD CONSTRAINT "TechnicianAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAssignment" ADD CONSTRAINT "TechnicianAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

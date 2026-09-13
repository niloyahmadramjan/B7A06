# Field Service Management System
## Project Requirements & Flow

## 1. Project Overview

The **Field Service Management System** is a web-based system for managing service requests from customers, assigning technicians, tracking field work, generating service reports, handling invoices/payments, and collecting customer feedback.

The goal is to keep the system simple and easy to maintain while covering the complete service operation flow.

---

# 2. User Roles

The system has four main roles:

### ADMIN
- Manage users
- Manage services
- Manage technicians
- View all service requests
- View all work orders
- Manage invoices and payments
- View reports/dashboard

### MANAGER
- View customer service requests
- Approve or reject service requests
- Create/manage work orders
- Assign technicians
- Schedule service visits
- Monitor work progress
- Review service reports

### TECHNICIAN
- View assigned work orders
- Accept or reject assignments
- View scheduled visits
- Start service work
- Complete service work
- Submit service reports
- Upload service-related files/photos

### CUSTOMER
- Register/login
- View available services
- Create service requests
- View request status
- View work order status
- View technician/service visit information
- View invoice
- Make payment
- Submit feedback

---

# 3. Main Project Flow

The complete system flow is:

```text
Customer
   |
   | 1. Select Service
   v
Service Request
   |
   | 2. Manager reviews request
   |
   +---- Rejected ----> Request Closed
   |
   v
Approved
   |
   | 3. Create Work Order
   v
Work Order
   |
   | 4. Assign Technician
   v
Technician Assignment
   |
   | 5. Technician accepts
   v
Scheduled Visit
   |
   | 6. Technician visits customer
   v
In Progress
   |
   | 7. Technician completes work
   v
Completed
   |
   +----> Service Report
   |
   +----> Invoice
              |
              | 8. Customer pays
              v
           Payment
              |
              | 9. Customer gives rating
              v
           Feedback
```

---

# 4. Customer Flow

## Step 1: Registration/Login

Customer creates an account using:

- Name
- Email
- Phone
- Password

After registration, a Customer profile is created.

---

## Step 2: Browse Services

Customer can see available services.

Example:

```text
AC Repair
Price: 1500 BDT

Electrical Repair
Price: 1000 BDT

Plumbing
Price: 1200 BDT
```

Customer selects a service.

---

## Step 3: Create Service Request

Customer submits:

- Service
- Title
- Description
- Preferred date
- Address
- City
- District

Initial status:

```text
PENDING
```

---

# 5. Manager Flow

Manager can see all pending service requests.

Example:

```text
Request #REQ-1001

Customer: Rahim
Service: AC Repair
Date: 15 September
Location: Dhaka

Status: PENDING
```

Manager has two options:

### Approve

```text
PENDING → APPROVED
```

Then a Work Order is created.

### Reject

```text
PENDING → REJECTED
```

The request is closed.

---

# 6. Work Order Flow

After approval, the system creates a Work Order.

Example:

```text
Work Order: WO-1001

Customer: Rahim
Service: AC Repair
Estimated Cost: 1500 BDT
Status: CREATED
```

Work Order status:

```text
CREATED
   ↓
ASSIGNED
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

If necessary:

```text
CREATED / ASSIGNED / IN_PROGRESS
                ↓
            CANCELLED
```

---

# 7. Technician Assignment

Manager selects a technician for the work order.

Example:

```text
Work Order: WO-1001

Technician:
Karim

Assignment Status:
PENDING
```

Technician can:

```text
ACCEPTED
REJECTED
```

If accepted:

```text
Work Order
    ↓
ASSIGNED
```

If rejected, manager can assign another technician.

---

# 8. Service Visit

After technician assignment, a service visit is scheduled.

Example:

```text
Technician: Karim

Date: 15 September
Start: 10:00 AM
End: 12:00 PM

Status: SCHEDULED
```

Visit flow:

```text
SCHEDULED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

A visit can also be cancelled.

---

# 9. Technician Work Flow

Technician dashboard should show:

```text
My Assignments
My Work Orders
Upcoming Visits
Completed Jobs
```

For each work order the technician can:

- View customer information
- View service information
- View address
- View scheduled visit
- Start work
- Complete work
- Submit service report
- Upload images/documents

When work starts:

```text
ASSIGNED → IN_PROGRESS
```

When work finishes:

```text
IN_PROGRESS → COMPLETED
```

---

# 10. Service Report

After completing the work, technician submits a report.

Report fields:

- Diagnosis
- Work performed
- Notes

Example:

```text
Diagnosis:
AC compressor problem.

Work Performed:
Compressor checked and repaired.

Notes:
Customer should service the AC every 6 months.
```

---

# 11. Invoice Flow

After work completion, an invoice can be created.

Example:

```text
Invoice: INV-1001

Customer: Rahim
Work Order: WO-1001

Amount: 1500 BDT

Status: ISSUED
```

Invoice statuses:

```text
DRAFT
  ↓
ISSUED
  ↓
PAID
```

It can also be:

```text
ISSUED → CANCELLED
```

---

# 12. Payment Flow

Customer can pay an invoice.

Payment information:

- Invoice
- Amount
- Payment method
- Transaction ID
- Payment status

Supported payment methods:

```text
CASH
CARD
BANK_TRANSFER
BKASH
NAGAD
OTHER
```

Payment status:

```text
PENDING
SUCCESS
FAILED
```

After successful payment:

```text
Invoice → PAID
Payment → SUCCESS
```

---

# 13. Customer Feedback

After a work order is completed, customer can submit feedback.

Example:

```text
Rating: 5

Comment:
Technician was very professional and solved the problem quickly.
```

Rating:

```text
1 - Very Bad
2 - Bad
3 - Average
4 - Good
5 - Excellent
```

One work order can have one feedback.

---

# 14. Attachment/File Upload

Customers and technicians can upload files related to a request or work order.

Supported types:

```text
IMAGE
DOCUMENT
OTHER
```

Examples:

- Problem photo
- Before/after photo
- Service document
- Technician report attachment

The database stores:

```text
fileName
fileUrl
type
```

Actual files should be stored in a file-storage service/server, not directly inside PostgreSQL.

---

# 15. Database Relationship

The simplified database relationship is:

```text
User
 ├── Customer
 │      |
 │      ├── ServiceRequest
 │      │       |
 │      │       └── WorkOrder
 │      │              |
 │      │              ├── TechnicianAssignment
 │      │              ├── ServiceVisit
 │      │              ├── ServiceReport
 │      │              ├── Attachment
 │      │              ├── Invoice
 │      │              │      └── Payment
 │      │              └── Feedback
 │      |
 │      └── Invoice
 │
 └── Technician
        |
        ├── TechnicianAssignment
        ├── WorkOrder
        ├── ServiceVisit
        ├── ServiceReport
        └── Feedback

Service
   |
   └── ServiceRequest
```

---

# 16. Database Models

The project uses these main models:

| Model | Purpose |
|---|---|
| User | Authentication and user roles |
| Customer | Customer information |
| Technician | Technician information |
| Service | Available services |
| ServiceRequest | Customer service requests |
| WorkOrder | Approved service jobs |
| TechnicianAssignment | Technician assignment |
| ServiceVisit | Scheduled field visits |
| Attachment | Uploaded files |
| ServiceReport | Technician work report |
| Invoice | Customer billing |
| Payment | Invoice payments |
| Feedback | Customer rating/review |

---

# 17. API Flow

The backend can be organized into simple modules.

```text
/api
  /auth
  /users
  /customers
  /technicians
  /services
  /service-requests
  /work-orders
  /assignments
  /visits
  /reports
  /attachments
  /invoices
  /payments
  /feedback
```

---

# 18. Authentication

Authentication should be kept simple.

Basic flow:

```text
Register
   ↓
Login
   ↓
Access Token
   ↓
Authenticated API
```

Every protected API checks:

1. Is the user authenticated?
2. What is the user's role?
3. Does the user have permission for this action?

Example:

```text
CUSTOMER
→ Create Service Request

MANAGER
→ Approve Request
→ Assign Technician

TECHNICIAN
→ Update Assigned Work Order
→ Submit Report

ADMIN
→ Manage Everything
```

---

# 19. Recommended Backend Structure

For a Node.js + Express + TypeScript backend:

```text
src/
│
├── config/
│
├── middleware/
│   ├── auth.ts
│   └── role.ts
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── customers/
│   ├── technicians/
│   ├── services/
│   ├── service-requests/
│   ├── work-orders/
│   ├── assignments/
│   ├── visits/
│   ├── reports/
│   ├── attachments/
│   ├── invoices/
│   ├── payments/
│   └── feedback/
│
├── routes/
│
├── lib/
│   └── prisma.ts
│
├── app.ts
└── server.ts
```

Each module can contain:

```text
service-request/
├── service-request.controller.ts
├── service-request.service.ts
├── service-request.route.ts
└── service-request.validation.ts
```

Keep the architecture simple. Do not create unnecessary layers unless the project actually needs them.

---

# 20. Important Business Rules

### Service Request

- Customer can create a request.
- New request starts as `PENDING`.
- Manager can approve or reject it.
- Rejected requests cannot become work orders unless a new request is created.

### Work Order

- One service request creates one work order.
- A work order can have a technician.
- Work order cannot be completed before work starts.
- Completed work orders should not normally be edited.

### Technician Assignment

- Manager assigns technician.
- Technician accepts or rejects.
- Rejected assignment can be reassigned.

### Service Visit

- A visit belongs to a work order.
- A technician performs the visit.
- Visit has scheduled and actual times.

### Invoice

- Invoice belongs to a work order.
- One work order has one invoice.
- Invoice becomes `PAID` after successful payment.

### Payment

- Payment belongs to an invoice.
- Transaction ID should be unique when provided.

### Feedback

- Customer can review a completed work order.
- One work order can have only one feedback.
- Rating should be between 1 and 5.

---

# 21. MVP Scope

For the first version, implement only:

## Authentication
- Register
- Login
- Logout
- Role-based authorization

## Customer
- View services
- Create service request
- View requests
- View work orders
- View invoices
- Make payment
- Submit feedback

## Manager
- View requests
- Approve/reject requests
- Create/manage work orders
- Assign technicians
- Schedule visits
- View service reports

## Technician
- View assignments
- Accept/reject assignment
- View visits
- Update work status
- Submit service report
- Upload files

## Admin
- Manage users
- Manage services
- View system data

---

# 22. Features NOT Required in MVP

Do not implement these unless the project requirements specifically need them:

- Real-time GPS tracking
- Automatic technician matching
- Technician skill matching
- Technician availability calendar
- Service-area radius calculation
- Push notifications
- SMS system
- WhatsApp notification system
- Audit logs
- Refresh-token management
- Complex invoice item system
- Tax calculation
- Discount engine
- Multiple addresses per customer
- Advanced analytics
- Real-time chat

These can be added later if required.

---

# 23. Development Priority

Build the project in this order:

```text
1. Project Setup
        ↓
2. Prisma + PostgreSQL
        ↓
3. User Authentication
        ↓
4. Role Based Authorization
        ↓
5. Service CRUD
        ↓
6. Customer Service Request
        ↓
7. Manager Request Approval
        ↓
8. Work Order
        ↓
9. Technician Assignment
        ↓
10. Service Visit
        ↓
11. Technician Work Update
        ↓
12. Service Report
        ↓
13. Invoice
        ↓
14. Payment
        ↓
15. Feedback
        ↓
16. Attachment Upload
        ↓
17. Dashboard
        ↓
18. Testing
```

---

# 24. Final Project Goal

The final system should allow a service company to manage the complete operation from one platform:

```text
CUSTOMER REQUEST
       ↓
REQUEST APPROVAL
       ↓
WORK ORDER
       ↓
TECHNICIAN ASSIGNMENT
       ↓
SERVICE VISIT
       ↓
WORK COMPLETION
       ↓
SERVICE REPORT
       ↓
INVOICE
       ↓
PAYMENT
       ↓
CUSTOMER FEEDBACK
```

The project should prioritize **simple code, clear database relationships, proper role-based access control, and a working end-to-end flow** over unnecessary enterprise-level complexity.
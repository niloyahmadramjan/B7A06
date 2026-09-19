# Field Service Management System — Project Documentation

Implementation reference for the **Field Service Management System** backend.
This document describes how the system is actually built: architecture, data
model, authorization, business flows, every API endpoint, and the payment
integration.

> **Related documents**
> - [`README.md`](../README.md) — quick start & setup
> - [`PROJECT_REQUIREMENTS.md`](../PROJECT_REQUIREMENTS.md) — product requirements, roles, and flows

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Common Conventions](#4-common-conventions)
5. [Data Model](#5-data-model)
6. [Enums](#6-enums)
7. [API Reference](#7-api-reference)
8. [Business Flows](#8-business-flows)
9. [Payments (bKash)](#9-payments-bkash)
10. [Audit Logging](#10-audit-logging)
11. [Notable Implementation Details](#11-notable-implementation-details)
12. [Backlog / Not Yet Implemented](#12-backlog--not-yet-implemented)

---

## 1. Overview

The backend exposes a REST API under `/api/v1` and manages the full field-service
operation:

```text
Customer request → Manager approval → Work order → Technician assignment
→ Service visit → Completion → Invoice → Payment → Feedback
```

It is a layered Express application. Each feature is a self-contained module
(`route` → `controller` → `service`) with `Zod` validation and Prisma as the
database access layer.

## 2. Architecture

### 2.1 Module layout

Each feature module under `src/app/module/<feature>/` contains:

| File                    | Responsibility                                              |
| ----------------------- | ----------------------------------------------------------- |
| `<feature>.route.ts`    | Declares HTTP routes and applies `auth(...)` role guards    |
| `<feature>.controller.ts` | Parses the request, delegates to the service, sends response |
| `<feature>.service.ts`  | Contains business rules and Prisma queries                   |
| `<feature>.validation.ts` | Zod schemas used to sanitize the request body               |
| `<feature>.interface.ts` | TypeScript interfaces for payloads and query params         |

Shared code lives in:

- **`src/app/config/index.ts`** — single accessor for all environment variables.
- **`src/app/middleware/`** — `checkAuth.ts` (auth + RBAC), `validate.ts`,
  `globalErrorHandler.ts`, `notFound.ts`.
- **`src/app/lib/`** — `prisma.ts` (Prisma client with Pg adapter),
  `redisConfig.ts`, `bkash.ts` (bKash token helper).
- **`src/app/utils/`** — `AppError`, `catchAsync`, `jwt`, `sendResponse`,
  `auditLog`.

### 2.2 Request lifecycle

```text
Client
  → Express middleware (cors, json, urlencoded, cookies)
  → Route guard: auth(...)  (verify token → check role → verify active user)
  → validate(schema)        (Zod body validation where used)
  → Controller              (parse req)
  → Service                 (business logic + Prisma)
  → Controller              (sendResponse)
  → globalErrorHandler      (uniform error responses)
```

### 2.3 Dependency handling

- **PostgreSQL** via Prisma Client using the `@prisma/adapter-pg` driver adapter.
- **Redis** is optional. The server connects lazily and swallows Redis errors —
  every caller already handles an unavailable Redis gracefully
  (`server.ts:12`, `redisConfig.ts`).
- **bKash** is called over HTTP using the standard `fetch` API.

## 3. Authentication & Authorization

### 3.1 Strategy

JWT access + refresh tokens, delivered in the login/register response. The
access token may be sent as:

1. an `accessToken` **cookie**, or
2. a `Bearer <token>` **Authorization header**, or
3. a raw `Authorization` value.

The `auth(...roles)` middleware (`src/app/middleware/checkAuth.ts`):

1. Resolves the token from cookie or header.
2. Verifies signature and reads the `userId` + `role` claims.
3. Rejects if the user's current role no longer matches the token role.
4. Rejects if the account is not `ACTIVE`.
5. Attaches `req.user = { userId, name, email, role }`.

Route guards are explicit per endpoint, e.g.
`auth(UserRole.MANAGER, UserRole.ADMIN)`.

### 3.2 Role–permission matrix (routes)

| Capability                                   | ADMIN | MANAGER | TECH | CUSTOMER |
| -------------------------------------------- | :---: | :-----: | :--: | :------: |
| Register / login / refresh                   |   ✓   |    ✓    |  ✓   |    ✓     |
| Get / update own profile                     |   ✓   |    ✓    |  ✓   |    ✓     |
| Manage services (create/update/delete)       |   ✓   |    ✓    |      |          |
| Create service request                       |       |         |      |    ✓     |
| Approve / reject request                     |   ✓   |    ✓    |      |          |
| Assign technician / manage assignments       |   ✓   |    ✓    |      |          |
| Schedule & manage service visits             |   ✓   |    ✓    |  ✓*  |          |
| Create / manage invoices                     |   ✓   |    ✓    |      |          |
| View invoices                                |   ✓   |    ✓    |      |    ✓     |
| Initiate payment (bKash)                     |       |         |      |    ✓     |
| Submit feedback                              |       |         |      |    ✓     |
| Manage technicians (apply / approve / reject)|   ✓   |    ✓    |  ✓†  |    ✓‡    |
| Admin users / roles / stats / audit logs     |   ✓   |    ✓§   |      |          |

\* Technicians may update visit **status only** (start/complete) and only on their own visits.
† Technicians can view/update their own profile.
‡ Customers can *apply* to become a technician.
§ Users + dashboard stats require MANAGER or ADMIN; role changes and audit logs require ADMIN.

## 4. Common Conventions

### 4.1 Response shape

Successful responses use `sendResponse` and typically look like:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { }
}
```

Paginated endpoints return `data` plus a `meta` object:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### 4.2 Error handling

`AppError` (extends `Error`) carries an HTTP status. The global handler converts
all errors — including unknown exceptions — into a consistent JSON response.
Zod validation failures produce a single `400` with joined issue messages.

### 4.3 Query parameters

List endpoints support common filters:

- `page`, `limit` (defaults `1` / `10`)
- `sortBy`, `sortOrder` (`asc` | `desc`)
- `searchTerm` (searches relevant text fields)
- plus module-specific filters (e.g. `status`, `serviceId`, `customerId`)

## 5. Data Model

The Prisma schema is split per domain under `prisma/schema/`. Relationships:

```text
User (users)
 ├── Customer         (1:1, by userId)
 ├── Technician       (1:1, by userId)
 ├── AuditLog         (1:n actor)
 ├── TechnicianAssignment  (1:n assignedBy)

Service
 └── ServiceRequest   (1:n)

Customer
 ├── ServiceRequest   (1:n)
 ├── WorkOrder        (1:n)
 ├── Invoice          (1:n)
 └── Feedback         (1:n)

Technician
 ├── TechnicianAssignment (1:n)
 ├── WorkOrder        (1:n  — the current assigned technician)
 ├── ServiceVisit     (1:n)
 ├── ServiceReport    (1:n)
 └── Feedback         (1:n)

ServiceRequest
 ├── Service          (n:1)
 ├── Customer         (n:1)
 ├── WorkOrder        (1:1)
 └── Attachment       (1:n)

WorkOrder
 ├── ServiceRequest   (1:1)
 ├── Customer         (n:1)
 ├── Technician       (n:1, nullable, SetNull)
 ├── TechnicianAssignment (1:n)
 ├── ServiceVisit     (1:n)
 ├── ServiceReport    (1:1)
 ├── Attachment       (1:n)
 ├── Invoice          (1:1)
 └── Feedback         (1:1)

Invoice
 ├── WorkOrder        (1:1)
 ├── Customer         (n:1)
 └── Payment          (1:n)

Payment
 └── Invoice          (n:1)
```

### 5.1 Model reference

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Authentication & roles; phone unique, email unique (nullable) |
| `Customer` | — | Customer address/city/district, 1:1 with User |
| `Technician` | — | Employee ID, status, skills, application status, 1:1 with User |
| `Service` | — | Catalog of sellable services with price |
| `ServiceRequest` | — | Customer request (`REQ-…` unique number), soft-delete via `deletedAt` |
| `WorkOrder` | — | The job (`WO-…` unique number) deriving from an approved request |
| `TechnicianAssignment` | — | Assignment of a technician to a work order |
| `ServiceVisit` | — | Scheduled field visit with actual times |
| `ServiceReport` | — | Technician diagnosis / work-performed write-up |
| `Attachment` | — | Uploaded files (image/document/other) |
| `Invoice` | — | Billing doc (`INV-…` unique number) |
| `Payment` | — | Gateway/linked payments; unique `transactionId` |
| `Feedback` | — | Customer rating (1–5) & comment; one per work order |
| `AuditLog` | — | Trails of key actions with actor + JSON changes |

Key `Decimal` fields (`@db.Decimal(10, 2)`): `Service.price`,
`WorkOrder.estimatedCost`, `WorkOrder.actualCost`, `Invoice.amount`,
`Payment.amount`.

## 6. Enums

Defined in `prisma/schema/enums.prisma`:

| Enum                            | Values                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| `UserRole`                      | `ADMIN`, `MANAGER`, `TECHNICIAN`, `CUSTOMER`                  |
| `UserStatus`                    | `ACTIVE`, `INACTIVE`                                           |
| `TechnicianStatus`              | `AVAILABLE`, `BUSY`, `OFFLINE`                                 |
| `TechnicianApplicationStatus`   | `PENDING`, `APPROVED`, `REJECTED`                              |
| `ServiceRequestStatus`          | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`                 |
| `WorkOrderStatus`               | `CREATED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `AssignmentStatus`              | `PENDING`, `ACCEPTED`, `REJECTED`                              |
| `VisitStatus`                   | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`           |
| `AttachmentType`                | `IMAGE`, `DOCUMENT`, `OTHER`                                   |
| `InvoiceStatus`                 | `DRAFT`, `ISSUED`, `PAID`, `CANCELLED`                         |
| `PaymentStatus`                 | `PENDING`, `SUCCESS`, `FAILED`                                 |
| `PaymentMethod`                 | `CASH`, `CARD`, `BANK_TRANSFER`, `BKASH`, `NAGAD`, `OTHER`     |

## 7. API Reference

Base URL: `/api/v1`.

### 7.1 Auth — `/auth`

| Method | Path            | Roles | Description |
| ------ | --------------- | ----- | ----------- |
| POST   | `/register`     | public | Register a customer (auto-creates Customer profile). Returns user + tokens. |
| POST   | `/login`        | public | Login with email + password. Returns user + tokens. |
| GET    | `/me`           | any authenticated | Current user. |
| POST   | `/refresh-token`| public | Exchange refresh token for a fresh token pair. |

**Register body:**

```json
{
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "phone": "01712345678",
  "password": "secret123"
}
```

> Rules: name/phone/password required, password ≥ 8 chars, phone/email unique.

### 7.2 Users — `/users`

| Method | Path  | Roles | Description |
| ------ | ----- | ----- | ----------- |
| GET    | `/me` | any authenticated | Current user profile (password excluded). |
| PATCH  | `/me` | any authenticated | Update own profile fields. |

### 7.3 Customers — `/customer`

| Method | Path     | Roles | Description |
| ------ | -------- | ----- | ----------- |
| GET    | `/get`   | CUSTOMER | Own customer profile. |
| PUT    | `/update`| CUSTOMER | Update own address/city/district. |

### 7.4 Technicians — `/technician`

| Method | Path                    | Roles | Description |
| ------ | ----------------------- | ----- | ----------- |
| POST   | `/apply`                | CUSTOMER | Apply to become a technician (`applicationStatus = PENDING`). |
| GET    | `/my-application`       | CUSTOMER, TECHNICIAN | Own application. |
| GET    | `/`                     | MANAGER, ADMIN | List technicians (filter by `applicationStatus`). |
| GET    | `/:technicianId`        | MANAGER, ADMIN, TECHNICIAN | Single technician. |
| PATCH  | `/approve/:technicianId`| MANAGER, ADMIN | Approve application; user becomes a technician. |
| PATCH  | `/reject/:technicianId` | MANAGER, ADMIN | Reject application (with reason). |
| PATCH  | `/update/:technicianId` | MANAGER, ADMIN, TECHNICIAN | Update technician profile (self or manager). |
| DELETE | `/:technicianId`        | MANAGER, ADMIN | Delete a technician. |

### 7.5 Services — `/service`

| Method | Path                | Roles | Description |
| ------ | ------------------- | ----- | ----------- |
| POST   | `/create`           | MANAGER, ADMIN | Create a service. |
| GET    | `/get-all`          | public | List active services (supports search + pagination). |
| PUT    | `/update/:serviceId`| MANAGER, ADMIN | Update a service. |
| DELETE | `/delete/:serviceId`| MANAGER, ADMIN | Delete a service. |

**Create service body:**

```json
{ "name": "AC Repair", "price": 1500, "description": "Split AC servicing" }
```

### 7.6 Service Requests — `/request`

**Customer side**

| Method | Path                | Roles | Description |
| ------ | ------------------- | ----- | ----------- |
| POST   | `/service/:serviceId` | CUSTOMER | Create a request for the given service. Status `PENDING`. |
| GET    | `/`                 | CUSTOMER | List own requests. |
| GET    | `/:requestId`       | CUSTOMER | Own request by id. |
| PATCH  | `/:requestId`       | CUSTOMER | Update own pending request. |
| DELETE | `/:requestId`       | CUSTOMER | Delete own request (only when `PENDING`). |

**Manager review**

| Method | Path                        | Roles | Description |
| ------ | --------------------------- | ----- | ----------- |
| GET    | `/admin`                    | MANAGER, ADMIN | List requests for review (filter `status`, `searchTerm`). |
| GET    | `/admin/:requestId`         | MANAGER, ADMIN | Single request with customer/service/work order. |
| PATCH  | `/admin/approve/:requestId` | MANAGER, ADMIN | Approve: `PENDING → APPROVED` **and** auto-creates the work order (`WO-…`). |
| PATCH  | `/admin/reject/:requestId`  | MANAGER, ADMIN | Reject: `PENDING → REJECTED`. |

**Create request body:**

```json
{
  "title": "AC not cooling",
  "description": "Unit runs but blows warm air",
  "preferredDate": "2026-09-20T10:00:00.000Z",
  "address": "House 12, Road 5, Dhanmondi",
  "city": "Dhaka",
  "district": "Dhaka"
}
```

> Only `PENDING` requests can be approved, rejected, updated, or deleted.

### 7.7 Resources — `/resources`

The resource module is a convenience surface over `ServiceRequest` that bundles
request management, technician assignment, status changes, and soft-delete.

| Method | Path                | Roles | Description |
| ------ | ------------------- | ----- | ----------- |
| POST   | `/`                 | CUSTOMER | Create a resource (= create a request). |
| GET    | `/`                 | all roles | List resources (role-scoped). |
| GET    | `/search`           | all roles | Search by `q`/`searchTerm`. |
| GET    | `/my-assigned`      | TECHNICIAN, MANAGER, ADMIN | Resources whose work order is assigned to the caller. |
| GET    | `/:id`              | all roles | Single resource (scoped to own/assigned). |
| PATCH  | `/:id`              | CUSTOMER, MANAGER, ADMIN | Update (pending only). |
| DELETE | `/:id`              | CUSTOMER, MANAGER, ADMIN | Soft delete (`deletedAt`). |
| POST   | `/:id/assign`       | MANAGER, ADMIN | Assign resource to a technician (creates assignment; work order must exist). |
| PATCH  | `/:id/status`       | MANAGER, ADMIN | `APPROVED` / `REJECTED` (pending only) or `CANCELLED`. |
| POST   | `/:id/cancel`       | CUSTOMER, MANAGER, ADMIN | Cancel a resource. |

### 7.8 Assignments — `/assignments`

| Method | Path             | Roles | Description |
| ------ | ---------------- | ----- | ----------- |
| POST   | `/`              | MANAGER, ADMIN | Assign technician to a `CREATED` work order. |
| GET    | `/`              | MANAGER, ADMIN, TECHNICIAN | List assignments (`status`, `workOrderId`, `technicianId`). |
| GET    | `/:assignmentId` | MANAGER, ADMIN, TECHNICIAN | Single assignment. |
| DELETE | `/:assignmentId` | MANAGER, ADMIN | Remove assignment (only before work starts). |

**Create assignment body:**

```json
{ "workOrderId": "<wo-id>", "technicianId": "<tech-id>" }
```

Business rules (`assignment.service.ts`):

- Work order must be `CREATED`.
- Technician must not be `OFFLINE`.
- A work order can have only one `ACCEPTED` assignment.
- On creation the assignment is immediately **`ACCEPTED`** and the work order
  becomes `ASSIGNED` with `technicianId` set (transactionally).
- Deleting an assignment resets the work order to `CREATED` (technician null),
  but fails once work is `IN_PROGRESS`/`COMPLETED`/`CANCELLED`.

### 7.9 Service Visits — `/service-visits`

| Method | Path       | Roles | Description |
| ------ | ---------- | ----- | ----------- |
| POST   | `/`        | MANAGER, ADMIN | Schedule a visit for an `ASSIGNED` work order (conflict-checked). |
| GET    | `/`        | MANAGER, ADMIN, TECHNICIAN | List visits (technicians only see their own). |
| GET    | `/:visitId`| MANAGER, ADMIN, TECHNICIAN | Single visit (own-only for technicians). |
| PATCH  | `/:visitId`| MANAGER, ADMIN, TECHNICIAN | Update visit; technicians may only change status. |
| DELETE | `/:visitId`| MANAGER, ADMIN | Delete a visit (not in progress/completed). |

**Create visit body:**

```json
{
  "workOrderId": "<wo-id>",
  "technicianId": "<tech-id>",
  "scheduledStart": "2026-09-20T10:00:00.000Z",
  "scheduledEnd": "2026-09-20T12:00:00.000Z"
}
```

Rules:

- The work order must be `ASSIGNED` and the technician must match the work
  order's assigned technician.
- Schedule conflict detection prevents overlapping `SCHEDULED`/`IN_PROGRESS`
  visits for the same technician (`assertNoScheduleConflict`).
- Technicians may transition `SCHEDULED → IN_PROGRESS` and
  `IN_PROGRESS → COMPLETED` only; managers may cancel `SCHEDULED` visits.
- `actualStart`/`actualEnd` auto-set on transition.
- Completing a visit also completes the work order in a transaction
  (`service-visit.service.ts:136-149`).

### 7.10 Invoices — `/invoices`

| Method | Path         | Roles | Description |
| ------ | ------------ | ----- | ----------- |
| POST   | `/`          | MANAGER, ADMIN | Create invoice for a **completed** work order. |
| GET    | `/`          | MANAGER, ADMIN, CUSTOMER | List invoices (customers see their own). |
| GET    | `/:invoiceId`| MANAGER, ADMIN, CUSTOMER | Single invoice. |
| PATCH  | `/:invoiceId`| MANAGER, ADMIN | Update invoice. |
| DELETE | `/:invoiceId`| MANAGER, ADMIN | Delete invoice. |

Rules (`invoice.service.ts`):

- Work order must be `COMPLETED`.
- One work order → one invoice (`workOrderId` unique).
- Amount defaults to `actualCost ?? estimatedCost ?? service price`; body may
  override with `customerId` matching the work order's customer.

### 7.11 Payments — `/payments`

| Method | Path             | Roles | Description |
| ------ | ---------------- | ----- | ----------- |
| POST   | `/initiate`      | CUSTOMER | Initiate a payment (invoice id in body/query). |
| POST   | `/:invoiceId/pay`| CUSTOMER | Start bKash checkout for the invoice → returns `paymentUrl`. |
| GET    | `/callback`      | public | bKash browser redirect target. |
| POST   | `/webhook`       | public | Server-to-server payment follow-up endpoint. |
| GET    | `/all`           | MANAGER, ADMIN | List payments (filters: `status`, `method`, `invoiceId`, `customerId`). |
| GET    | `/my`            | CUSTOMER | Own payments. |
| GET    | `/:paymentId`    | MANAGER, ADMIN, CUSTOMER | Single payment (own-only for customers). |

See [§9 Payments (bKash)](#9-payments-bkash) for the full flow.

### 7.12 Feedbacks — `/feedbacks`

| Method | Path            | Roles | Description |
| ------ | --------------- | ----- | ----------- |
| POST   | `/`             | CUSTOMER | Submit feedback for a completed **and paid** work order. |
| GET    | `/`             | all roles | List feedback (role-scoped). |
| GET    | `/:feedbackId`  | all roles | Single feedback. |

Rules (`feedback.service.ts`):

- Work order must be `COMPLETED` **and** its invoice `PAID`.
- One comment/rating per work order (`workOrderId` unique).
- Rating must be 1–5.

### 7.13 Admin — `/admin`

| Method | Path                | Roles | Description |
| ------ | ------------------- | ----- | ----------- |
| GET    | `/users`            | MANAGER, ADMIN | List users (`role`, `status`, `searchTerm`). |
| PATCH  | `/users/:id/role`   | ADMIN  | Change a user's role (cannot change your own). |
| GET    | `/dashboard-stats`  | MANAGER, ADMIN | Aggregate counts, revenue, average rating. |
| GET    | `/audit-logs`       | ADMIN  | Audit log trail (filter `entity`, `action`, `actorId`, `entityId`). |

**Dashboard stats** (`admin.service.ts`) returns:

```json
{
  "users": { "total": 0, "customers": 0, "technicians": 0 },
  "requests": { "total": 0, "pending": 0 },
  "workOrders": { "total": 0, "completed": 0 },
  "invoices": { "total": 0, "paid": 0 },
  "payments": { "total": 0, "successful": 0, "revenue": 0 },
  "feedbacks": { "total": 0, "averageRating": 0 }
}
```

## 8. Business Flows

### 8.1 Request → Work order

1. Customer creates a request → `ServiceRequest(status = PENDING)`.
2. Manager approves → in one transaction the request becomes `APPROVED` and a
   `WorkOrder(status = CREATED)` is created with number `WO-<timestamp>-<hex>`
   (`request.service.ts:approveRequest`).
3. Alternatively the manager rejects → `REJECTED`; no work order.

### 8.2 Assignment

1. Manager picks a technician for the `CREATED` work order.
2. The assignment is recorded (status `ACCEPTED`) and the work order moves to
   `ASSIGNED` with `technicianId` (transactional).
3. Deleting the assignment (before work starts) returns the work order to
   `CREATED`.

> Note: the requirements document describes a technician accept/reject stage
> (`AssignmentStatus.PENDING → ACCEPTED/REJECTED`). The current implementation
> assigns directly as `ACCEPTED` — this is a deliberate simplification of the
> MVP. See [§12 Backlog](#12-backlog--not-yet-implemented).

### 8.3 Service visit

1. Manager schedules a visit on the `ASSIGNED` work order (conflict-free).
2. Technician starts the visit → `IN_PROGRESS` (auto `actualStart`).
3. Technician completes the visit → `COMPLETED` (auto `actualEnd`), which in the
   same transaction completes the work order (`COMPLETED` + `completedAt`).

### 8.4 Invoice & payment

1. Manager creates an invoice for the `COMPLETED` work order
   (`DRAFT`, amount = actual/estimated cost or service price).
2. Invoice is issued (`ISSUED`) by update.
3. Customer pays via bKash (see §9). On success the payment is `SUCCESS` and the
   invoice becomes `PAID`.

### 8.5 Feedback

1. Customer rates a work order that is `COMPLETED` and whose invoice is `PAID`.
2. One feedback per work order, rating 1–5.

## 9. Payments (bKash)

Payment integrates the **bKash Tokenized Checkout** sandbox API.

### 9.1 Flow

```text
Customer POST /api/v1/payments/:invoiceId/pay
  1. Validates invoice: exists, customer owns it, not PAID, status == ISSUED.
  2. Marks older PENDING payments for the invoice as FAILED (fresh session).
  3. Obtains bKash ID token (getBkashIdToken).
  4. Calls /tokenized/checkout/create with amount in BDT, merchantInvoiceNumber,
     payerReference = customer email, callbackURL = <BACKEND>/api/v1/payments/callback.
  5. Stores a Payment row: status PENDING, method BKASH, gatewayPaymentId,
     gatewayResponse (raw).
  6. Returns { paymentId, paymentUrl } → customer/site redirects.
```

```text
bKash → GET /api/v1/payments/callback?paymentID=...&status=...
  - "success"  → calls /tokenized/checkout/execute; if statusCode 0000,
                 settlePayment() marks Payment SUCCESS + Invoice PAID (transaction),
                 records audit log, redirects to FRONTEND_URL/dashboard/invoices?payment=success.
                 Handles duplicate-execute by querying payment status via
                 /tokenized/checkout/payment/status before failing (idempotency).
  - "failure"/"cancel" → Payment FAILED, redirect with ?payment=failure|cancel.
```

### 9.2 Idempotency measures

- A settled (`SUCCESS`) payment is never executed/executed again.
- Stale `PENDING` payments are force-failed before a new session starts.
- If `execute` returns a "duplicate" message, the transaction status is queried
  and, if genuinely completed, the payment is still settled.

### 9.3 Timestamp parsing

bKash timestamps (`"2026-09-19T09:28:55:970 GMT+0600"`) are normalized to ISO
8601 before storing (`parseBkashDate`).

### 9.4 Config

| Env var                 | Purpose                          |
| ----------------------- | -------------------------------- |
| `BKASH_USERNAME`        | Sandbox username                 |
| `BKASH_PASSWORD`        | Sandbox password                 |
| `BKASH_APP_KEY`         | App key (`X-APP-Key` header)     |
| `BKASH_APP_SECRET`      | App secret                       |
| `BKASH_BASE_URL`        | Gateway base URL                 |
| `BKASH_CALLBACK_URL`    | Base for the callback URL        |

## 10. Audit Logging

`src/app/utils/auditLog.ts` exposes `recordAuditLog`. Currently recorded for:

- Payment settlement (`PAYMENT_SUCCESS`)
- Resource status changes / assignment (`ASSIGN`, approvals, cancellations)
- User role changes (`UPDATE_ROLE`)

Entries store `actorId`, `action`, `entity`, `entityId`, and a `changes` JSON
blob. Admin can read them via `GET /api/v1/admin/audit-logs`.

## 11. Notable Implementation Details

- **Server bootstrap** (`server.ts`) connects PostgreSQL and opportunistically
  pings Redis (`ensureRedisConnected().catch(() => undefined)`) so the API runs
  even when Redis is down.
- **Access token expiry** is a *string* pass-through (e.g. `1d`) to
  `jsonwebtoken` sign options; refresh token lives beside it (no refresh-token
  storage/rotation — refresh tokens are stateless).
- **Req-scoped listing**: technicians only see their own assignments/visits,
  customers only see their own requests/invoices/payments; enforced in service
  `where` clauses (not just route guards).
- **Soft delete** on `ServiceRequest` (`deletedAt`), consulted in resource
  queries.
- **Decimal money** fields are Prisma `Decimal`; amounts are serialized as
  strings/numbers by Prisma's default handling.
- Generated client lives at `src/generated/prisma` (git-ignored) using the
  new `prisma-client` generator; application imports from there (e.g.
  `../../../generated/prisma/enums`).

## 12. Backlog / Not Yet Implemented

The schema already defines these, but **no API modules exist yet** for them:

- **ServiceReport** — no `/reports` routes; reports are created implicitly only
  via work-order completion today.
- **Attachment / file upload** — `Attachment` model exists but there is no
  upload endpoint or storage integration (Cloudinary credentials are configured
  but unused).
- **Work-Order-centric endpoints** — work orders are currently created and
  mutated indirectly (approve, assignment, visit). There is no dedicated
  `/work-orders` controller for listing/updating work orders directly.
- **Technician accept/reject assignment** — assignments are created as
  `ACCEPTED` directly (see [§8.2](#82-assignment)).
- **Logout endpoint** — refresh-token invalidation is not implemented.

Also per the MVP scope in `PROJECT_REQUIREMENTS.md`, the following are **out of
scope** for now: GPS tracking, auto-matching, push/SMS/WhatsApp notifications,
tax/discounts, complex invoice line items, multi-address customers, real-time
chat, and advanced analytics.
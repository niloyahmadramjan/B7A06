# Field Service Management System (Backend)

A REST API backend for managing field service operations — from customer service
requests and technician assignments to on-field visits, invoicing, payments, and
customer feedback.

The system supports four roles — **Admin**, **Manager**, **Technician**, and
**Customer** — and covers the complete service lifecycle in one platform.

> **Documentation**
> - [Requirements & System Flow](./PROJECT_REQUIREMENTS.md)
> - [Implementation & API Reference](./docs/PROJECT_DOCUMENTATION.md)
> - [Postman Collection](./postman/Field-Service-System.postman_collection.json)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [User Roles](#user-roles)
- [System Flow](#system-flow)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Install dependencies](#1-install-dependencies)
  - [2. Configure environment](#2-configure-environment)
  - [3. Set up the database](#3-set-up-the-database)
  - [4. Run the seed script](#4-run-the-seed-script)
  - [5. Start the server](#5-start-the-server)
- [Demo Accounts](#demo-accounts)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Testing with Postman](#testing-with-postman)
- [License](#license)

---

## Features

- **Authentication** — register, login, refresh token, JWT-based RBAC middleware
- **Role-based authorization** — route-level guards for `ADMIN`, `MANAGER`, `TECHNICIAN`, `CUSTOMER`
- **Service catalog** — CRUD for services
- **Service requests** — customers create, update, and track requests
- **Request review** — managers approve/reject requests; approval auto-generates a work order
- **Work orders** — lifecycle `CREATED → ASSIGNED → IN_PROGRESS → COMPLETED` (or `CANCELLED`)
- **Technician management** — customers can apply to become technicians; admins approve/reject applications
- **Technician assignment** — manager assigns a technician to a work order, with conflict safeguards
- **Service visits** — scheduling with conflict detection, plus start/complete transitions
- **Invoicing** — invoices per completed work order, lifecycle `DRAFT → ISSUED → PAID` (or `CANCELLED`)
- **Payments** — customer-initiated bKash payment flow with callback + webhook style follow-up
- **Feedback** — customers rate completed (and paid) work orders on a 1–5 scale
- **Resources** — a higher-level request management surface for customers, managers, and technicians
- **Admin panel** — user management, role changes, aggregate dashboard stats, audit logs
- **Audit logging** — key actions recorded for accountability

## Tech Stack

| Layer      | Technology                                                             |
| ---------- | ---------------------------------------------------------------------- |
| Runtime    | Node.js + TypeScript                                                    |
| Framework  | Express 5                                                               |
| Database   | PostgreSQL                                                              |
| ORM        | Prisma (with `@prisma/adapter-pg` driver adapter)                       |
| Validation | Zod                                                                     |
| Auth       | jsonwebtoken (access + refresh), bcryptjs password hashing              |
| Cache/Queue| Redis (optional; graceful fallback)                                     |
| Payments   | bKash Tokenized Checkout (Sandbox)                                      |
| Lint/Format| Biome                                                                   |
| Dev runner | tsx                                                                     |

## User Roles

| Role        | What they can do                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **ADMIN**   | Manage users & roles, manage services, review everything, view stats and audit logs                       |
| **MANAGER** | Review/approve/reject requests, create work orders, assign technicians, schedule visits, create invoices  |
| **TECHNICIAN** | View assignments and scheduled visits, update work/visit status, access assigned work                    |
| **CUSTOMER**  | Register/login, browse services, create & track requests, view invoices, pay, leave feedback             |

## System Flow

```text
Customer request
      │
      ▼
Manager review ── rejected ──► Request closed (REJECTED)
      │
      │ approved (auto work order)
      ▼
Work Order (CREATED)
      │
      ▼ create assignment
Technician Assignment (assignedBy manager)
      │
      ▼
Service Visit (SCHEDULED)
      │
      ▼ technician starts / completes
Work Order IN_PROGRESS → COMPLETED
      │
      ├──► Invoice (DRAFT → ISSUED)
      │         │
      │         ▼ customer pays (bKash)
      │      Payment → SUCCESS / Invoice → PAID
      │
      └──► Customer Feedback (once work order is completed & paid)
```

## Prerequisites

- Node.js **≥ 20** (project uses modern ESM + TypeScript features)
- PostgreSQL database (local or hosted — configurable via `DATABASE_URL`)
- Optional: a Redis instance (server starts fine without it; used opportunistically)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

At minimum set:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — strong random secrets
- `FRONTEND_URL` — allowed CORS origin (e.g. `http://localhost:3000`)

> `.env` is git-ignored and must never be committed. See
> [Environment Variables](#environment-variables) for the full list.

### 3. Set up the database

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run the seed script

Creates the default `ADMIN`, `MANAGER`, `TECHNICIAN`, and `CUSTOMER` accounts
(credentials come from your env file):

```bash
npm run seed
```

### 5. Start the server

```bash
npm run dev        # development (hot reload via tsx watch)
# or
npm run build && npm start   # production build then run
```

If everything worked you should see:

```
Connected to the database successfully.
Server is running on port 5000
```

Health check: `GET http://localhost:5000/api/v1`

## Demo Accounts

Created by `npm run seed`. The values below match the default env file —
change them in `.env` and re-seed to use your own.

| Role        | Email               | Password         |
| ----------- | ------------------- | ---------------- |
| Admin       | admin@gmail.com     | admin12345       |
| Manager     | manager@gmail.com   | manager12345     |
| Technician  | technician@gmail.com| technician12345  |
| Customer    | customer@gmail.com  | customer12345    |

## Environment Variables

| Variable                 | Required | Description                                         |
| ------------------------ | -------- | --------------------------------------------------- |
| `NODE_ENV`               | no       | `development` \| `production`                       |
| `PORT`                   | no       | HTTP port (default seeds use `5000`)                |
| `DATABASE_URL`           | yes      | PostgreSQL connection string                        |
| `JWT_ACCESS_SECRET`      | yes      | Secret for access tokens                            |
| `JWT_REFRESH_SECRET`     | yes      | Secret for refresh tokens                           |
| `JWT_ACCESS_EXPIRES_IN`  | no       | e.g. `1d` (default)                                 |
| `JWT_REFRESH_EXPIRES_IN` | no       | e.g. `7d` (default)                                 |
| `BCRYPT_SALT_ROUNDS`     | no       | Password hash rounds (default `10`)                 |
| `FRONTEND_URL`           | yes*     | Allowed CORS origin; also used for payment redirect |
| `BACKEND_URL`            | no       | Absolute API link base                              |
| `ADMIN_EMAIL` / `ADMIN_PASS` | yes*   | Seed credentials for the admin account              |
| `MANAGER_EMAIL` / `MANAGER_PASS` | yes* | Seed credentials for the manager account        |
| `TECHNICIAN_EMAIL` / `TECHNICIAN_PASS` | yes* | Seed credentials for the technician account  |
| `CUSTOMER_EMAIL` / `CUSTOMER_PASS` | yes* | Seed credentials for the customer account      |
| `REDIS_USER_NAME` / `REDIS_PASS` / `REDIS_HOST` / `REDIS_PORT` | no | Redis connection (graceful fallback) |
| `BKASH_USERNAME` / `BKASH_PASSWORD` / `BKASH_APP_KEY` / `BKASH_APP_SECRET` | yes* | bKash Tokenized Checkout sandbox credentials |
| `BKASH_BASE_URL`         | no       | bKash gateway base URL (sandbox default in example) |
| `BKASH_CALLBACK_URL`     | yes*     | Base URL bKash redirects to after a payment attempt |

\* Required only when the corresponding feature is exercised (seeding / bKash).

## Project Structure

```text
.
├── prisma/
│   ├── schema/                # Prisma schema split by domain (User, WorkOrder, ...)
│   ├── migrations/            # Prisma migrations
│   └── seed.ts                # Default admin/manager/technician/customer seeds
├── postman/
│   └── Field-Service-System.postman_collection.json
├── src/
│   ├── app.ts                 # Express app: middleware, CORS, route mounting
│   ├── server.ts              # Bootstrap: DB + Redis connect, listen
│   ├── generated/prisma/      # Generated Prisma client (git-ignored)
│   └── app/
│       ├── config/            # Env config (central accessor)
│       ├── middleware/        # checkAuth (RBAC), validate, error handlers
│       ├── lib/               # prisma, redis, bkash helpers
│       ├── utils/             # AppError, catchAsync, jwt, sendResponse, auditLog
│       └── module/            # Feature modules (controller/service/route/validation)
│           ├── auth/  users/  customers/
│           ├── service/  request/  resource/
│           ├── technician/  assignment/  service-visit/
│           ├── invoice/  payment/  feedback/
│           └── admin/
├── PROJECT_REQUIREMENTS.md
├── docs/PROJECT_DOCUMENTATION.md
├── README.md
└── package.json
```

Each feature module follows the same shape:

```text
module/
└── <feature>/
    ├── <feature>.route.ts        # Express routes + role guards
    ├── <feature>.controller.ts   # HTTP layer (parse request/response)
    ├── <feature>.service.ts      # Business logic + Prisma
    ├── <feature>.validation.ts   # Zod schemas
    └── <feature>.interface.ts    # TypeScript contracts
```

## Available Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Run with hot reload (tsx watch)              |
| `npm run build`     | Compile TypeScript to `dist/`                |
| `npm start`         | Run compiled output                          |
| `npm run seed`      | Populate default accounts                    |
| `npm run format:check` | Format check with Biome                   |
| `npm run format:fix`   | Auto-format source with Biome             |
| `npm run link:check`   | Lint source with Biome                    |
| `npm run link:fix`     | Auto-fix lint issues with Biome           |

## API Overview

All endpoints are prefixed with `/api/v1`.

| Module          | Base path              | Description                                       |
| --------------- | ---------------------- | ------------------------------------------------- |
| Auth            | `/api/v1/auth`         | Register, login, current user, refresh token      |
| Users           | `/api/v1/users`        | Own profile get/update                            |
| Customers       | `/api/v1/customer`     | Customer profile get/update                       |
| Technicians     | `/api/v1/technician`   | Apply, approve/reject, manage technicians         |
| Services        | `/api/v1/service`      | Service catalog CRUD                              |
| Requests        | `/api/v1/request`      | Customer requests + manager review/approve/reject |
| Resources       | `/api/v1/resources`    | Request-management surface (assign/status/soft-delete) |
| Assignments     | `/api/v1/assignments`  | Technician assignment to work orders              |
| Service Visits  | `/api/v1/service-visits` | Schedule & run field visits                     |
| Invoices        | `/api/v1/invoices`     | Invoice CRUD (per completed work order)           |
| Payments        | `/api/v1/payments`     | bKash initiate, pay, callback, webhook, list      |
| Feedbacks       | `/api/v1/feedbacks`    | Customer ratings/comments                         |
| Admin           | `/api/v1/admin`        | Users, roles, dashboard stats, audit logs         |

Each endpoint is documented with roles, request, and response schemas in
[`docs/PROJECT_DOCUMENTATION.md`](./docs/PROJECT_DOCUMENTATION.md).

## Testing with Postman

An importable collection is included:

1. Open Postman → **Import** → select
   `postman/Field-Service-System.postman_collection.json`.
2. Set your environment base URL (default `http://localhost:5000/api/v1`).
3. Start with the **Authentication → Register/Login** requests, then use the
   returned token to call protected routes.

The collection groups requests by module and matches the API documented above.

## License

ISC — see [`package.json`](./package.json).
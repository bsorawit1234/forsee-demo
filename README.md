# Foresee Reservation Platform

ระบบจองรถบริการและศูนย์ปฏิบัติการสำหรับ Foresee Corporation แบ่งประสบการณ์เป็น 2 portal ใน React application เดียว:

- `ผู้จอง` เลือกบริการ สถานที่ วันเวลา ดู availability และติดตามงานของตัวเอง
- `บริษัท` เห็น Booking ทั้งหมด วางแผนคิวแบบ Week Capacity / Day Dispatch จัดรถ ติดตาม SLA รถ ลูกค้า และรายงาน

รายละเอียด architecture, role matrix, state model, UI rules, migration และ roadmap อยู่ใน [FORESEE_SYSTEM_ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md](./FORESEE_SYSTEM_ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md)

## Stack

- React 19 + Vite + TypeScript + TanStack Query
- NestJS 11 + class-validator + Swagger/OpenAPI
- PostgreSQL 16 + Prisma 6
- Versioned migrations ใน `packages/database/prisma/migrations`
- Versioned idempotent seeds ใน `packages/database/seeds/versions`
- Orval generated client ใน `packages/api-client/src/generated`
- Docker Compose + Nginx reverse proxy + SSE operations events

## เริ่มต้นแบบ local

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose -f infra/compose.yaml up -d postgres
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

เปิด `http://localhost:5173` และ API docs ที่ `http://localhost:3000/docs` เมื่อเปิด API แยกด้วย `pnpm dev:api` หากต้องการให้ UI ดึงข้อมูลจริง ให้ตั้ง `VITE_API_ENABLED=true`; ค่าเริ่มต้น `false` จะใช้ demo fixture ที่ deterministic เพื่อให้เปิดดู UI ได้โดยไม่ต้องมีฐานข้อมูล

## Docker workflow

```bash
docker compose -f infra/compose.yaml up --build
docker compose -f infra/compose.yaml --profile seed run --rm seed
```

Compose แยก `migrate` เป็น one-off job และให้ `api` เริ่มหลัง migration สำเร็จ ไม่ให้ replica แต่ละตัวแข่งกัน migrate เอง

## คำสั่งตรวจสอบ

```bash
pnpm build       # generate OpenAPI/client แล้ว build web + api
pnpm typecheck   # web, api, api-client, database
pnpm lint
pnpm test        # unit tests ของ web และ api
pnpm api:openapi
pnpm api:client
```

ถ้าแก้ controller หรือ DTO ให้รัน `pnpm api:openapi && pnpm api:client` และ commit generated files พร้อม source เสมอ

## Demo accounts

Seed `900_demo_data` สร้างบัญชีตัวอย่าง รหัสผ่าน `demo1234`:

- บริษัท: `owner@forsee.example` (OWNER)
- ผู้จอง: `customer@thairung.example` (CUSTOMER)

ระบบจริงควรเปลี่ยน password hashing เป็น Argon2id และใช้ secret จาก secret manager ก่อน production

## API surface หลัก

| กลุ่ม | Endpoint |
| --- | --- |
| Auth | `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` |
| Customer | `GET /api/v1/catalog/services`, `GET /api/v1/catalog/customer/sites`, `GET/POST /api/v1/catalog/customer/availability`, `GET/POST /api/v1/customer/bookings` |
| Operations | `GET /api/v1/ops/dashboard`, `GET /api/v1/ops/bookings`, `GET /api/v1/ops/calendar/week`, `GET /api/v1/ops/calendar/day` |
| Fleet / customers | `GET /api/v1/ops/vehicles`, `GET /api/v1/ops/customers` |
| Realtime | `GET /api/v1/events` (SSE) |
| Health | `GET /health/live`, `GET /health/ready` |

Swagger เป็น source ที่ generate ไปยัง `packages/api-client/openapi.json`; ห้ามแก้ generated client ด้วยมือ

## Role boundary

Backend ตรวจสิทธิ์ทุก route ด้วย session cookie + `RolesGuard`:

- `OWNER`, `ADMIN`, `STAFF` เข้า operations routes
- `CUSTOMER` เข้า customer booking/site/availability routes
- ทุก query ฝั่งลูกค้าต้อง scope ด้วย `organizationId` จาก session ห้ามรับ organization จาก client

## Known local limitation

ถ้า Docker daemon ไม่ทำงาน จะตรวจ schema/build/test ได้ แต่จะไม่สามารถรัน PostgreSQL migration/seed หรือทดสอบ API ที่ query DB จริงได้ ให้เปิด Docker Desktop แล้วรันคำสั่ง Docker workflow ด้านบน

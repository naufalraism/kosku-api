# KosKu API

Backend for a boarding-house (kost) management system: admin login, rooms, tenants, and (next) monthly invoices.

**Stack:** NestJS, TypeORM, PostgreSQL, JWT auth. Frontend (React + TypeScript) and AWS deployment come in later weeks.

## Run locally

```bash
cp .env.example .env        # then set a real JWT_SECRET
docker compose up -d        # starts PostgreSQL
npm install
npm run start:dev           # http://localhost:3000
```

## API (all routes except /auth/* require `Authorization: Bearer <token>`)

| Method | Route | Description |
|---|---|---|
| POST | /auth/register | Create the first admin (only works once) |
| POST | /auth/login | Returns `{ accessToken }` |
| GET/POST | /rooms | List / create rooms |
| GET/PATCH/DELETE | /rooms/:id | Read / update / delete a room |
| GET/POST | /tenants | List / create tenants (assigning a room marks it occupied) |
| GET/PATCH/DELETE | /tenants/:id | Read / update / delete a tenant (changing or removing the room frees the old one) |

## Try it

```bash
curl -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}'

TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

curl -X POST localhost:3000/rooms -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"number":"A1","price":1500000}'
```
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/a911bdee-8402-4fde-a1b1-09acacc110d2" />

## Notes

- `synchronize: true` is for development only; switch to migrations before deploying.
- Use dummy data for any public demo.

## Tests

```bash
npm test
```

Unit tests cover invoice generation and payment rules (Jest + ts-jest). The test script runs Jest with `--experimental-vm-modules` so it can load NestJS 12's ES-module packages.

## Roadmap

- [x] Week 1: auth, rooms, tenants
- [x] Week 2: invoices (monthly generation, paid/unpaid), tests
- [ ] Week 3: React + TypeScript frontend
- [ ] Week 4: AWS deployment, CI/CD

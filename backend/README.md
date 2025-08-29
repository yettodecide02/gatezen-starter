# GateZen Backend (Express)

## Quick Start
```bash
cd backend
cp .env.example .env
npm install
npm run dev
# server on http://localhost:4000
```

## Routes
- POST `/auth/login` { email } -> { token, user }
- GET `/announcements`
- GET `/payments` | POST `/payments/pay` { id }
- GET `/maintenance` | POST `/maintenance` | PATCH `/maintenance/:id`
- GET `/bookings` | POST `/bookings` | PATCH `/bookings/:id`
- GET `/visitors` | POST `/visitors` | PATCH `/visitors/:id`
- GET `/documents`
- GET `/users` | POST `/users`

// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuid } from 'uuid';

dotenv.config();

const app = express();

// CORS + JSON
app.use(cors());                // open CORS for local dev
app.use(express.json());        // parse JSON bodies

// ---------- Tiny helpers ----------
const nowISO = () => new Date().toISOString();

// ---------- In-memory DB (replace with a real DB in prod) ----------
const db = {
  users: [
    {
      id: 'u1',
      name: 'Admin',
      email: 'admin@gatezen.app',
      role: 'admin',          // 'admin' | 'staff' | 'resident'
      status: 'active',       // 'active' | 'inactive'
      verified: true,
      createdAt: nowISO()
    },
    {
      id: 'u2',
      name: 'John Resident',
      email: 'john@example.com',
      role: 'resident',
      status: 'active',
      verified: true,
      createdAt: nowISO()
    },
    {
      id: 'u3',
      name: 'Gate Staff',
      email: 'gate@example.com',
      role: 'staff',
      status: 'inactive',
      verified: false,
      createdAt: nowISO()
    }
  ],
  announcements: [
    { id: uuid(), title: 'Water Tank Cleaning', body: 'Scheduled on Saturday 10 AM', createdAt: nowISO() }
  ],
  payments: [
    { id: uuid(), userId: 'u2', description: 'Maintenance July', amount: 1500, status: 'due' }
  ],
  maintenance: [],
  bookings: [],
  visitors: [],
  documents: [{ id: uuid(), name: 'Community Rules.pdf', url: '#' }]
};

// ---------- Health / root ----------
app.get('/', (_req, res) => res.json({ name: 'GateZen API', ok: true, time: nowISO() }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- Auth (simple mock) ----------
app.post('/auth/login', (req, res) => {
  const { email } = req.body || {};
  const user = db.users.find(u => u.email === email) || db.users[0]; // fallback for demo
  return res.json({ token: 'mock-token', user });
});
// --- AUTH: REGISTER ---
app.post('/auth/register', (req, res) => {
  const { name, email, password, role = 'resident' } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  // unique email check
  const exists = db.users.some(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const user = {
    id: uuid(),
    name,
    email,
    role,             // resident | staff | admin (default: resident)
    status: 'inactive',
    verified: false,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);

  // In a real app you’d hash password & send verify email.
  return res.status(201).json({
    message: 'Registered. Await verification/activation by admin.',
    user,
    token: 'mock-token' // return token if you want immediate login
  });
});

// ===================================================================
//                           USERS (Admin 2.3)
// ===================================================================

// GET /users?role=&status=&q=&verified=
app.get('/users', (req, res) => {
  const { role, status, q, verified } = req.query;
  let list = [...db.users];

  if (role && role !== 'all') list = list.filter(u => u.role === role);
  if (status && status !== 'all') list = list.filter(u => u.status === status);
  if (typeof verified !== 'undefined' && verified !== 'all') {
    const v = verified === 'true';
    list = list.filter(u => u.verified === v);
  }
  if (q) {
    const term = String(q).toLowerCase();
    list = list.filter(
      u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );
  }
  // newest first
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// POST /users  (create)
app.post('/users', (req, res) => {
  const { name, email, role = 'resident', status = 'inactive', verified = false } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

  const exists = db.users.some(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already exists' });

  const user = {
    id: uuid(),
    name,
    email,
    role,
    status,
    verified,
    createdAt: nowISO()
  };
  db.users.push(user);
  res.status(201).json(user);
});

// PATCH /users/:id  (edit allowed fields)
app.patch('/users/:id', (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });

  const allowed = ['name', 'email', 'role', 'status', 'verified'];
  for (const k of allowed) if (k in req.body) u[k] = req.body[k];
  res.json(u);
});

// POST /users/:id/verify
app.post('/users/:id/verify', (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.verified = true;
  if (u.status === 'inactive') u.status = 'active';
  res.json(u);
});

// POST /users/:id/toggle  (activate/deactivate)
app.post('/users/:id/toggle', (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.status = u.status === 'active' ? 'inactive' : 'active';
  res.json(u);
});

// DELETE /users/:id
app.delete('/users/:id', (req, res) => {
  const i = db.users.findIndex(x => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'User not found' });
  const [removed] = db.users.splice(i, 1);
  res.json(removed);
});

// ===================================================================
//                       OTHER EXISTING DEMO ROUTES
// ===================================================================

// Announcements
app.get('/announcements', (_req, res) => res.json(db.announcements));

// Payments
app.get('/payments', (_req, res) => res.json(db.payments));
app.post('/payments/pay', (req, res) => {
  const { id } = req.body || {};
  const p = db.payments.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  p.status = 'paid';
  p.paidAt = nowISO();
  res.json(p);
});

// Maintenance
app.get('/maintenance', (_req, res) => res.json(db.maintenance));
app.post('/maintenance', (req, res) => {
  const ticket = { id: uuid(), status: 'submitted', createdAt: nowISO(), ...req.body };
  db.maintenance.push(ticket);
  res.status(201).json(ticket);
});
app.patch('/maintenance/:id', (req, res) => {
  const t = db.maintenance.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  Object.assign(t, req.body);
  res.json(t);
});

// Bookings
app.get('/bookings', (_req, res) => res.json(db.bookings));
app.post('/bookings', (req, res) => {
  const booking = { id: uuid(), status: 'pending', createdAt: nowISO(), ...req.body };
  db.bookings.push(booking);
  res.status(201).json(booking);
});
app.patch('/bookings/:id', (req, res) => {
  const b = db.bookings.find(x => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  Object.assign(b, req.body);
  res.json(b);
});

// Visitors
app.get('/visitors', (_req, res) => res.json(db.visitors));
app.post('/visitors', (req, res) => {
  const v = { id: uuid(), status: 'pre-authorized', createdAt: nowISO(), ...req.body };
  db.visitors.push(v);
  res.status(201).json(v);
});
app.patch('/visitors/:id', (req, res) => {
  const v = db.visitors.find(x => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  Object.assign(v, req.body);
  res.json(v);
});

// Documents
app.get('/documents', (_req, res) => res.json(db.documents));

// ---------- Start server ----------
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`GateZen backend running on http://localhost:${port}`);
});

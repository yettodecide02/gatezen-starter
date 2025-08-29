// frontend/src/lib/auth.js
const KEY = 'user';

export function setUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  localStorage.removeItem(KEY);
}

export function isAuthed() {
  return !!getUser();
}

export function isAdmin() {
  const u = getUser();
  return !!u && u.role === 'admin';
}

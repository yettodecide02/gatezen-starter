const KEY = "user";
import Cookies from "js-cookie";

export function setUser(user) {
  Cookies.set(KEY, JSON.stringify(user), { expires: 30 });
}

export function setToken(token) {
  Cookies.set("token", token, { expires: 30 });
}

export function getToken() {
  return Cookies.get("token") || null;
}

export function getUser() {
  try {
    const raw = Cookies.get(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  Cookies.remove(KEY);
  Cookies.remove("token");
}

export function isAuthed() {
  return !!getUser();
}

export function isAdmin() {
  const u = getUser();
  return !!u && u.role === "ADMIN";
}

export function isGatekeeper() {
  const u = getUser();
  return !!u && u.role === "GATEKEEPER";
}

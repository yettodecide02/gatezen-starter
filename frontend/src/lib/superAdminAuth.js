import Cookies from "js-cookie";

const SA_KEY = "sa_user";
const SA_TOKEN_KEY = "sa_token";

export function setSAUser(user) {
  Cookies.set(SA_KEY, JSON.stringify(user), { expires: 1 });
}

export function getSAUser() {
  try {
    const raw = Cookies.get(SA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSAToken(token) {
  Cookies.set(SA_TOKEN_KEY, token, { expires: 1 });
}

export function getSAToken() {
  return Cookies.get(SA_TOKEN_KEY) || null;
}

export function clearSA() {
  Cookies.remove(SA_KEY);
  Cookies.remove(SA_TOKEN_KEY);
}

export function isSAAuthed() {
  return !!getSAUser() && !!getSAToken();
}

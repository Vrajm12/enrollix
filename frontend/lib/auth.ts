import { User } from "./types";

const TOKEN_KEY = "education_crm_token";
const USER_KEY = "education_crm_user";

export const saveSession = (token: string, user: User) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const getUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

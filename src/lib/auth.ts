import { User } from "@/types";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const USERS_KEY = "ai_quiz_users";
const CURRENT_USER_KEY = "ai_quiz_current_user";

export function validateStrictPassword(password: string): { valid: boolean; message: string } {
  if (password.length !== 8) {
    return {
      valid: false,
      message: "Password must be strictly 8 characters long (exact length: 8).",
    };
  }
  return { valid: true, message: "" };
}

export function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveUsers(users: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  const pwdCheck = validateStrictPassword(password);
  if (!pwdCheck.valid) {
    return { success: false, message: pwdCheck.message };
  }

  const users = getUsers();
  const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    return { success: false, message: "Email already registered" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: uuidv4(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: "student",
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  const { password: _, ...safeUser } = newUser;
  setCurrentUser(safeUser as User);

  return { success: true, message: "Registration successful", user: safeUser as User };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  const pwdCheck = validateStrictPassword(password);
  if (!pwdCheck.valid) {
    return { success: false, message: pwdCheck.message };
  }

  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    return { success: false, message: "Invalid email or password" };
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return { success: false, message: "Invalid email or password" };
  }

  const { password: _, ...safeUser } = user;
  safeUser.role = "student";
  setCurrentUser(safeUser as User);

  return { success: true, message: "Login successful", user: safeUser as User };
}

export function logoutUser() {
  setCurrentUser(null);
}

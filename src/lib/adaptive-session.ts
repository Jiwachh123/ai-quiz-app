import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";

// Local development only: a random secret that is never stored in the code.
// Kept on globalThis so that hot reloads do not invalidate a running quiz.
const devGlobal = globalThis as typeof globalThis & { quizDevSecret?: string };

function getSecret(): string {
  const secret = process.env.QUIZ_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("QUIZ_SESSION_SECRET must be set to at least 32 characters");
  }

  devGlobal.quizDevSecret ??= randomBytes(32).toString("hex");
  return devGlobal.quizDevSecret;
}

function getKey(): Buffer {
  return createHash("sha256").update(getSecret()).digest();
}

export function encryptSession(data: unknown): string {
  const key = getKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptSession<T>(token: string): T {
  const key = getKey();
  const packed = Buffer.from(token, "base64url");

  if (packed.length < 29) {
    throw new Error("Invalid session token");
  }

  const iv = packed.subarray(0, 12);
  const authTag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}

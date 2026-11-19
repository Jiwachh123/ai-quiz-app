import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const FALLBACK_SECRET = "adaptive-quiz-application-default-32-byte-secret-key-2026";

function getKey(): Buffer {
  const secret =
    process.env.QUIZ_SESSION_SECRET && process.env.QUIZ_SESSION_SECRET.length >= 16
      ? process.env.QUIZ_SESSION_SECRET
      : FALLBACK_SECRET;

  return createHash("sha256").update(secret).digest();
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

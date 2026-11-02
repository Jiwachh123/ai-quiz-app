
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.QUIZ_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("QUIZ_SESSION_SECRET is missing or too short");
  }

  // Derive a 32-byte encryption key from your secret.
  const { createHash } = require("crypto");
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

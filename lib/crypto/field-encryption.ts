import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let cachedKeys: { cipherKey: Buffer; hmacKey: Buffer } | null = null;

function deriveKeys(): { cipherKey: Buffer; hmacKey: Buffer } {
  if (cachedKeys) return cachedKeys;

  const masterKeyBase64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!masterKeyBase64) {
    throw new Error("FIELD_ENCRYPTION_KEY is not set.");
  }

  const masterKey = Buffer.from(masterKeyBase64, "base64");
  if (masterKey.length !== KEY_LENGTH) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  const cipherKey = Buffer.from(
    hkdfSync(
      "sha256",
      masterKey,
      Buffer.alloc(0),
      "field-encryption:cipher",
      KEY_LENGTH,
    ),
  );
  const hmacKey = Buffer.from(
    hkdfSync(
      "sha256",
      masterKey,
      Buffer.alloc(0),
      "field-encryption:hmac",
      KEY_LENGTH,
    ),
  );

  cachedKeys = { cipherKey, hmacKey };
  return cachedKeys;
}

function encryptWithIv(plaintext: string, iv: Buffer): string {
  const { cipherKey } = deriveKeys();
  const cipher = createCipheriv(ALGORITHM, cipherKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

function decrypt(stored: string): string {
  const { cipherKey } = deriveKeys();
  const buffer = Buffer.from(stored, "base64");
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, cipherKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  return encryptWithIv(value, randomBytes(IV_LENGTH));
}

export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return stored ?? null;

  try {
    return decrypt(stored);
  } catch {
    return stored;
  }
}

export function encryptDescription(value: string): string {
  const { hmacKey } = deriveKeys();
  const iv = createHmac("sha256", hmacKey)
    .update(value, "utf8")
    .digest()
    .subarray(0, IV_LENGTH);

  return encryptWithIv(value, iv);
}

export const decryptDescription = decryptField;

export function isAlreadyEncrypted(stored: string | null | undefined): boolean {
  if (!stored) return false;
  return decryptField(stored) !== stored;
}

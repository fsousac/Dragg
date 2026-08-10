import { randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_KEY = process.env.FIELD_ENCRYPTION_KEY;

function setKey(key: string | undefined) {
  if (key === undefined) {
    delete process.env.FIELD_ENCRYPTION_KEY;
  } else {
    process.env.FIELD_ENCRYPTION_KEY = key;
  }
}

async function importFresh() {
  vi.resetModules();
  return import("@/lib/crypto/field-encryption");
}

describe("field-encryption", () => {
  beforeEach(() => {
    setKey(randomBytes(32).toString("base64"));
  });

  afterEach(() => {
    setKey(ORIGINAL_KEY);
  });

  describe("encryptField/decryptField", () => {
    it("round-trips a value", async () => {
      const { encryptField, decryptField } = await importFresh();
      const stored = encryptField("segredo do usuário");
      expect(stored).not.toBe("segredo do usuário");
      expect(decryptField(stored)).toBe("segredo do usuário");
    });

    it("produces different ciphertext for the same plaintext (random IV)", async () => {
      const { encryptField } = await importFresh();
      const a = encryptField("mesmo texto");
      const b = encryptField("mesmo texto");
      expect(a).not.toBe(b);
    });

    it("returns null for null, undefined, and empty string input", async () => {
      const { encryptField } = await importFresh();
      expect(encryptField(null)).toBeNull();
      expect(encryptField(undefined)).toBeNull();
      expect(encryptField("")).toBeNull();
    });

    it("returns null/empty unchanged when decrypting null-ish stored values", async () => {
      const { decryptField } = await importFresh();
      expect(decryptField(null)).toBeNull();
      expect(decryptField(undefined)).toBeNull();
      expect(decryptField("")).toBe("");
    });

    it("falls back to the original value when it is not valid ciphertext (legacy plaintext)", async () => {
      const { decryptField } = await importFresh();
      expect(decryptField("plain legacy text")).toBe("plain legacy text");
    });

    it("throws when the key is missing", async () => {
      setKey(undefined);
      const { encryptField } = await importFresh();
      expect(() => encryptField("value")).toThrow(/FIELD_ENCRYPTION_KEY/);
    });

    it("throws when the key is not a base64-encoded 32-byte value", async () => {
      setKey(Buffer.from("too-short").toString("base64"));
      const { encryptField } = await importFresh();
      expect(() => encryptField("value")).toThrow(/32-byte/);
    });
  });

  describe("encryptDescription/decryptDescription", () => {
    it("round-trips a value", async () => {
      const { encryptDescription, decryptDescription } = await importFresh();
      const stored = encryptDescription("Supermercado");
      expect(decryptDescription(stored)).toBe("Supermercado");
    });

    it("is deterministic: same plaintext always encrypts to the same ciphertext", async () => {
      const { encryptDescription } = await importFresh();
      const a = encryptDescription("Netflix");
      const b = encryptDescription("Netflix");
      expect(a).toBe(b);
    });

    it("produces different ciphertext for different plaintext", async () => {
      const { encryptDescription } = await importFresh();
      const a = encryptDescription("Netflix");
      const b = encryptDescription("Spotify");
      expect(a).not.toBe(b);
    });
  });

  describe("isAlreadyEncrypted", () => {
    it("returns true for a value produced by encryptField", async () => {
      const { encryptField, isAlreadyEncrypted } = await importFresh();
      const stored = encryptField("valor");
      expect(isAlreadyEncrypted(stored)).toBe(true);
    });

    it("returns true for a value produced by encryptDescription", async () => {
      const { encryptDescription, isAlreadyEncrypted } = await importFresh();
      const stored = encryptDescription("valor");
      expect(isAlreadyEncrypted(stored)).toBe(true);
    });

    it("returns false for legacy plaintext", async () => {
      const { isAlreadyEncrypted } = await importFresh();
      expect(isAlreadyEncrypted("plain text")).toBe(false);
    });

    it("returns false for null/undefined/empty", async () => {
      const { isAlreadyEncrypted } = await importFresh();
      expect(isAlreadyEncrypted(null)).toBe(false);
      expect(isAlreadyEncrypted(undefined)).toBe(false);
      expect(isAlreadyEncrypted("")).toBe(false);
    });
  });
});

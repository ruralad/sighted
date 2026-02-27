/**
 * End-to-end encryption primitives using the Web Crypto API.
 *
 * Key exchange: ECDH P-256
 * Symmetric encryption: AES-256-GCM (128-bit auth tag, 96-bit IV)
 * Key derivation: HKDF-SHA-256
 *
 * Private keys never leave the browser. The server only stores ciphertext + IV.
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const AES_KEY_LENGTH = 256;
const IV_BYTES = 12;
const HKDF_INFO = new TextEncoder().encode("sighted75-e2e-chat");
const HKDF_SALT = new Uint8Array(32); // zero-salt is fine when input keying material is already high-entropy ECDH output

// ── Key Generation ───────────────────────────────────────────

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveBits"]);
}

export async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

// ── Key Export / Import ──────────────────────────────────────

export async function exportPublicKeyJwk(
  key: CryptoKey,
): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function exportPrivateKeyJwk(
  key: CryptoKey,
): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKeyJwk(
  jwk: JsonWebKey,
): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDH_PARAMS, true, []);
}

export async function importPrivateKeyJwk(
  jwk: JsonWebKey,
): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDH_PARAMS, true, [
    "deriveBits",
  ]);
}

export async function exportSymmetricKeyRaw(
  key: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

export async function importSymmetricKeyRaw(
  raw: ArrayBuffer,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

// ── ECDH + HKDF ─────────────────────────────────────────────

export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    bits,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: HKDF_SALT, info: HKDF_INFO },
    hkdfKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

// ── AES-256-GCM Encrypt / Decrypt ───────────────────────────

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoded,
  );

  return {
    ciphertext: bufToBase64(ciphertextBuf),
    iv: bufToBase64(iv),
  };
}

export async function decrypt(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const ciphertextBuf = base64ToBuf(ciphertext);
  const ivBuf = base64ToBuf(iv);

  const plaintextBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuf },
    key,
    ciphertextBuf,
  );

  return new TextDecoder().decode(plaintextBuf);
}

// ── Envelope encryption (wrap/unwrap a symmetric key for a recipient) ──

export async function wrapKey(
  symmetricKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<EncryptedPayload> {
  const raw = await exportSymmetricKeyRaw(symmetricKey);
  const rawStr = bufToBase64(raw);
  return encrypt(wrappingKey, rawStr);
}

export async function unwrapKey(
  payload: EncryptedPayload,
  unwrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const rawStr = await decrypt(unwrappingKey, payload.ciphertext, payload.iv);
  const raw = base64ToBuf(rawStr);
  return importSymmetricKeyRaw(raw);
}

// ── Base64 helpers ───────────────────────────────────────────

export function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

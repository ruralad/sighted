"use client";

import { create } from "zustand";
import { get, set } from "idb-keyval";
import {
  generateKeyPair,
  exportPublicKeyJwk,
  exportPrivateKeyJwk,
  importPublicKeyJwk,
  importPrivateKeyJwk,
  deriveSharedSecret,
  type EncryptedPayload,
  unwrapKey,
} from "@/lib/crypto/e2e";

const KEYPAIR_KEY = "sighted75:chat-keypair";

interface StoredKeyPair {
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  keyId: string;
}

interface ChatCryptoStore {
  keyId: string | null;
  publicJwk: JsonWebKey | null;
  privateKey: CryptoKey | null;
  publicKey: CryptoKey | null;
  ready: boolean;

  hydrate: () => Promise<void>;

  getDmKey: (peerPublicJwk: JsonWebKey) => Promise<CryptoKey>;
  getRoomKey: (
    encryptedRoomKey: EncryptedPayload,
    peerPublicJwk: JsonWebKey,
  ) => Promise<CryptoKey>;
}

const dmKeyCache = new Map<string, CryptoKey>();

function jwkCacheKey(jwk: JsonWebKey): string {
  return `${jwk.x}:${jwk.y}`;
}

let hydrated = false;

export const useChatCryptoStore = create<ChatCryptoStore>((setState, getState) => ({
  keyId: null,
  publicJwk: null,
  privateKey: null,
  publicKey: null,
  ready: false,

  hydrate: async () => {
    if (hydrated) return;
    hydrated = true;

    const stored = await get<StoredKeyPair>(KEYPAIR_KEY);

    if (stored) {
      const [pubKey, privKey] = await Promise.all([
        importPublicKeyJwk(stored.publicJwk),
        importPrivateKeyJwk(stored.privateJwk),
      ]);
      setState({
        keyId: stored.keyId,
        publicJwk: stored.publicJwk,
        publicKey: pubKey,
        privateKey: privKey,
        ready: true,
      });
      return;
    }

    const kp = await generateKeyPair();
    const pubJwk = await exportPublicKeyJwk(kp.publicKey);
    const privJwk = await exportPrivateKeyJwk(kp.privateKey);
    const keyId = crypto.randomUUID();

    await set(KEYPAIR_KEY, { publicJwk: pubJwk, privateJwk: privJwk, keyId } satisfies StoredKeyPair);

    setState({
      keyId,
      publicJwk: pubJwk,
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      ready: true,
    });
  },

  getDmKey: async (peerPublicJwk: JsonWebKey) => {
    const cacheId = jwkCacheKey(peerPublicJwk);
    const cached = dmKeyCache.get(cacheId);
    if (cached) return cached;

    const { privateKey } = getState();
    if (!privateKey) throw new Error("Key pair not initialized");

    const peerPub = await importPublicKeyJwk(peerPublicJwk);
    const shared = await deriveSharedSecret(privateKey, peerPub);
    dmKeyCache.set(cacheId, shared);
    return shared;
  },

  getRoomKey: async (
    encryptedRoomKey: EncryptedPayload,
    peerPublicJwk: JsonWebKey,
  ) => {
    const dmKey = await getState().getDmKey(peerPublicJwk);
    return unwrapKey(encryptedRoomKey, dmKey);
  },
}));

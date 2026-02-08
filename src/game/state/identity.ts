"use client";

import { db, type IdentityRecord } from "./db";

export type Identity = {
  userId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: number;
};

const IDENTITY_KEY = "primary";
const EXPORT_VERSION = 1;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(data: string) {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const base64 = padded + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeString(value: string) {
  return toBase64Url(new TextEncoder().encode(value));
}

function decodeString(value: string) {
  return new TextDecoder().decode(fromBase64Url(value));
}

async function deriveUserIdFromPublicKey(publicKey: CryptoKey) {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", spki);
  return toBase64Url(new Uint8Array(hashBuffer));
}

async function generateIdentity(): Promise<IdentityRecord> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  const userId = await deriveUserIdFromPublicKey(keyPair.publicKey);
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    key: IDENTITY_KEY,
    userId,
    publicKeyJwk,
    privateKeyJwk,
    createdAt: Date.now(),
  };
}

export async function getOrCreateIdentity(): Promise<Identity> {
  const existing = await db.identity.get(IDENTITY_KEY);
  if (existing) {
    const { key: _key, ...rest } = existing;
    return rest;
  }

  const created = await generateIdentity();
  await db.identity.put(created);
  const { key: _key, ...rest } = created;
  return rest;
}

type IdentityExportPayload = {
  v: number;
  userId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: number;
};

function assertIdentityPayload(payload: unknown): asserts payload is IdentityExportPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid identity payload.");
  }
  const candidate = payload as IdentityExportPayload;
  if (candidate.v !== EXPORT_VERSION) {
    throw new Error("Unsupported identity version.");
  }
  if (!candidate.userId || typeof candidate.userId !== "string") {
    throw new Error("Invalid userId.");
  }
  if (!candidate.publicKeyJwk || typeof candidate.publicKeyJwk !== "object") {
    throw new Error("Invalid public key.");
  }
  if (!candidate.privateKeyJwk || typeof candidate.privateKeyJwk !== "object") {
    throw new Error("Invalid private key.");
  }
  if (typeof candidate.createdAt !== "number" || !Number.isFinite(candidate.createdAt)) {
    throw new Error("Invalid createdAt.");
  }
}

export async function exportIdentity(): Promise<string> {
  const identity = await getOrCreateIdentity();
  const payload: IdentityExportPayload = {
    v: EXPORT_VERSION,
    userId: identity.userId,
    publicKeyJwk: identity.publicKeyJwk,
    privateKeyJwk: identity.privateKeyJwk,
    createdAt: identity.createdAt,
  };
  return encodeString(JSON.stringify(payload));
}

export async function importIdentity(exportString: string): Promise<Identity> {
  if (!exportString || typeof exportString !== "string") {
    throw new Error("No identity provided.");
  }
  const decoded = decodeString(exportString.trim());
  const parsed = JSON.parse(decoded) as unknown;
  assertIdentityPayload(parsed);

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    parsed.publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );

  const derivedUserId = await deriveUserIdFromPublicKey(publicKey);
  if (derivedUserId !== parsed.userId) {
    throw new Error("Identity data is corrupted or mismatched.");
  }

  const record: IdentityRecord = {
    key: IDENTITY_KEY,
    userId: parsed.userId,
    publicKeyJwk: parsed.publicKeyJwk,
    privateKeyJwk: parsed.privateKeyJwk,
    createdAt: parsed.createdAt,
  };

  await db.transaction("rw", db.identity, async () => {
    await db.identity.clear();
    await db.identity.put(record);
  });

  const { key: _key, ...rest } = record;
  return rest;
}

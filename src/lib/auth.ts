/**
 * Authentification simplifiée par mot de passe partagé.
 *
 * • `APP_PASSWORD` définit le mot de passe. Si la variable est absente ou vide,
 *   l'application reste ouverte (mode développement).
 * • `AUTH_SECRET` (optionnel) durcit la signature du cookie. Par défaut la clé
 *   est dérivée du mot de passe : en changer déconnecte tout le monde.
 * • Le cookie est signé en HMAC-SHA256, HttpOnly, SameSite=Lax, 30 jours.
 *
 * Ce module n'utilise que l'API Web Crypto : il fonctionne aussi bien dans le
 * middleware (runtime edge) que dans les routes serveur Node.
 */

export const SESSION_COOKIE = 'fromagerie_session';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours

export function appPassword(): string {
  return (process.env.APP_PASSWORD ?? '').trim();
}

/** Vrai si la protection par mot de passe est active. */
export function authEnabled(): boolean {
  return appPassword().length > 0;
}

function secret(): string {
  const dedicated = (process.env.AUTH_SECRET ?? '').trim();
  if (dedicated) return dedicated;
  return `fromagerie-caprine::${appPassword()}`;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** Crée un jeton de session signé, valable `ttlSeconds` secondes. */
export async function createSessionToken(ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        exp: Date.now() + ttlSeconds * 1000,
        nonce: crypto.randomUUID(),
      }),
    ),
  );
  return `${payload}.${await sign(payload)}`;
}

/** Vérifie la signature et la date d'expiration d'un jeton. */
export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  try {
    const expected = await sign(payload);
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    if (diff !== 0) return false;
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as {
      exp?: number;
    };
    return typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

/** Compare le mot de passe fourni à `APP_PASSWORD` sans fuite de durée notable. */
export function passwordMatches(candidate: string): boolean {
  const expected = appPassword();
  if (!expected) return true;
  const a = encoder.encode(candidate);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export const SESSION_MAX_AGE = DEFAULT_TTL_SECONDS;

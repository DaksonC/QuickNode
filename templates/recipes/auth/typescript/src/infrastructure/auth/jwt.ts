import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * JSON Web Tokens signed with HMAC-SHA256 (HS256), using only node:crypto.
 * Only HS256 is accepted, so a token cannot pick a weaker algorithm ("none").
 */
export interface TokenClaims {
  /** Subject: who the token is about, usually the user id. */
  sub: string;
  [claim: string]: unknown;
}

export interface TokenPayload extends TokenClaims {
  /** Issued at and expiration, in seconds since the epoch. */
  iat: number;
  exp: number;
}

export class InvalidTokenError extends Error {
  constructor(reason: string) {
    super(`Invalid token: ${reason}`);
    this.name = 'InvalidTokenError';
  }
}

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const MIN_SECRET_LENGTH = 32;

const sign = (data: string, secret: string) =>
  createHmac('sha256', secret).update(data).digest('base64url');

/** Rejects missing, placeholder or short secrets before any token is handled. */
export function assertSecret(secret: string | undefined): string {
  if (!secret || secret === 'change-me' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set to a random value of at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
  return secret;
}

export function signToken(
  claims: TokenClaims,
  secret: string,
  expiresInSeconds = 3600,
  now = Date.now()
): string {
  const iat = Math.floor(now / 1000);
  const payload: TokenPayload = { ...claims, iat, exp: iat + expiresInSeconds };
  const body = `${HEADER}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${body}.${sign(body, assertSecret(secret))}`;
}

export function verifyToken(token: string, secret: string, now = Date.now()): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new InvalidTokenError('malformed');
  const [header, payload, signature] = parts;
  if (header !== HEADER) throw new InvalidTokenError('unsupported header');

  const expected = Buffer.from(sign(`${header}.${payload}`, assertSecret(secret)));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new InvalidTokenError('bad signature');
  }

  let claims: TokenPayload;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidTokenError('malformed payload');
  }
  if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number') {
    throw new InvalidTokenError('missing claims');
  }
  if (claims.exp <= Math.floor(now / 1000)) throw new InvalidTokenError('expired');
  return claims;
}

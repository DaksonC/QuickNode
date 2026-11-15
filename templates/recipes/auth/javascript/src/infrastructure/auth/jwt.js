const { createHmac, timingSafeEqual } = require('node:crypto');

/**
 * JSON Web Tokens signed with HMAC-SHA256 (HS256), using only node:crypto.
 * Only HS256 is accepted, so a token cannot pick a weaker algorithm ("none").
 */
class InvalidTokenError extends Error {
  constructor(reason) {
    super(`Invalid token: ${reason}`);
    this.name = 'InvalidTokenError';
  }
}

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const MIN_SECRET_LENGTH = 32;

const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

/** Rejects missing, placeholder or short secrets before any token is handled. */
function assertSecret(secret) {
  if (!secret || secret === 'change-me' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set to a random value of at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
  return secret;
}

/** Signs `claims` (with at least `sub`) for `expiresInSeconds`. */
function signToken(claims, secret, expiresInSeconds = 3600, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const payload = { ...claims, iat, exp: iat + expiresInSeconds };
  const body = `${HEADER}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${body}.${sign(body, assertSecret(secret))}`;
}

/** Returns the claims of a valid token; throws InvalidTokenError otherwise. */
function verifyToken(token, secret, now = Date.now()) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new InvalidTokenError('malformed');
  const [header, payload, signature] = parts;
  if (header !== HEADER) throw new InvalidTokenError('unsupported header');

  const expected = Buffer.from(sign(`${header}.${payload}`, assertSecret(secret)));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new InvalidTokenError('bad signature');
  }

  let claims;
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

module.exports = { InvalidTokenError, assertSecret, signToken, verifyToken };

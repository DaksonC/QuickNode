const assert = require('node:assert/strict');
const { InvalidTokenError, signToken, verifyToken } = require('../../infrastructure/auth/jwt');

const SECRET = 'a-test-secret-that-is-long-enough-123456';

describe('JWT (HS256)', () => {
  it('signs and verifies a token', () => {
    const token = signToken({ sub: 'user-1', role: 'admin' }, SECRET);

    const claims = verifyToken(token, SECRET);

    assert.equal(claims.sub, 'user-1');
    assert.equal(claims.role, 'admin');
  });

  it('rejects a token signed with another secret', () => {
    const token = signToken({ sub: 'user-1' }, `${SECRET}-other`);

    assert.throws(() => verifyToken(token, SECRET), InvalidTokenError);
  });

  it('rejects an expired token', () => {
    const token = signToken({ sub: 'user-1' }, SECRET, 60, Date.now() - 120_000);

    assert.throws(() => verifyToken(token, SECRET), /expired/);
  });

  it('rejects a tampered payload', () => {
    const [header, , signature] = signToken({ sub: 'user-1' }, SECRET).split('.');
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9e9 })).toString('base64url');

    assert.throws(
      () => verifyToken(`${header}.${payload}.${signature}`, SECRET),
      InvalidTokenError
    );
  });

  it('refuses weak secrets', () => {
    assert.throws(() => signToken({ sub: 'user-1' }, 'change-me'), /JWT_SECRET/);
  });
});

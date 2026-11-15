const assert = require('node:assert/strict');
const { rateLimit } = require('../../infrastructure/middleware/rate-limit');

function call(middleware, ip = '127.0.0.1') {
  const result = { status: 200, headers: {}, nextCalled: false };
  const res = {
    setHeader: (name, value) => (result.headers[name] = value),
    status: code => {
      result.status = code;
      return { json: () => undefined };
    },
  };
  const next = () => {
    result.nextCalled = true;
  };
  middleware({ ip }, res, next);
  return result;
}

describe('rateLimit', () => {
  it('lets requests through up to the limit, then answers 429', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 2, now: () => 0 });

    assert.equal(call(middleware).nextCalled, true);
    assert.equal(call(middleware).nextCalled, true);
    const blocked = call(middleware);

    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers['Retry-After'], '1');
  });

  it('counts each client separately and starts again after the window', () => {
    let time = 0;
    const middleware = rateLimit({ windowMs: 1000, max: 1, now: () => time });

    call(middleware, '10.0.0.1');
    assert.equal(call(middleware, '10.0.0.2').nextCalled, true);
    assert.equal(call(middleware, '10.0.0.1').status, 429);

    time = 1000;
    assert.equal(call(middleware, '10.0.0.1').nextCalled, true);
  });
});

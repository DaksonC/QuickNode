import assert from 'node:assert/strict';
import { NextFunction, Request, Response } from 'express';
import { rateLimit } from '../../infrastructure/middleware/rate-limit';

function call(middleware: ReturnType<typeof rateLimit>, ip = '127.0.0.1') {
  const result = { status: 200, headers: {} as Record<string, string>, nextCalled: false };
  const res = {
    setHeader: (name: string, value: string) => (result.headers[name] = value),
    status: (code: number) => {
      result.status = code;
      return { json: () => undefined };
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    result.nextCalled = true;
  };
  middleware({ ip } as Request, res, next);
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

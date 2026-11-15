import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { registerGracefulShutdown } from '../../infrastructure/http/graceful-shutdown';

const silent = { info: () => undefined, error: () => undefined };

describe('registerGracefulShutdown', () => {
  it('closes the server, releases resources and exits with 0', async () => {
    const server = createServer();
    await new Promise<void>(resolve => server.listen(0, resolve));
    const calls: string[] = [];

    const shutdown = registerGracefulShutdown(server, {
      logger: silent,
      signals: [],
      onShutdown: async () => {
        calls.push('released');
      },
      exit: code => calls.push(`exit ${code}`),
    });
    await shutdown('SIGTERM');

    assert.equal(server.listening, false);
    assert.deepEqual(calls, ['released', 'exit 0']);
  });

  it('exits with 1 when releasing resources fails', async () => {
    const server = createServer();
    await new Promise<void>(resolve => server.listen(0, resolve));
    const codes: number[] = [];

    const shutdown = registerGracefulShutdown(server, {
      logger: silent,
      signals: [],
      onShutdown: () => Promise.reject(new Error('database is gone')),
      exit: code => codes.push(code),
    });
    await shutdown('SIGTERM');

    assert.deepEqual(codes, [1]);
  });
});

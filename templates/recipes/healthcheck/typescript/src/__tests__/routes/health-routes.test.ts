import assert from 'node:assert/strict';
import express from 'express';
import { AddressInfo } from 'node:net';
import { createHealthRoutes, HealthCheck } from '../../infrastructure/routes/health-routes';

async function get(checks: Record<string, HealthCheck>, path: string) {
  const app = express();
  app.use('/health', createHealthRoutes(checks));
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    server.close();
  }
}

describe('health routes', () => {
  it('answers liveness without running checks', async () => {
    const { status } = await get(
      { database: () => Promise.reject(new Error('down')) },
      '/health/live'
    );

    assert.equal(status, 200);
  });

  it('is ready only when every check passes', async () => {
    const ok = await get({ database: () => Promise.resolve() }, '/health/ready');
    const failing = await get(
      { database: () => Promise.reject(new Error('down')) },
      '/health/ready'
    );

    assert.equal(ok.status, 200);
    assert.equal(failing.status, 503);
    assert.equal(failing.body.checks.database, 'error');
  });
});

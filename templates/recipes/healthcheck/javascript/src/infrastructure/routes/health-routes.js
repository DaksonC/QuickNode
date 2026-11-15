const { Router } = require('express');

/**
 * Liveness (`/health/live`: the process answers) and readiness
 * (`/health/ready`: every dependency answers, else 503), for orchestrators
 * such as Docker, Kubernetes or a load balancer. `checks` maps a name to an
 * async function that resolves when that dependency is healthy.
 */
function createHealthRoutes(checks) {
  const router = Router();

  router.get('/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', async (_req, res) => {
    const results = {};
    await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        results[name] = await check().then(
          () => 'ok',
          () => 'error'
        );
      })
    );
    const ready = Object.values(results).every(result => result === 'ok');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'error', checks: results });
  });

  return router;
}

module.exports = { createHealthRoutes };

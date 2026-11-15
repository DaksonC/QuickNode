import { Request, Response, Router } from 'express';

/** A dependency check for readiness: resolves when healthy, rejects otherwise. */
export type HealthCheck = () => Promise<unknown>;

/**
 * Liveness (`/health/live`: the process answers) and readiness
 * (`/health/ready`: every dependency answers, else 503), for orchestrators
 * such as Docker, Kubernetes or a load balancer.
 */
export function createHealthRoutes(checks: Record<string, HealthCheck>): Router {
  const router = Router();

  router.get('/live', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', async (_req: Request, res: Response) => {
    const results: Record<string, 'ok' | 'error'> = {};
    await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        results[name] = await check().then(
          () => 'ok' as const,
          () => 'error' as const
        );
      })
    );
    const ready = Object.values(results).every(result => result === 'ok');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'error', checks: results });
  });

  return router;
}

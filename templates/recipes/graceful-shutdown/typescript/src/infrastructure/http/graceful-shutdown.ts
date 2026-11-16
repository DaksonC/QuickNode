import { Server } from 'node:http';

/**
 * Stops the API cleanly on SIGTERM/SIGINT (e.g. `docker stop`, Kubernetes):
 * stop accepting connections, let requests in flight finish, close idle
 * keep-alive connections, release resources (database), then exit. If that
 * takes longer than `timeoutMs`, the process exits with code 1.
 */
export interface ShutdownOptions {
  logger: { info(message: string): void; error(details: object, message: string): void };
  /** Releases resources after the HTTP server closed, e.g. the database. */
  onShutdown?: () => Promise<void>;
  /** SHUTDOWN_TIMEOUT_MS, default 10000. */
  timeoutMs?: number;
  signals?: NodeJS.Signals[];
  exit?: (code: number) => void;
}

export function registerGracefulShutdown(server: Server, options: ShutdownOptions) {
  const { logger, onShutdown, exit = code => process.exit(code) } = options;
  const timeoutMs = options.timeoutMs ?? Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000);
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);

    const timer = setTimeout(() => {
      logger.error({ timeoutMs }, 'Shutdown timed out, forcing exit');
      exit(1);
    }, timeoutMs);
    timer.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      });
      await onShutdown?.();
      clearTimeout(timer);
      logger.info('Shutdown complete');
      exit(0);
    } catch (error) {
      clearTimeout(timer);
      logger.error({ err: error }, 'Shutdown failed');
      exit(1);
    }
  };

  for (const signal of options.signals ?? ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => void shutdown(signal));
  }
  return shutdown;
}

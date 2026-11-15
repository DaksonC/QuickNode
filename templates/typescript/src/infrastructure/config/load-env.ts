/**
 * Loads `.env` into `process.env` with Node's native loader (no dotenv).
 * Import it before anything that reads `process.env`. Variables already set
 * in the environment win, and a missing `.env` is fine: in production the
 * variables are usually injected directly.
 */
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export {};

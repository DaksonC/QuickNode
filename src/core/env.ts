import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Variables that receive a random value in the generated `.env`. */
const SECRET_GENERATORS: Record<string, () => string> = {
  // Hex keeps the password safe to embed in connection URLs.
  DB_PASSWORD: () => randomBytes(24).toString('hex'),
  JWT_SECRET: () => randomBytes(48).toString('base64url')
};

/**
 * Fills the secret variables of an `.env.example` content with random values.
 * Other lines are kept as they are.
 */
export function fillSecrets(exampleContent: string, generators = SECRET_GENERATORS): string {
  return exampleContent
    .split('\n')
    .map((line) => {
      const match = /^([A-Z0-9_]+)=/.exec(line);
      const generate = match && generators[match[1]];
      return generate ? `${match[1]}=${generate()}` : line;
    })
    .join('\n');
}

/**
 * Creates `<projectDir>/.env` from `.env.example` with freshly generated
 * secrets. Does nothing when there is no `.env.example`.
 */
export async function createEnvFile(projectDir: string): Promise<boolean> {
  let example: string;
  try {
    example = await fs.readFile(path.join(projectDir, '.env.example'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  await fs.writeFile(path.join(projectDir, '.env'), fillSecrets(example), { mode: 0o600 });
  return true;
}

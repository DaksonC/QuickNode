import { createInterface } from 'node:readline/promises';

export interface Choice<T> {
  label: string;
  value: T;
}

export interface Prompter {
  /** Asks for free text; `validate` returns an error message or undefined. */
  text(question: string, defaultValue: string, validate?: (value: string) => string | undefined): Promise<string>;
  /** Numbered choice; Enter picks the first option. */
  choose<T>(question: string, choices: Choice<T>[]): Promise<T>;
  close(): void;
}

export class PromptAbortedError extends Error {
  readonly code = 'ABORTED';

  constructor() {
    super('Aborted.');
    this.name = 'PromptAbortedError';
  }
}

/**
 * Minimal prompts on top of readline. Questions go to `output` (stderr by
 * default) so stdout stays reserved for results.
 */
export function createPrompter(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stderr
): Prompter {
  const rl = createInterface({ input, terminal: false });
  // The line iterator buffers input, so answers typed (or pasted) before the
  // question is printed are not lost, unlike rl.question().
  const lines = rl[Symbol.asyncIterator]();

  async function ask(question: string): Promise<string> {
    output.write(question);
    const { value, done } = await lines.next();
    if (done) throw new PromptAbortedError();
    return String(value).trim();
  }

  return {
    async text(question, defaultValue, validate) {
      for (;;) {
        const answer = (await ask(`? ${question} (${defaultValue}) `)) || defaultValue;
        const error = validate?.(answer);
        if (!error) return answer;
        output.write(`  ${error}\n`);
      }
    },

    async choose(question, choices) {
      const options = choices.map((choice, index) => `  ${index + 1}) ${choice.label}${index === 0 ? ' (default)' : ''}`);
      output.write(`? ${question}\n${options.join('\n')}\n`);
      for (;;) {
        const answer = await ask(`  Choose 1-${choices.length}: `);
        if (answer === '') return choices[0].value;
        const index = Number(answer) - 1;
        if (Number.isInteger(index) && choices[index]) return choices[index].value;
        output.write(`  Please type a number from 1 to ${choices.length}.\n`);
      }
    },

    close() {
      rl.close();
    }
  };
}

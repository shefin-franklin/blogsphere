/**
 * Provider-agnostic AI interface. Swap Gemini for OpenAI/Anthropic
 * by implementing this contract. Business logic never changes.
 */
export class AIProvider {
  /** @param {{ model: string, maxRetries: number }} opts */
  constructor(opts) { this.opts = opts; }

  /**
   * Generate text completion.
   * @param {{ prompt: string, system?: string, temperature?: number,
   *           maxTokens?: number, json?: boolean }} params
   * @returns {Promise<string>}
   */
  async generate() { throw new Error('Not implemented'); }

  /**
   * Stream tokens via async generator.
   * @yields {string}
   */
  async *stream() { throw new Error('Not implemented'); }

  /** @returns {boolean} */
  isRateLimited(error) { return false; }
}

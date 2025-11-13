import { Logger } from '../utils/logger.js';

export abstract class BaseCollector<T> {
  protected logger: Logger;

  constructor(name: string) {
    this.logger = new Logger(name);
  }

  abstract collect(keywords: string[]): Promise<T[]>;

  protected async retryWithBackoff<R>(
    fn: () => Promise<R>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<R> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${i + 1} failed: ${lastError.message}`);

        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          this.logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }
}

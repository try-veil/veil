import { VeilClient } from '../../../sdks/nodejs/src';
import { config } from '../config';

// Create a singleton instance of the Veil client
export const veilClient = new VeilClient({
  baseUrl: config.veil.baseUrl,
  timeout: config.veil.timeout,
});

export { VeilClient } from '../../../sdks/nodejs/src';
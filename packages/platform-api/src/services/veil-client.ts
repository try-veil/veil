import { VeilClient } from '../../../sdks/nodejs/src';
import { config } from '../config';

// Create a singleton instance of the Veil client
export const veilClient = new VeilClient({
  baseUrl: config.caddy.managementUrl,
  timeout: 30000, // 30 seconds timeout
});

export { VeilClient } from '../../../sdks/nodejs/src';
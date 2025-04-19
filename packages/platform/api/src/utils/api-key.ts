import { randomBytes } from 'crypto';

export function generateApiKey(): string {
  // Generate a random 32-byte buffer and convert it to a base64 string
  const buffer = randomBytes(32);
  const key = buffer.toString('base64');

  // Replace characters that might cause issues in URLs
  return key.replace(/[+/=]/g, (match) => {
    switch (match) {
      case '+':
        return '-';
      case '/':
        return '_';
      case '=':
        return '';
      default:
        return match;
    }
  });
}

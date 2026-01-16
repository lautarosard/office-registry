import { randomBytes } from 'crypto';

export function generateTempPassword(): string {
  return randomBytes(4).toString('hex'); // 8 chars
}

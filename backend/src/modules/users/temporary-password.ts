import { randomInt } from 'crypto';

export const TEMPORARY_PASSWORD_LENGTH = 12;

// No 0/O, 1/l/I: the password is usually copied by hand or read aloud.
const GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnpqrstuvwxyz',
  '23456789',
];
const ALPHABET = GROUPS.join('');

const pick = (chars: string) => chars[randomInt(chars.length)];

/** Cryptographically random; always has upper case, lower case and a digit. */
export function generateTemporaryPassword(): string {
  const chars = GROUPS.map(pick);
  while (chars.length < TEMPORARY_PASSWORD_LENGTH) {
    chars.push(pick(ALPHABET));
  }

  // Fisher-Yates, so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

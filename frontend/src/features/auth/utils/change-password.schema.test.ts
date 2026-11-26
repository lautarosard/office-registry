import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from './change-password.schema';

const errorsFor = (newPassword: string, confirmPassword = newPassword) => {
  const result = changePasswordSchema.safeParse({
    currentPassword: 'Actual123',
    newPassword,
    confirmPassword,
  });
  return result.success ? [] : result.error.issues.map((i) => i.path[0]);
};

describe('changePasswordSchema', () => {
  it('accepts a password with 8+ characters, a letter and a number', () => {
    expect(errorsFor('Nueva123')).toEqual([]);
  });

  it.each([
    ['too short', 'abc123'],
    ['without a number', 'sololetras'],
    ['without a letter', '1234567890'],
    ['over 72 bytes', `a1${'ñ'.repeat(36)}`],
    ['equal to the current one', 'Actual123'],
  ])('rejects a password %s', (_case, password) => {
    expect(errorsFor(password)).toContain('newPassword');
  });

  it('rejects a confirmation that does not match', () => {
    expect(errorsFor('Nueva123', 'Nueva124')).toEqual(['confirmPassword']);
  });
});

import { generateTemporaryPassword } from './temporary-password';

describe('generateTemporaryPassword', () => {
  it('returns 12 unambiguous characters with every character class', () => {
    for (let i = 0; i < 200; i++) {
      const password = generateTemporaryPassword();

      expect(password).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/\d/);
    }
  });

  it('does not repeat', () => {
    const passwords = new Set(
      Array.from({ length: 500 }, generateTemporaryPassword),
    );

    expect(passwords.size).toBe(500);
  });
});

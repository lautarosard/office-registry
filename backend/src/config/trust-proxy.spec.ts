import { parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it('defaults to one hop in production and to none otherwise', () => {
    expect(parseTrustProxy(undefined, 'production')).toBe(1);
    expect(parseTrustProxy(undefined, 'development')).toBe(false);
  });

  it.each([
    ['1', 1],
    ['2', 2],
    ['0', false],
    ['false', false],
    ['10.0.0.5, 172.16.0.0/12', '10.0.0.5, 172.16.0.0/12'],
  ])('reads %s', (value, expected) => {
    expect(parseTrustProxy(value, 'production')).toBe(expected);
  });
});

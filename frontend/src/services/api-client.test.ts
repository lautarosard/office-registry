import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { storage } from '../shared/utils/storage';
import { api } from './api-client';

/** A server that rejects every call with 401, after running `meanwhile`. */
const unauthorized = (meanwhile = () => {}) =>
  api.get('/records', {
    adapter: (config: InternalAxiosRequestConfig) => {
      meanwhile();
      return Promise.reject(
        new AxiosError('401', undefined, config, null, {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config,
        }),
      );
    },
  });

describe('api client on 401', () => {
  beforeEach(() => window.localStorage.clear());

  it('ends the session when the current token is rejected', async () => {
    storage.setToken('current');

    await expect(unauthorized()).rejects.toThrow();

    expect(storage.getToken()).toBeNull();
  });

  it('keeps a token issued while the request was in flight', async () => {
    storage.setToken('old');

    await expect(
      unauthorized(() => storage.setToken('new')),
    ).rejects.toThrow();

    expect(storage.getToken()).toBe('new');
  });
});

import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../services/api-client';
import { recordsApi } from './records.api';

const originalAdapter = api.defaults.adapter;

describe('records API', () => {
  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it('uploads the spreadsheet as multipart, not as JSON', async () => {
    let sent: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = (config) => {
      sent = config;
      return Promise.resolve({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    };
    const file = new File(['a;b'], 'planilla.csv');

    await recordsApi.import(file, true);

    expect(sent?.data).toBeInstanceOf(FormData);
    expect((sent?.data as FormData).get('file')).toBeInstanceOf(File);
    expect(String(sent?.headers['Content-Type'])).not.toContain('json');
    expect(sent?.params).toEqual({ dryRun: true });
  });
});

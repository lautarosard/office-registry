import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The server is on the local network: don't pause requests just because
      // the browser reports there is no internet connection.
      networkMode: 'always',
      // A 4xx answer won't change by asking again.
      retry: (failures, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        return failures < 1 && !(status && status < 500);
      },
    },
    mutations: { networkMode: 'always' },
  },
});

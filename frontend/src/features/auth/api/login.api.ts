import { api } from '../../../services/api-client';
import { LoginRequest } from '../types'; // Define LoginRequest según tu DTO de Nest

export const loginFn = async (data: any): Promise<any> => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

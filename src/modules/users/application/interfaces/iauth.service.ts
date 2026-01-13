import {loginResponse} from '../models/responses/login.response';
import {RegisterRequest} from '../models/requests/register.request';
import {LoginRequest} from '../models/requests/login.request';
export interface IAuthService{
  register(data: RegisterRequest): Promise<bool>;
  login(data: LoginRequest): Promise<loginResponse>;
}

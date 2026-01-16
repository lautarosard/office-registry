import {RegisterRequest} from '../models/requests/register.request';
import {LoginRequest} from '../models/requests/login.request';
import type{ loginResponse } from '../models/responses/login.response';
export abstract class IAuthService{
  abstract login(data: LoginReques): Promise<loginResponse>;
  abstract changuePass(username: String): Promise<bool>;
}

import {LoginRequest} from '../models/requests/login.request';
import type{ loginResponse } from '../models/responses/login.response';
export abstract class IAuthService{
  abstract login(data: LoginRequest): Promise<loginResponse>;
  //abstract changuePass(username: String): Promise<Boolean>;
}

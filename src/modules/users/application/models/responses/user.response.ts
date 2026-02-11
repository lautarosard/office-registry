import { Role } from '../../../../../common/enums/role.enum';

export interface UserResponse {
  id: string;
  username: string;
  name: string;
  rol: Role;
  tempPass: string;
}

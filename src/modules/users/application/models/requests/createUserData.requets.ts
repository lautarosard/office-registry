import { Role } from '../../../../../common/enums/role.enum';
export type CreateUserData = {
  username: string;
  password: string;
  rol: Role;
  name: string;
};

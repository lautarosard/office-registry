import type { Paginated } from '../../shared/types';
import type { Role } from '../auth/types';

export interface UserAccount {
  id: string;
  dni: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export type UserInput = Pick<
  UserAccount,
  'dni' | 'username' | 'fullName' | 'role'
>;

export type UserPage = Paginated<UserAccount>;

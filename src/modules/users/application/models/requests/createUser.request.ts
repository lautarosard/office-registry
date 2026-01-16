import { IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEnum(Role)
  role: Role;
}

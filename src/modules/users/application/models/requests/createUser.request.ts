import { IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  username: string;
  @IsString()
  name: string;
  @IsEnum(Role)
  role: Role;
}

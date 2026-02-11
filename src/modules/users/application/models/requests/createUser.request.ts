import { IsEnum, IsString } from 'class-validator';
import { Role } from '../../../../../common/enums/role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'jdoe', description: 'The username of the user' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'John Doe', description: 'The name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ enum: Role, example: Role.USER, description: 'The role of the user' })
  @IsEnum(Role)
  role: Role;
}

import { MaxLength, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequest {
  @ApiProperty({ example: 'jdoe', description: 'The username of the user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  username: string;

  @ApiProperty({ example: 'secretpassword', description: 'The password of the user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

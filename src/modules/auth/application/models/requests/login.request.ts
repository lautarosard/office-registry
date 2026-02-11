import { MaxLength, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  username: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

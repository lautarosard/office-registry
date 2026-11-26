import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class MeResponse {
  @ApiProperty()
  id: string;
  @ApiProperty()
  username: string;
  @ApiProperty()
  fullName: string;
  @ApiProperty({ enum: Role })
  role: Role;
  @ApiProperty()
  isActive: boolean;
  @ApiProperty()
  mustChangePassword: boolean;
}

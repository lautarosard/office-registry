import { Module } from '@nestjs/common';
import { UsersService } from './application/services/user.service';
import { UsersController } from './api/controllers/user.controller';
import { IUserRepository } from './domain/iRepository/iuser.repository';
import { PrismaUserRepository } from './infrastructure/persistance/user.repository';
import { IUserService } from './application/interfaces/iuser.service';

@Module({
  controllers: [UsersController],
  providers: [
    {
      provide: IUserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: IUserService,
      useClass: UsersService,
    },
  ],
  exports: [IUserService, IUserRepository],
})
export class UserModule {}

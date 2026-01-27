import {Module} from '@nestjs/common';
import {UsersService} from './application/services/user.service';
import {UsersController} from './api/controllers/';
import {TypeOrmModule} from '@nestjs/typeorm';
import {User} from '../../database/generated/prisma/client';
import {IUserRepository} from './domain/iRepository/iuser.repository';

@Module({
  providers:[
    {
      provide: IUserRepository,
      useClass: UsersService
    }
  ]
})
export class UserModule{}

import {Module} from '@nestjs/common';
import {UsersService} from './users.service';
import {UsersController} from './users.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {User} from './entities/user.entity'
import {IUserRepository} from './repositories/iuser.repository';

@Module({
  providers:[
    {
      provide: IUserRepository,
      useClass:
    }
  ]
})
export class UserModule{}

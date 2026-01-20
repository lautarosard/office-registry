import {IUserRepository} from '../../domain/iRepository/iuser.repository';
import {User} from '../../../../database/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Prisma} from '../../../../database/prisma/prisma.service';

export class PrismaUserRepository implements IUserRepository {
  
  /*
   *Obtain all the Users
   * */
  async getAll(): Promise<User[]> {
    return await prisma.user.findMany();
  }

  /*
   *get the user by the username
   * */
  async findByUsername(username: string): Promise<User> {
    return await prisma.user.findUnique({
      where: {
        username: username
      }
    });
  }
//create update delete
  async create(data: Omit<User,'id'>): Promise<User> {
 
    return await prisma.user.create({
      data: data
    })
  }

  async update(id:string, data:Partial<User>):Promise<User> {
    return await prisma.user.update({
      where: {
        id: id
      },
      data: data
    })
  }

  async delete(id: string): Promise<User> {
    return await prisma.user.delete({
      where: {
        id: id
      }
    })
  }



}

import {injectable, onmoduleinit, onmoduledestroy} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }

  async OnModuleDestroy(){
    await this.$disconnect();
  }

}


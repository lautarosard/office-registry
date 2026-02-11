import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { IRecordRepository } from '../../domain/iRepository/irecord.repository';
import { Register } from '@prisma/client';
import { CreateRecordRequest } from '../../application/models/requests/create-record.request';

@Injectable()
export class PrismaRecordRepository implements IRecordRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: CreateRecordRequest): Promise<Register> {
        const { dia, ...rest } = data;
        return this.prisma.register.create({
            data: {
                ...rest,
                dia: new Date(dia),
            },
        });
    }

    async getAll(): Promise<Register[]> {
        return this.prisma.register.findMany();
    }

    async getById(id: string): Promise<Register | null> {
        return this.prisma.register.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: Partial<Register>): Promise<Register> {
        return this.prisma.register.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<Register> {
        return this.prisma.register.delete({
            where: { id },
        });
    }
}

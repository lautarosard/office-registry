import { Register } from '@prisma/client';
import { CreateRecordRequest } from '../../application/models/requests/create-record.request';

export abstract class IRecordRepository {
    abstract create(data: CreateRecordRequest): Promise<Register>;
    abstract getAll(): Promise<Register[]>;
    abstract getById(id: string): Promise<Register | null>;
    abstract update(id: string, data: Partial<Register>): Promise<Register>;
    abstract delete(id: string): Promise<Register>;
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { IRecordService } from '../interfaces/irecord.service';
import { IRecordRepository } from '../../domain/iRepository/irecord.repository';
import { CreateRecordRequest } from '../models/requests/create-record.request';
import { UpdateRecordRequest } from '../models/requests/update-record.request';
import { RecordResponse } from '../models/responses/record.response';

@Injectable()
export class RecordService implements IRecordService {
  constructor(private readonly recordRepository: IRecordRepository) { }

  async createRecord(data: CreateRecordRequest): Promise<RecordResponse> {
    const record = await this.recordRepository.create(data);
    return new RecordResponse(record);
  }

  async getAllRecords(): Promise<RecordResponse[]> {
    const records = await this.recordRepository.getAll();
    return records.map((record) => new RecordResponse(record));
  }

  async getRecordById(id: string): Promise<RecordResponse> {
    const record = await this.recordRepository.getById(id);
    if (!record) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }
    return new RecordResponse(record);
  }

  async updateRecord(id: string, data: UpdateRecordRequest): Promise<RecordResponse> {
    // Check if exists first
    await this.getRecordById(id);

    // Map DTO to Partial<Register> manually
    const updateData: any = { ...data };
    if (data.dia) {
      updateData.dia = new Date(data.dia);
    }

    const updatedRecord = await this.recordRepository.update(id, updateData);
    return new RecordResponse(updatedRecord);
  }

  async deleteRecord(id: string): Promise<RecordResponse> {
    // Check if exists first
    await this.getRecordById(id);
    const deletedRecord = await this.recordRepository.delete(id);
    return new RecordResponse(deletedRecord);
  }
}

import { CreateRecordRequest } from '../models/requests/create-record.request';
import { UpdateRecordRequest } from '../models/requests/update-record.request';
import { RecordResponse } from '../models/responses/record.response';

export abstract class IRecordService {
    abstract createRecord(data: CreateRecordRequest): Promise<RecordResponse>;
    abstract getAllRecords(): Promise<RecordResponse[]>;
    abstract getRecordById(id: string): Promise<RecordResponse>;
    abstract updateRecord(id: string, data: UpdateRecordRequest): Promise<RecordResponse>;
    abstract deleteRecord(id: string): Promise<RecordResponse>;
}

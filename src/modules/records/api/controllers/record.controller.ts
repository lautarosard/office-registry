import { Controller, Get, Post, Put, Delete, Body, Param, Inject } from '@nestjs/common';
import { IRecordService } from '../../application/interfaces/irecord.service';
import { CreateRecordRequest } from '../../application/models/requests/create-record.request';
import { UpdateRecordRequest } from '../../application/models/requests/update-record.request';
import { RecordResponse } from '../../application/models/responses/record.response';

@Controller('records')
export class RecordController {
    constructor(
        @Inject(IRecordService)
        private readonly recordService: IRecordService,
    ) { }

    @Post()
    async create(@Body() createRecordDto: CreateRecordRequest): Promise<RecordResponse> {
        return this.recordService.createRecord(createRecordDto);
    }

    @Get()
    async findAll(): Promise<RecordResponse[]> {
        return this.recordService.getAllRecords();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<RecordResponse> {
        return this.recordService.getRecordById(id);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() updateRecordDto: UpdateRecordRequest,
    ): Promise<RecordResponse> {
        return this.recordService.updateRecord(id, updateRecordDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string): Promise<RecordResponse> {
        return this.recordService.deleteRecord(id);
    }
}

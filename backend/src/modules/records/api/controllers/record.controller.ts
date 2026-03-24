import { Controller, Get, Post, Put, Delete, Body, Param, Inject } from '@nestjs/common';
import { IRecordService } from '../../application/interfaces/irecord.service';
import { CreateRecordRequest } from '../../application/models/requests/create-record.request';
import { UpdateRecordRequest } from '../../application/models/requests/update-record.request';
import { RecordResponse } from '../../application/models/responses/record.response';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Records')
@ApiBearerAuth()
@Controller('records')
export class RecordController {
    constructor(
        @Inject(IRecordService)
        private readonly recordService: IRecordService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new record' })
    @ApiResponse({ status: 201, description: 'The record has been successfully created.', type: RecordResponse })
    async create(@Body() createRecordDto: CreateRecordRequest): Promise<RecordResponse> {
        return this.recordService.createRecord(createRecordDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all records' })
    @ApiResponse({ status: 200, description: 'Return all records.', type: [RecordResponse] })
    async findAll(): Promise<RecordResponse[]> {
        return this.recordService.getAllRecords();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a record by id' })
    @ApiResponse({ status: 200, description: 'Return the record.', type: RecordResponse })
    @ApiResponse({ status: 404, description: 'Record not found.' })
    async findOne(@Param('id') id: string): Promise<RecordResponse> {
        return this.recordService.getRecordById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a record' })
    @ApiResponse({ status: 200, description: 'The record has been successfully updated.', type: RecordResponse })
    async update(
        @Param('id') id: string,
        @Body() updateRecordDto: UpdateRecordRequest,
    ): Promise<RecordResponse> {
        return this.recordService.updateRecord(id, updateRecordDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a record' })
    @ApiResponse({ status: 200, description: 'The record has been successfully deleted.', type: RecordResponse })
    async remove(@Param('id') id: string): Promise<RecordResponse> {
        return this.recordService.deleteRecord(id);
    }
}

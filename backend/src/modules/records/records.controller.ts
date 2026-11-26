import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/application/strategies/jwt.strategy';
import { CreateRecordDto } from './dto/create-record.dto';
import { SearchRecordsQuery } from './dto/search-records.query';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordsService } from './records.service';

// Authentication is enforced by the global JwtAuthGuard (see AuthModule).
@ApiTags('Records')
@ApiBearerAuth()
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  @ApiOperation({ summary: 'Search active records (paginated)' })
  search(@Query() query: SearchRecordsQuery) {
    return this.recordsService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an active record' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  findOne(@Param('id') id: string) {
    return this.recordsService.findOne(id);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Change history of a record, oldest first' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  history(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recordsService.history(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a record' })
  create(@Body() dto: CreateRecordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recordsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a record (owner or ADMIN)' })
  @ApiResponse({ status: 403, description: 'Not the owner.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recordsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a record (owner or ADMIN)' })
  @ApiResponse({ status: 403, description: 'Not the owner.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recordsService.remove(id, user);
  }
}

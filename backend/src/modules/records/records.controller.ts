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
  Header,
  StreamableFile,
  UploadedFile,
  BadRequestException,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/application/strategies/jwt.strategy';
import { CreateRecordDto } from './dto/create-record.dto';
import { ExportRecordsQuery, FormatQuery } from './dto/export-records.query';
import { ImportRecordsQuery } from './dto/import-records.query';
import { SearchRecordsQuery } from './dto/search-records.query';
import { UpdateRecordDto } from './dto/update-record.dto';
import { CONTENT_TYPES } from './io/spreadsheet-writer';
import { MAX_IMPORT_BYTES, UploadTooLargeFilter } from './io/upload-limits';
import { RecordsIoService } from './records-io.service';
import { RecordsService } from './records.service';

const attachment = (name: string, format: keyof typeof CONTENT_TYPES) => ({
  type: CONTENT_TYPES[format],
  disposition: `attachment; filename="${name}.${format}"`,
});

// Authentication is enforced by the global JwtAuthGuard (see AuthModule).
@ApiTags('Records')
@ApiBearerAuth()
@Controller('records')
export class RecordsController {
  constructor(
    private readonly recordsService: RecordsService,
    private readonly recordsIo: RecordsIoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search active records (paginated)' })
  search(@Query() query: SearchRecordsQuery) {
    return this.recordsService.search(query);
  }

  // The fixed paths below must stay above ':id', which would capture them.

  @Get('catalogs')
  @ApiOperation({ summary: 'Values already used, for autocomplete' })
  catalogs() {
    return this.recordsService.catalogs();
  }

  @Get('export')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Download the filtered records (ADMIN)' })
  async export(@Query() query: ExportRecordsQuery) {
    const day = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
    return new StreamableFile(
      await this.recordsIo.export(query),
      attachment(`expedientes_${day}`, query.format),
    );
  }

  @Get('import-template')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Empty spreadsheet to fill in (ADMIN)' })
  async template(@Query() query: FormatQuery) {
    return new StreamableFile(
      await this.recordsIo.template(query.format),
      attachment('plantilla_expedientes', query.format),
    );
  }

  @Post('import')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // Runs after the guards, so nobody else's upload is even read.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMPORT_BYTES, files: 1, fields: 0 },
    }),
  )
  @UseFilters(UploadTooLargeFilter)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Validate or import a spreadsheet (ADMIN)' })
  import(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportRecordsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Seleccione un archivo.');
    return this.recordsIo.import(file, query.dryRun, user);
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

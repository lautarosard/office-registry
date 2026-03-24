import { IsString, IsNotEmpty, IsDateString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRecordRequest {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    ex?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    if_code?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    motivo?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    reparticion?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    pase?: string;

    @ApiProperty({ required: false, example: '2023-10-27T10:00:00Z' })
    @IsDateString()
    @IsOptional()
    dia?: string;

    @ApiProperty({ required: false })
    @IsUUID()
    @IsOptional()
    user_id?: string;
}

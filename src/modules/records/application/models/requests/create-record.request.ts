import { IsString, IsNotEmpty, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecordRequest {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    ex: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    if_code: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    motivo: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    reparticion: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    pase: string;

    @ApiProperty({ example: '2023-10-27T10:00:00Z' })
    @IsDateString()
    @IsNotEmpty()
    dia: string;

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}

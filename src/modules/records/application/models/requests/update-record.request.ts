import { IsString, IsNotEmpty, IsDateString, IsUUID, IsOptional } from 'class-validator';

export class UpdateRecordRequest {
    @IsString()
    @IsOptional()
    ex?: string;

    @IsString()
    @IsOptional()
    if_code?: string;

    @IsString()
    @IsOptional()
    motivo?: string;

    @IsString()
    @IsOptional()
    reparticion?: string;

    @IsString()
    @IsOptional()
    pase?: string;

    @IsDateString()
    @IsOptional()
    dia?: string;

    @IsUUID()
    @IsOptional()
    user_id?: string;
}

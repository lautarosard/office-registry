import { IsString, IsNotEmpty, IsDateString, IsUUID } from 'class-validator';

export class CreateRecordRequest {
    @IsString()
    @IsNotEmpty()
    ex: string;

    @IsString()
    @IsNotEmpty()
    if_code: string;

    @IsString()
    @IsNotEmpty()
    motivo: string;

    @IsString()
    @IsNotEmpty()
    reparticion: string;

    @IsString()
    @IsNotEmpty()
    pase: string;

    @IsDateString()
    @IsNotEmpty()
    dia: string;

    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}

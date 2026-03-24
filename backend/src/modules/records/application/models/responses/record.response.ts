import { ApiProperty } from '@nestjs/swagger';

export class RecordResponse {
    @ApiProperty()
    id: string;
    @ApiProperty()
    ex: string;
    @ApiProperty()
    if_code: string;
    @ApiProperty()
    motivo: string;
    @ApiProperty()
    reparticion: string;
    @ApiProperty()
    pase: string;
    @ApiProperty()
    dia: Date;
    @ApiProperty()
    user_id: string;

    constructor(partial: Partial<RecordResponse>) {
        Object.assign(this, partial);
    }
}

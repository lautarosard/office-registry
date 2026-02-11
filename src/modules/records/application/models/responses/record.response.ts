export class RecordResponse {
    id: string;
    ex: string;
    if_code: string;
    motivo: string;
    reparticion: string;
    pase: string;
    dia: Date;
    user_id: string;

    constructor(partial: Partial<RecordResponse>) {
        Object.assign(this, partial);
    }
}

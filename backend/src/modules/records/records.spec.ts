import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '@prisma/client';
import { isDateOnly } from '../../common/validators/is-date-only.validator';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { canModifyRecord } from './records.policy';

const input = {
  date: '2026-11-26',
  ex: '  ex-2025-93504106- -apn-difp#pfa ',
  ifCode: 'if-2025-93911988-apn-sopdga#pfa',
  subject: '  Diagramación de servicio ',
  department: 'DGO#PFA',
  forwarding: '   ',
};

const invalidProperties = async (dto: object) =>
  (await validate(dto)).map((error) => error.property);

describe('record rules', () => {
  it('normalizes EX, IF and blank forwarding', async () => {
    const dto = plainToInstance(CreateRecordDto, input);

    expect(await invalidProperties(dto)).toEqual([]);
    expect(dto).toMatchObject({
      ex: 'EX-2025-93504106- -APN-DIFP#PFA',
      ifCode: 'IF-2025-93911988-APN-SOPDGA#PFA',
      subject: 'Diagramación de servicio',
      forwarding: null,
    });
  });

  it('requires every mandatory field on create', async () => {
    const dto = plainToInstance(CreateRecordDto, {});

    expect((await invalidProperties(dto)).sort()).toEqual([
      'date',
      'department',
      'ex',
      'ifCode',
      'subject',
    ]);
  });

  it('allows partial updates but not null on required fields', async () => {
    const partial = plainToInstance(UpdateRecordDto, { subject: 'Otro' });
    const nulled = plainToInstance(UpdateRecordDto, {
      ex: null,
      subject: '  ',
      forwarding: null,
    });

    expect(await invalidProperties(partial)).toEqual([]);
    expect((await invalidProperties(nulled)).sort()).toEqual(['ex', 'subject']);
  });

  it.each([
    ['2026-02-28', true],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['26/11/2026', false],
    ['2026-11-26T10:00:00Z', false],
  ])('treats %s as a date: %s', (value, expected) => {
    expect(isDateOnly(value)).toBe(expected);
  });

  it('lets ADMIN change any record and USER only their own', () => {
    const record = { createdById: 'a' };

    expect(canModifyRecord({ userId: 'a', role: Role.USER }, record)).toBe(
      true,
    );
    expect(canModifyRecord({ userId: 'b', role: Role.USER }, record)).toBe(
      false,
    );
    expect(canModifyRecord({ userId: 'b', role: Role.ADMIN }, record)).toBe(
      true,
    );
  });
});

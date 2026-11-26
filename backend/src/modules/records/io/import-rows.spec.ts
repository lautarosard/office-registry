import { neutralizeFormula } from './spreadsheet-writer';
import { parseImportRows, toDayString } from './import-rows';
import { readSpreadsheet } from './spreadsheet-reader';

const header = ['Fecha', 'EX', 'IF', 'Motivo', 'Repartición', 'Pase'];
const good = [
  '05/03/2026',
  'ex-2026-1-apn',
  'if-2026-2-apn',
  'Nota',
  'DGO#PFA',
  '---',
];

describe('import parsing', () => {
  it.each([
    ['05/03/2026', '2026-03-05'],
    ['5/3/2026', '2026-03-05'],
    ['05-03-2026', '2026-03-05'],
    ['2026-03-05', '2026-03-05'],
    [new Date('2026-03-05T00:00:00Z'), '2026-03-05'],
    [46086, '2026-03-05'],
    ['3/5/26', '3/5/26'],
    [12, '12'],
  ])('reads the date %s', (cell, expected) => {
    expect(toDayString(cell)).toBe(expected);
  });

  it('tolerates header case, accents, order and extra columns', async () => {
    const result = await parseImportRows([
      ['PASE', 'reparticion', 'Motivo ', 'if', 'ex', 'FECHA', 'Cargado por'],
      [...good].reverse().concat('Alguien'),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.valid[0]).toMatchObject({
      date: '2026-03-05',
      ex: 'EX-2026-1-APN',
      ifCode: 'IF-2026-2-APN',
      forwarding: null,
    });
  });

  it('reports one message per field with the spreadsheet row', async () => {
    const result = await parseImportRows([
      header,
      good,
      [null, null, null, null, null, null],
      ['31/02/2026', '', 'XX-1', '  ', 'DGO#PFA', 'Archivo'],
    ]);

    expect(result).toMatchObject({ totalRows: 2 });
    expect(result.valid).toHaveLength(1);
    expect(result.errors.map((e) => [e.row, e.field])).toEqual([
      [4, 'date'],
      [4, 'ex'],
      [4, 'ifCode'],
      [4, 'subject'],
    ]);
    expect(result.errors[1].message).toBe('Ingrese el EX.');
  });

  it('refuses a sheet without the required columns or without rows', async () => {
    await expect(parseImportRows([['Fecha', 'EX']])).rejects.toThrow(
      'Faltan columnas',
    );
    await expect(parseImportRows([header])).rejects.toThrow('no tiene filas');
    await expect(parseImportRows([])).rejects.toThrow('vacía');
  });

  it('reads a semicolon CSV saved as Windows-1252', async () => {
    const csv = Buffer.from(
      'Fecha;Repartición;Motivo\r\n05/03/2026;DGO;"Revisión; anual"\r\n',
      'latin1',
    );

    expect(await readSpreadsheet('planilla.CSV', csv)).toEqual([
      ['Fecha', 'Repartición', 'Motivo'],
      ['05/03/2026', 'DGO', 'Revisión; anual'],
    ]);
  });

  it('refuses other file types and corrupt workbooks', async () => {
    await expect(readSpreadsheet('a.xls', Buffer.from('x'))).rejects.toThrow(
      'Formato no admitido',
    );
    await expect(readSpreadsheet('a.xlsx', Buffer.from('x'))).rejects.toThrow(
      'No se pudo leer',
    );
  });

  it('neutralizes spreadsheet formulas in CSV text', () => {
    expect(neutralizeFormula('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
    expect(neutralizeFormula('@cmd')).toBe(`'@cmd`);
    expect(neutralizeFormula('Nota - 1')).toBe('Nota - 1');
  });
});

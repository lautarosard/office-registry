import type { Paginated } from '../../shared/types';

export interface UserRef {
  id: string;
  username: string;
  fullName: string;
}

export interface RecordItem {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  ex: string;
  ifCode: string;
  subject: string;
  department: string;
  forwarding: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserRef;
  updatedBy: UserRef | null;
}

export type RecordInput = Pick<
  RecordItem,
  'date' | 'ex' | 'ifCode' | 'subject' | 'department' | 'forwarding'
>;

export interface RecordSearch {
  q?: string;
  from?: string;
  to?: string;
  page: number;
}

export type RecordPage = Paginated<RecordItem>;

export interface AuditEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  createdAt: string;
  before: Record<string, string | null> | null;
  after: Record<string, string | null> | null;
  performedBy: UserRef;
}

/** Values already in use, offered as autocomplete. */
export interface Catalogs {
  subjects: string[];
  departments: string[];
  forwardings: string[];
}

export type SpreadsheetFormat = 'xlsx' | 'csv';

export type ExportFilters = Pick<RecordSearch, 'q' | 'from' | 'to'>;

export interface ImportRowError {
  row: number;
  field: keyof RecordInput;
  message: string;
}

export interface ImportReport {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  errors: ImportRowError[];
  importedCount: number;
}

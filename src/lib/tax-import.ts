import type { ChargeType, CompanyCharge } from '@/types/safety';

const PAYER_CNPJ = '39973085000120';
const TYPES: ChargeType[] = ['INSS', 'FGTS', 'PIS', 'COFINS', 'IRPJ', 'CSLL', 'ISSQN'];
const MARKER = '\n[BC_TAX_IMPORT_V1]';

type ChargeInput = Omit<CompanyCharge, 'id' | 'createdAt'>;

interface CheckpointItem {
  type: ChargeType;
  competence: string;
  value: number;
  dueDate: string;
  reference: string;
  documentNumber: string;
  niboDocumentId?: string;
  niboUrl?: string;
  niboStatus?: string;
  guideRead: boolean;
  period?: string;
}

interface Checkpoint {
  payerCnpj: string;
  items: CheckpointItem[];
}

type ImportedMetadata = Pick<ChargeInput, 'source' | 'sourceDocumentId' | 'documentNumber' | 'documentUrl' | 'verificationStatus'>;

export function readImportedNotes(notes: string): { notes: string; metadata: ImportedMetadata | null } {
  const markerAt = notes.lastIndexOf(MARKER);
  if (markerAt < 0) return { notes, metadata: null };
  try {
    const metadata = JSON.parse(notes.slice(markerAt + MARKER.length)) as ImportedMetadata;
    if (!metadata.source || !metadata.verificationStatus) throw new Error('Missing metadata');
    return { notes: notes.slice(0, markerAt), metadata };
  } catch {
    return { notes, metadata: null };
  }
}

export function notesForLegacyStorage(charge: ChargeInput): string {
  const metadata: ImportedMetadata = {
    source: charge.source,
    sourceDocumentId: charge.sourceDocumentId,
    documentNumber: charge.documentNumber,
    documentUrl: charge.documentUrl,
    verificationStatus: charge.verificationStatus,
  };
  return `${charge.notes}${MARKER}${JSON.stringify(metadata)}`;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

function chargeKey(charge: Pick<ChargeInput, 'chargeType' | 'month' | 'value' | 'dueDate' | 'documentNumber'>): string {
  return charge.documentNumber
    ? `doc:${charge.documentNumber.replace(/\W/g, '')}`
    : `fallback:${charge.chargeType}|${charge.month}|${charge.value.toFixed(2)}|${charge.dueDate}`;
}

export function parseTaxCheckpoint(raw: unknown, existing: CompanyCharge[]): { ready: ChargeInput[]; skipped: number } {
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo de conciliação inválido.');
  const checkpoint = raw as Checkpoint;
  if (checkpoint.payerCnpj?.replace(/\D/g, '') !== PAYER_CNPJ || !Array.isArray(checkpoint.items)) {
    throw new Error('O arquivo não pertence ao CNPJ 39.973.085/0001-20 ou não contém guias.');
  }

  const seen = new Set(existing.flatMap(charge => [chargeKey(charge), `fallback:${charge.chargeType}|${charge.month}|${charge.value.toFixed(2)}|${charge.dueDate}`]));
  const ready: ChargeInput[] = [];
  let skipped = 0;

  for (const [index, item] of checkpoint.items.entries()) {
    if (!TYPES.includes(item.type) || !/^\d{4}-\d{2}$/.test(item.competence) ||
      !isValidDate(item.dueDate) || !Number.isFinite(item.value) || item.value <= 0 ||
      !item.documentNumber?.trim() || item.guideRead !== true) {
      throw new Error(`Guia ${index + 1} incompleta ou não conferida. Nenhum lançamento foi iniciado.`);
    }
    const source = item.niboStatus && item.niboStatus !== 'Nao encontrado' && item.niboStatus !== 'Nao conferido'
      ? 'Nibo Empresa' : 'Guia local';
    const verificationStatus = item.niboStatus === 'Pago'
      ? 'Pago no Nibo; comprovante pendente' : 'Guia conferida';
    const charge: ChargeInput = {
      chargeType: item.type,
      month: item.competence,
      value: item.value,
      dueDate: item.dueDate,
      paid: false,
      paymentDate: '',
      notes: [item.reference, item.period, 'Guia conferida; quitação não comprovada.'].filter(Boolean).join(' | '),
      payerCnpj: PAYER_CNPJ,
      source,
      sourceDocumentId: item.niboDocumentId || '',
      documentNumber: item.documentNumber.trim(),
      documentUrl: item.niboUrl || '',
      documentHash: '',
      verificationStatus,
    };
    const key = chargeKey(charge);
    const fallback = `fallback:${charge.chargeType}|${charge.month}|${charge.value.toFixed(2)}|${charge.dueDate}`;
    if (seen.has(key) || seen.has(fallback)) { skipped++; continue; }
    seen.add(key);
    seen.add(fallback);
    ready.push(charge);
  }
  return { ready, skipped };
}

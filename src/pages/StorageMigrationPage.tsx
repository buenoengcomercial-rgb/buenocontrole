import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, DatabaseBackup, HardDriveUpload, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const BUCKET = 'attachments-private';
const BACKUP_BUCKET = 'attachments-backups-private';
const DATABASE_BACKUP_BUCKET = 'database_export_29_07_26';
const SELECT_METADATA = 'id, entity_type, entity_id, file_name, file_size, file_type, storage_path, storage_bucket, storage_checksum, storage_migrated_at, created_at';

type MigrationRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string | null;
  storage_bucket: string | null;
  storage_checksum: string | null;
  storage_migrated_at: string | null;
  created_at: string;
};

function sanitizePathPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'arquivo';
}

function dataUrlToBytes(dataUrl: string) {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Formato Base64 invalido');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { mimeType: match[1] || 'application/octet-stream', bytes };
}

async function checksum(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchLegacyData(id: string) {
  const { data, error } = await supabase
    .from('attachments')
    .select('file_data')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data?.file_data) throw new Error(`Anexo ${id} sem Base64 disponivel`);
  return data.file_data;
}

export default function StorageMigrationPage() {
  const [rows, setRows] = useState<MigrationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verified, setVerified] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [backupUrl, setBackupUrl] = useState<string | null>(null);
  const [databaseBackupUrl, setDatabaseBackupUrl] = useState<string | null>(null);

  const migrated = useMemo(() => rows.filter(row => row.storage_path).length, [rows]);
  const legacy = useMemo(() => rows.filter(row => !row.storage_path).length, [rows]);

  const loadRows = async () => {
    setLoading(true);
    const backupFileName = `attachments-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const [{ data, error }, { data: backupFiles, error: backupError }] = await Promise.all([
      supabase
        .from('attachments')
        .select(SELECT_METADATA)
        .order('created_at'),
      supabase.storage
        .from(BACKUP_BUCKET)
        .list('', { search: backupFileName }),
    ]);
    setLoading(false);

    if (error) {
      console.error(error);
      toast.error(`Nao foi possivel carregar os anexos: ${error.message}`);
      return;
    }
    if (backupError) {
      console.error(backupError);
      toast.error(`Nao foi possivel verificar o backup privado: ${backupError.message}`);
      return;
    }

    setRows((data || []) as MigrationRow[]);
    setProgress(0);
    setVerified(false);
    setBackupDownloaded(Boolean(backupFiles?.some(file => file.name === backupFileName)));
  };

  const downloadBackup = async () => {
    if (!rows.length) {
      toast.error('Carregue o inventario antes de gerar o backup.');
      return;
    }

    setLoading(true);
    setProgress(0);
    try {
      const attachments: Array<MigrationRow & { file_data: string | null }> = [];
      const batchSize = 5;
      for (let index = 0; index < rows.length; index += batchSize) {
        const batch = rows.slice(index, index + batchSize);
        const batchAttachments = await Promise.all(batch.map(async row => ({
          ...row,
          file_data: row.storage_path ? null : await fetchLegacyData(row.id),
        })));
        attachments.push(...batchAttachments);
        setProgress(Math.round((Math.min(index + batch.length, rows.length) / rows.length) * 100));
      }

      const blob = new Blob([JSON.stringify({
        createdAt: new Date().toISOString(),
        project: 'vayxxheiqaueuortorln',
        count: attachments.length,
        attachments,
      })], { type: 'application/json' });
      const fileName = `attachments-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const { error: uploadError } = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(fileName, blob, {
          contentType: 'application/json',
          cacheControl: '3600',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from(BACKUP_BUCKET)
        .createSignedUrl(fileName, 3600);
      if (signedError || !signedData?.signedUrl) throw signedError || new Error('URL de backup indisponivel');

      setBackupUrl(signedData.signedUrl);
      setBackupDownloaded(true);
      toast.success(`Backup privado preparado com ${attachments.length} anexos.`);
    } catch (error) {
      console.error(error);
      toast.error(`Falha ao preparar backup: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const prepareDatabaseBackup = async () => {
    setLoading(true);
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(DATABASE_BACKUP_BUCKET)
        .list('');
      if (listError) throw listError;

      const backupFile = files?.find(file => file.name.endsWith('.backup'));
      if (!backupFile) throw new Error('Arquivo de exportacao nao encontrado');

      const { data, error } = await supabase.storage
        .from(DATABASE_BACKUP_BUCKET)
        .createSignedUrl(backupFile.name, 3600);
      if (error || !data?.signedUrl) throw error || new Error('URL de exportacao indisponivel');

      setDatabaseBackupUrl(data.signedUrl);
      toast.success('Exportacao integral pronta para download seguro.');
    } catch (error) {
      console.error(error);
      toast.error(`Falha ao preparar exportacao: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const migrate = async () => {
    const pending = rows.filter(row => !row.storage_path);
    if (!pending.length) {
      toast.info('Nao ha anexos pendentes de migracao.');
      return;
    }

    setLoading(true);
    setProgress(0);
    const nextRows = [...rows];

    for (let index = 0; index < pending.length; index += 1) {
      const row = pending[index];
      try {
        const fileData = await fetchLegacyData(row.id);
        const { bytes, mimeType } = dataUrlToBytes(fileData);
        const hash = await checksum(bytes);
        const storagePath = [
          sanitizePathPart(row.entity_type),
          sanitizePathPart(row.entity_id),
          row.id,
          sanitizePathPart(row.file_name),
        ].join('/');

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, bytes, {
            contentType: row.file_type.includes('/') ? row.file_type : mimeType,
            cacheControl: '3600',
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const migratedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('attachments')
          .update({
            storage_path: storagePath,
            storage_bucket: BUCKET,
            storage_checksum: hash,
            storage_migrated_at: migratedAt,
          })
          .eq('id', row.id);
        if (updateError) throw updateError;

        const rowIndex = nextRows.findIndex(item => item.id === row.id);
        nextRows[rowIndex] = {
          ...nextRows[rowIndex],
          storage_path: storagePath,
          storage_bucket: BUCKET,
          storage_checksum: hash,
          storage_migrated_at: migratedAt,
        };
      } catch (error) {
        console.error(`Falha ao migrar ${row.file_name}`, error);
        toast.error(`Migracao interrompida em ${row.file_name}. O Base64 foi preservado.`);
        setRows(nextRows);
        setLoading(false);
        return;
      }

      setProgress(Math.round(((index + 1) / pending.length) * 100));
    }

    setRows(nextRows);
    setLoading(false);
    toast.success(`${pending.length} anexos migrados para o Storage privado.`);
  };

  const verify = async () => {
    const storageRows = rows.filter(row => row.storage_path);
    if (storageRows.length !== rows.length) {
      toast.error(`Ainda existem ${rows.length - storageRows.length} anexos sem Storage.`);
      return;
    }

    setLoading(true);
    setProgress(0);
    for (let index = 0; index < storageRows.length; index += 1) {
      const row = storageRows[index];
      const { data, error } = await supabase.storage
        .from(row.storage_bucket || BUCKET)
        .createSignedUrl(row.storage_path!, 60);
      if (error || !data?.signedUrl) {
        setLoading(false);
        toast.error(`Falha ao validar ${row.file_name}.`);
        return;
      }

      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        setLoading(false);
        toast.error(`Arquivo indisponivel no Storage: ${row.file_name}.`);
        return;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const actualChecksum = await checksum(bytes);
      if (bytes.byteLength !== row.file_size || actualChecksum !== row.storage_checksum) {
        setLoading(false);
        toast.error(`Arquivo divergente no Storage: ${row.file_name}. O Base64 foi preservado.`);
        return;
      }
      setProgress(Math.round(((index + 1) / storageRows.length) * 100));
    }

    setLoading(false);
    setVerified(true);
    toast.success(`Todos os ${storageRows.length} anexos foram validados.`);
  };

  const clearLegacyData = async () => {
    if (!verified || !backupDownloaded) {
      toast.error('Baixe o backup e valide todos os arquivos antes da limpeza.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('attachments')
      .update({ file_data: null })
      .not('storage_path', 'is', null);
    setLoading(false);

    if (error) {
      console.error(error);
      toast.error('Falha ao limpar o Base64.');
      return;
    }

    toast.success('Base64 removido somente dos arquivos validados.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Migracao de Anexos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ferramenta administrativa temporaria para mover documentos ao Storage privado sem perda de dados.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">No Storage</p>
          <p className="mt-1 text-2xl font-semibold text-success">{migrated}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Base64 pendente</p>
          <p className="mt-1 text-2xl font-semibold text-warning">{legacy}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-success" />
          <p>Os dados antigos permanecem no banco ate o backup e a validacao completa.</p>
        </div>
        <Progress value={progress} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadRows()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
            Carregar inventario
          </Button>
          <Button variant="outline" onClick={() => void downloadBackup()} disabled={loading}>
            <DatabaseBackup className="mr-2 h-4 w-4" />
            Baixar backup JSON
          </Button>
          <Button variant="outline" onClick={() => void prepareDatabaseBackup()} disabled={loading}>
            <DatabaseBackup className="mr-2 h-4 w-4" />
            Preparar backup do banco
          </Button>
          <Button onClick={() => void migrate()} disabled={loading || !rows.length}>
            <HardDriveUpload className="mr-2 h-4 w-4" />
            Migrar para Storage
          </Button>
          <Button variant="outline" onClick={() => void verify()} disabled={loading || !migrated}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Validar arquivos
          </Button>
          <Button variant="destructive" onClick={() => void clearLegacyData()} disabled={loading || !verified || !backupDownloaded}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Limpar Base64 validado
          </Button>
          {backupUrl && (
            <a
              data-testid="storage-backup-download"
              href={backupUrl}
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              Baixar backup pronto
            </a>
          )}
          {databaseBackupUrl && (
            <a
              data-testid="database-backup-download"
              href={databaseBackupUrl}
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              Baixar banco completo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

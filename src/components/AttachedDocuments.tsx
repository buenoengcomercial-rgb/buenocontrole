import { useRef } from 'react';
import { useAttachments } from '@/context/AttachmentContext';
import { Paperclip, Download, Trash2, FileText, FileSpreadsheet, File } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function FileIcon({ type }: { type: string }) {
  if (type.includes('pdf')) return <FileText className="w-4 h-4 text-destructive" />;
  if (type.includes('sheet') || type.includes('excel') || type.includes('.xls')) return <FileSpreadsheet className="w-4 h-4 text-success" />;
  if (type.includes('word') || type.includes('.doc')) return <FileText className="w-4 h-4 text-primary" />;
  if (type.startsWith('image/')) return <File className="w-4 h-4 text-warning" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

interface Props {
  entityType: string;
  entityId: string;
}

export default function AttachedDocuments({ entityType, entityId }: Props) {
  const { addAttachment, deleteAttachment, getAttachments, downloadAttachment } = useAttachments();
  const inputRef = useRef<HTMLInputElement>(null);
  const files = getAttachments(entityType, entityId);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} excede 10MB.`);
        continue;
      }

      try {
        const dataUrl = await readAsDataUrl(file);
        const saved = await addAttachment({
          entityType,
          entityId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || file.name.split('.').pop() || '',
          dataUrl,
        });

        if (saved) toast.success(`${file.name} anexado.`);
        else toast.error(`Falha ao anexar ${file.name}.`);
      } catch {
        toast.error(`Falha ao ler ${file.name}.`);
      }
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDownload = async (att: { id: string; fileName: string }) => {
    toast.info('Baixando arquivo...');
    const dataUrl = await downloadAttachment(att.id);
    if (!dataUrl) {
      toast.error('Erro ao baixar arquivo.');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = att.fileName;
    a.click();
    toast.dismiss();
  };

  const handleDelete = async (id: string) => {
    const removed = await deleteAttachment(id);
    if (removed) toast.success('Arquivo removido.');
    else toast.error('Erro ao remover arquivo.');
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Documentos Anexados
          {files.length > 0 && <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{files.length}</span>}
        </h4>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          + Anexar
        </button>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden" onChange={e => { void handleFiles(e.target.files); }} />
      </div>

      {files.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhum documento anexado. Clique em "+ Anexar" para adicionar.</p>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm group">
              <FileIcon type={f.fileType} />
              <span className="flex-1 truncate font-medium">{f.fileName}</span>
              {f.createdAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{formatSize(f.fileSize)}</span>
              <button onClick={() => handleDownload(f)} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" title="Baixar">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { void handleDelete(f.id); }} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

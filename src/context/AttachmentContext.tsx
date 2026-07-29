import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  storagePath: string | null;
  storageBucket: string | null;
  storageChecksum: string | null;
  storageMigratedAt: string | null;
}

interface AttachmentPayload {
  entityType: string;
  entityId: string;
  file: File;
}

interface AttachmentState {
  attachments: Attachment[];
  addAttachment: (a: AttachmentPayload) => Promise<boolean>;
  deleteAttachment: (id: string) => Promise<boolean>;
  getAttachments: (entityType: string, entityId: string) => Attachment[];
  downloadAttachment: (id: string) => Promise<string | null>;
}

const AttachmentContext = createContext<AttachmentState | null>(null);
const STORAGE_BUCKET = 'attachments-private';
const METADATA_SELECT = 'id, entity_type, entity_id, file_name, file_size, file_type, created_at, storage_path, storage_bucket, storage_checksum, storage_migrated_at';
type AttachmentMetadataRow = Pick<
  Tables<'attachments'>,
  'id' | 'entity_type' | 'entity_id' | 'file_name' | 'file_size' | 'file_type' | 'created_at' |
  'storage_path' | 'storage_bucket' | 'storage_checksum' | 'storage_migrated_at'
>;

function sanitizePathPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'arquivo';
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function mapRow(r: AttachmentMetadataRow): Attachment {
  return {
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    fileName: r.file_name,
    fileSize: r.file_size,
    fileType: r.file_type,
    createdAt: r.created_at,
    storagePath: r.storage_path,
    storageBucket: r.storage_bucket,
    storageChecksum: r.storage_checksum,
    storageMigratedAt: r.storage_migrated_at,
  };
}

export function AttachmentProvider({ children }: { children: React.ReactNode }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const fetchAttachments = useCallback(() => {
    supabase.from('attachments').select(METADATA_SELECT).then(({ data, error }) => {
      if (error) {
        console.error('Erro ao carregar anexos:', error.message);
        return;
      }
      if (!data) return;

      const mapped = data.map(mapRow);
      setAttachments(prev => {
        if (prev.length === 0) return mapped;

        const merged = new Map(prev.map(a => [a.id, a]));
        mapped.forEach(a => merged.set(a.id, a));
        return Array.from(merged.values());
      });
    });
  }, []);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const addAttachment = useCallback(async (a: AttachmentPayload): Promise<boolean> => {
    const id = crypto.randomUUID();
    const storagePath = [
      sanitizePathPart(a.entityType),
      sanitizePathPart(a.entityId),
      id,
      sanitizePathPart(a.file.name),
    ].join('/');
    const checksum = await sha256(a.file);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, a.file, {
        cacheControl: '3600',
        contentType: a.file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Falha ao enviar anexo ao Storage', uploadError);
      return false;
    }

    const { data, error } = await supabase
      .from('attachments')
      .insert({
        id,
        entity_type: a.entityType,
        entity_id: a.entityId,
        file_name: a.file.name,
        file_size: a.file.size,
        file_type: a.file.type || a.file.name.split('.').pop() || '',
        file_data: null,
        storage_path: storagePath,
        storage_bucket: STORAGE_BUCKET,
        storage_checksum: checksum,
        storage_migrated_at: new Date().toISOString(),
      })
      .select(METADATA_SELECT)
      .single();

    if (error || !data) {
      console.error('Falha ao salvar anexo', error);
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return false;
    }

    const next = mapRow(data);
    setAttachments(prev => (prev.some(item => item.id === next.id) ? prev : [...prev, next]));
    return true;
  }, []);

  const deleteAttachment = useCallback(async (id: string): Promise<boolean> => {
    const attachment = attachments.find(item => item.id === id);

    if (attachment?.storagePath) {
      const { error: storageError } = await supabase.storage
        .from(attachment.storageBucket || STORAGE_BUCKET)
        .remove([attachment.storagePath]);

      if (storageError) {
        console.error('Falha ao remover arquivo do Storage', storageError);
        return false;
      }
    }

    const { error } = await supabase.from('attachments').delete().eq('id', id);

    if (error) {
      console.error('Falha ao remover anexo', error);
      return false;
    }

    setAttachments(prev => prev.filter(a => a.id !== id));
    return true;
  }, [attachments]);

  const getAttachments = useCallback((entityType: string, entityId: string) => {
    return attachments.filter(a => a.entityType === entityType && a.entityId === entityId);
  }, [attachments]);

  const downloadAttachment = useCallback(async (id: string): Promise<string | null> => {
    try {
      const attachment = attachments.find(item => item.id === id);

      if (attachment?.storagePath) {
        const { data, error } = await supabase.storage
          .from(attachment.storageBucket || STORAGE_BUCKET)
          .createSignedUrl(attachment.storagePath, 60);

        if (error) {
          console.error('Erro ao criar link temporario:', error.message);
          return null;
        }

        return data.signedUrl;
      }

      const { data, error } = await supabase
        .from('attachments')
        .select('file_data')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao baixar anexo:', error.message, error.code);
        return null;
      }
      if (!data) return null;
      return data.file_data;
    } catch (err) {
      console.error('Erro inesperado ao baixar anexo:', err);
      return null;
    }
  }, [attachments]);

  return (
    <AttachmentContext.Provider value={{ attachments, addAttachment, deleteAttachment, getAttachments, downloadAttachment }}>
      {children}
    </AttachmentContext.Provider>
  );
}

export function useAttachments() {
  const ctx = useContext(AttachmentContext);
  if (!ctx) throw new Error('useAttachments must be used within AttachmentProvider');
  return ctx;
}

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

type AttachmentPayload = Omit<Attachment, 'id' | 'createdAt'> & { dataUrl: string };

interface AttachmentState {
  attachments: Attachment[];
  addAttachment: (a: AttachmentPayload) => Promise<boolean>;
  deleteAttachment: (id: string) => Promise<boolean>;
  getAttachments: (entityType: string, entityId: string) => Attachment[];
  downloadAttachment: (id: string) => Promise<string | null>;
}

const AttachmentContext = createContext<AttachmentState | null>(null);
const METADATA_SELECT = 'id, entity_type, entity_id, file_name, file_size, file_type, created_at';

function mapRow(r: any): Attachment {
  return {
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    fileName: r.file_name,
    fileSize: r.file_size,
    fileType: r.file_type,
    createdAt: r.created_at,
  };
}

export function AttachmentProvider({ children }: { children: React.ReactNode }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase.from('attachments').select(METADATA_SELECT).then(({ data, error }) => {
      if (!mounted || error || !data) return;

      const mapped = data.map(mapRow);
      setAttachments(prev => {
        if (prev.length === 0) return mapped;

        const merged = new Map(prev.map(a => [a.id, a]));
        mapped.forEach(a => merged.set(a.id, a));
        return Array.from(merged.values());
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const addAttachment = useCallback(async (a: AttachmentPayload): Promise<boolean> => {
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        entity_type: a.entityType,
        entity_id: a.entityId,
        file_name: a.fileName,
        file_size: a.fileSize,
        file_type: a.fileType,
        file_data: a.dataUrl,
      })
      .select(METADATA_SELECT)
      .single();

    if (error || !data) {
      console.error('Falha ao salvar anexo', error);
      return false;
    }

    const next = mapRow(data);
    setAttachments(prev => (prev.some(item => item.id === next.id) ? prev : [...prev, next]));
    return true;
  }, []);

  const deleteAttachment = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('attachments').delete().eq('id', id);

    if (error) {
      console.error('Falha ao remover anexo', error);
      return false;
    }

    setAttachments(prev => prev.filter(a => a.id !== id));
    return true;
  }, []);

  const getAttachments = useCallback((entityType: string, entityId: string) => {
    return attachments.filter(a => a.entityType === entityType && a.entityId === entityId);
  }, [attachments]);

  const downloadAttachment = useCallback(async (id: string): Promise<string | null> => {
    try {
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
      return (data as any).file_data;
    } catch (err) {
      console.error('Erro inesperado ao baixar anexo:', err);
      return null;
    }
  }, []);

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

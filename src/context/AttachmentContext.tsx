import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  dataUrl: string;
  createdAt: string;
}

interface AttachmentState {
  attachments: Attachment[];
  addAttachment: (a: Omit<Attachment, 'id' | 'createdAt'>) => void;
  deleteAttachment: (id: string) => void;
  getAttachments: (entityType: string, entityId: string) => Attachment[];
}

const AttachmentContext = createContext<AttachmentState | null>(null);

function mapRow(r: any): Attachment {
  return {
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    fileName: r.file_name,
    fileSize: r.file_size,
    fileType: r.file_type,
    dataUrl: r.file_data,
    createdAt: r.created_at,
  };
}

export function AttachmentProvider({ children }: { children: React.ReactNode }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    supabase.from('attachments').select('*').then(({ data }) => {
      if (data) setAttachments(data.map(mapRow));
    });
  }, []);

  const addAttachment = useCallback(async (a: Omit<Attachment, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('attachments').insert({
      entity_type: a.entityType,
      entity_id: a.entityId,
      file_name: a.fileName,
      file_size: a.fileSize,
      file_type: a.fileType,
      file_data: a.dataUrl,
    }).select().single();
    if (data && !error) {
      setAttachments(prev => [...prev, mapRow(data)]);
    }
  }, []);

  const deleteAttachment = useCallback(async (id: string) => {
    await supabase.from('attachments').delete().eq('id', id);
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAttachments = useCallback((entityType: string, entityId: string) => {
    return attachments.filter(a => a.entityType === entityType && a.entityId === entityId);
  }, [attachments]);

  return (
    <AttachmentContext.Provider value={{ attachments, addAttachment, deleteAttachment, getAttachments }}>
      {children}
    </AttachmentContext.Provider>
  );
}

export function useAttachments() {
  const ctx = useContext(AttachmentContext);
  if (!ctx) throw new Error('useAttachments must be used within AttachmentProvider');
  return ctx;
}

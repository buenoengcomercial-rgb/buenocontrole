import React, { createContext, useContext, useState, useCallback } from 'react';

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

export function AttachmentProvider({ children }: { children: React.ReactNode }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const addAttachment = useCallback((a: Omit<Attachment, 'id' | 'createdAt'>) => {
    setAttachments(prev => [...prev, { ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  }, []);

  const deleteAttachment = useCallback((id: string) => {
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

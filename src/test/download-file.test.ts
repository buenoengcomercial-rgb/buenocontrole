import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadUrlAsFile } from '@/lib/downloadFile';

describe('downloadUrlAsFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('baixa o arquivo por uma URL local sem navegar para o Storage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['arquivo'], { type: 'image/jpeg' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const createObjectURL = vi.fn().mockReturnValue('blob:arquivo-local');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    let clickedHref = '';
    let clickedDownload = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clickedHref = this.href;
      clickedDownload = this.download;
    });

    await downloadUrlAsFile('https://storage.exemplo/arquivo-assinado', 'comprovante.jpeg');

    expect(fetchMock).toHaveBeenCalledWith('https://storage.exemplo/arquivo-assinado');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickedHref).toBe('blob:arquivo-local');
    expect(clickedDownload).toBe('comprovante.jpeg');
  });
});

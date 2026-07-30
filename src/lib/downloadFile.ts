export async function downloadUrlAsFile(fileUrl: string, fileName: string) {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);

  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

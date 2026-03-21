import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, CheckCircle, FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

export interface ImportRow {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  price: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: ImportRow[]) => void;
}

function parseExcel(data: ArrayBuffer): ImportRow[] {
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  if (json.length < 2) return [];

  const header = (json[0] as unknown[]).map((h) => String(h ?? "").toLowerCase().trim());
  const colMap = { code: -1, description: -1, unit: -1, quantity: -1, price: -1 };

  header.forEach((h, i) => {
    if (/c[óo]d/i.test(h)) colMap.code = i;
    else if (/desc|material|item|produto|resumo/i.test(h)) colMap.description = i;
    else if (/^un$|unid|^ud$/i.test(h)) colMap.unit = i;
    else if (/qt|quant/i.test(h)) colMap.quantity = i;
    else if (/pre[çc]o|valor|custo|p\.?\s*unit/i.test(h)) colMap.price = i;
  });

  if (colMap.description === -1) {
    const cols = header.length;
    if (cols >= 5) { colMap.code = 0; colMap.description = 1; colMap.unit = 2; colMap.quantity = 3; colMap.price = 4; }
    else if (cols >= 4) { colMap.description = 0; colMap.unit = 1; colMap.quantity = 2; colMap.price = 3; }
    else if (cols >= 3) { colMap.description = 0; colMap.quantity = 1; colMap.price = 2; }
  }

  const rows: ImportRow[] = [];
  for (let r = 1; r < json.length; r++) {
    const row = json[r] as unknown[];
    if (!row || row.length === 0) continue;
    const desc = colMap.description >= 0 ? String(row[colMap.description] ?? "").trim() : "";
    if (!desc) continue;
    rows.push({
      id: crypto.randomUUID(),
      code: colMap.code >= 0 ? String(row[colMap.code] ?? "").trim() : String(r),
      description: desc,
      unit: colMap.unit >= 0 ? String(row[colMap.unit] ?? "").trim() : "UN",
      quantity: colMap.quantity >= 0 ? String(row[colMap.quantity] ?? "0").trim() : "0",
      price: colMap.price >= 0 ? String(row[colMap.price] ?? "0").trim() : "0",
    });
  }
  return rows;
}

export function ImportItemsDialog({ open, onOpenChange, onImport }: Props) {
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setPreviewRows([]); setFileName(""); setError(""); setStep("upload"); };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      if (/\.xlsx?$/i.test(file.name)) {
        const buf = await file.arrayBuffer();
        const rows = parseExcel(buf);
        if (rows.length === 0) { setError("Nenhum dado encontrado no arquivo."); return; }
        setPreviewRows(rows);
        setStep("preview");
      } else {
        setError("Formato não suportado. Use .xlsx ou .xls");
      }
    } catch {
      setError("Erro ao ler o arquivo. Verifique o formato.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateRow = (id: string, field: keyof ImportRow, value: string) => {
    setPreviewRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id: string) => {
    setPreviewRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleConfirm = () => {
    const validRows = previewRows.filter((r) => r.description.trim() && r.quantity.trim());
    if (validRows.length > 0) {
      onImport(validRows);
      handleClose(false);
    } else {
      setError("Nenhum item válido para importar.");
    }
  };

  const invalidCount = previewRows.filter((r) => !r.description.trim() || !r.quantity.trim()).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar Materiais
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-full bg-muted p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Arraste ou selecione um arquivo</p>
              <p className="text-xs text-muted-foreground">Formatos aceitos: Excel (.xlsx, .xls)</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Selecionar arquivo
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>{fileName}</span>
                <span>•</span>
                <span>{previewRows.length} itens encontrados</span>
                {invalidCount > 0 && (
                  <span className="text-destructive">• {invalidCount} com dados incompletos</span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>Novo arquivo</Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex-1 overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/80">
                    <th className="w-20 px-2 py-1.5 text-left font-semibold text-muted-foreground">Código</th>
                    <th className="min-w-[200px] px-2 py-1.5 text-left font-semibold text-muted-foreground">Descrição *</th>
                    <th className="w-16 px-2 py-1.5 text-left font-semibold text-muted-foreground">Unidade</th>
                    <th className="w-20 px-2 py-1.5 text-left font-semibold text-muted-foreground">Qtd *</th>
                    <th className="w-24 px-2 py-1.5 text-left font-semibold text-muted-foreground">Preço Base</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => {
                    const hasError = !row.description.trim() || !row.quantity.trim();
                    return (
                      <tr key={row.id} className={`border-b border-border ${hasError ? "bg-destructive/5" : "hover:bg-muted/30"}`}>
                        <td className="px-1 py-0.5">
                          <Input value={row.code} onChange={(e) => updateRow(row.id, "code", e.target.value)}
                            className="h-6 text-xs border-transparent bg-transparent hover:border-border focus:border-primary" />
                        </td>
                        <td className="px-1 py-0.5">
                          <Input value={row.description} onChange={(e) => updateRow(row.id, "description", e.target.value)}
                            className={`h-6 text-xs border-transparent bg-transparent hover:border-border focus:border-primary ${!row.description.trim() ? "border-destructive/50" : ""}`}
                            placeholder="Descrição obrigatória" />
                        </td>
                        <td className="px-1 py-0.5">
                          <Input value={row.unit} onChange={(e) => updateRow(row.id, "unit", e.target.value)}
                            className="h-6 text-xs border-transparent bg-transparent hover:border-border focus:border-primary" />
                        </td>
                        <td className="px-1 py-0.5">
                          <Input value={row.quantity} onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                            className={`h-6 text-xs border-transparent bg-transparent hover:border-border focus:border-primary ${!row.quantity.trim() ? "border-destructive/50" : ""}`}
                            placeholder="0" />
                        </td>
                        <td className="px-1 py-0.5">
                          <Input value={row.price} onChange={(e) => updateRow(row.id, "price", e.target.value)}
                            className="h-6 text-xs border-transparent bg-transparent hover:border-border focus:border-primary"
                            placeholder="0,00" />
                        </td>
                        <td className="px-1 py-0.5">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeRow(row.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">* Campos obrigatórios: Descrição e Quantidade</p>
              <Button size="sm" className="gap-1.5" onClick={handleConfirm} disabled={previewRows.length === 0}>
                <CheckCircle className="h-3.5 w-3.5" />
                Adicionar à cotação ({previewRows.length - invalidCount} itens)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

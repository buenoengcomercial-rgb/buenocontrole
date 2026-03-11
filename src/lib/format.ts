export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

export function formatCNPJ(cnpj: string): string {
  return cnpj;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);
}

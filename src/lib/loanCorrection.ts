type LoanRecord = {
  id: string;
  company: string;
  date: string;
  service_category: string | null;
  value: number;
};

export function findVodelinaLoanToCorrect<T extends LoanRecord>(rows: T[]): T | null {
  const matches = rows.filter(row =>
    row.company.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === 'VO DELINA' &&
    row.date === '2026-05-01' &&
    row.service_category === 'emprestimo'
  );

  if (matches.length !== 1) return null;
  return [150000, 250000].includes(Number(matches[0].value)) ? matches[0] : null;
}

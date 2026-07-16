// src/utils/format.ts
//
// Helpers de formatação compartilhados entre as telas.

/** Data de hoje no formato DD-MM-AAAA (usado em nomes de arquivo exportados). */
export const getFormattedDate = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/** Data curta em pt-BR (DD/MM/AAAA). Aceita string ISO ou Date. */
export const formatDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString('pt-BR');

/** Data e hora em pt-BR. Aceita string ISO ou Date. */
export const formatDateTime = (value: string | Date): string =>
  new Date(value).toLocaleString('pt-BR');

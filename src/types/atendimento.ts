// src/types/atendimento.ts

// Define os valores exatos que o status pode ter.
// Isso evita erros de digitação no resto do código.
export const statusOptions = [
  'Em andamento',
  'Concluído',
  'Pendente de Peça',
  'Pendente de Fornecedor',
  'Não foi possível atender',
  'Improdutivo',
  'Pendente de Telecom',
  'Pendente de Suporte',
  'Pendente de Implantação',
] as const;

// Cria um tipo a partir do array acima
export type Status = typeof statusOptions[number];

// Define a estrutura principal de um atendimento
export type Atendimento = {
  id: string; // Um identificador único para cada atendimento
  numeroChamado: string;
  numeroLogicoTerminal: string;
  solicitacao: string;
  dataInicio: string; // Usaremos string no formato ISO (ex: "2025-07-07T21:15:00.000Z")
  diagnosticoSolucao: string;
  dataFim: string | null; // Pode ser nulo se o atendimento estiver em aberto
  causaReal: string;
  status: Status;
  detalhePendencia?: string;
};
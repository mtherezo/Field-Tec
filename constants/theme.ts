// constants/theme.ts
//
// Paleta unificada do app. Centralizar aqui evita as cores "mágicas"
// espalhadas pelas telas (#3e2961, #c7d8c4, etc.) e mantém a identidade
// visual consistente entre Atendimentos, Busca, Detalhe, Formulário e Relatórios.

import { Status } from '@/src/types/atendimento';

export const AppColors = {
  // Fundo principal (roxo da marca)
  background: '#3e2961',
  backgroundElevated: '#4b3475',

  // Superfícies / cards
  surface: '#c7d8c4',
  surfaceAlt: '#d1d7dd',
  surfaceInput: '#ffffff',

  // Texto
  textOnBackground: '#ffffff',
  textMuted: '#cdc7db',
  textPrimary: '#1f2430',
  textSecondary: '#4b5563',

  // Ações
  primary: '#007AFF',
  danger: '#DC3545',
  success: '#28a745',
  excel: '#28a745',
  pdf: '#DC3545',

  // Bordas / sombras
  border: '#e5e7eb',
  shadow: '#000000',
} as const;

// Cor de destaque + cor de texto para cada status.
// Antes vários status caíam todos em "orange" e ficavam indistinguíveis.
type StatusStyle = { backgroundColor: string; color: string };

const STATUS_STYLES: Record<Status, StatusStyle> = {
  'Concluído': { backgroundColor: '#28a745', color: '#ffffff' },
  'Em andamento': { backgroundColor: '#007AFF', color: '#ffffff' },
  'Pendente de Peça': { backgroundColor: '#F59E0B', color: '#1f2430' },
  'Pendente de Fornecedor': { backgroundColor: '#EA580C', color: '#ffffff' },
  'Pendente de Telecom': { backgroundColor: '#8B5CF6', color: '#ffffff' },
  'Pendente de Suporte': { backgroundColor: '#0D9488', color: '#ffffff' },
  'Pendente de Implantação': { backgroundColor: '#6366F1', color: '#ffffff' },
  'Não foi possível atender': { backgroundColor: '#DC3545', color: '#ffffff' },
  'Improdutivo': { backgroundColor: '#6B7280', color: '#ffffff' },
};

const FALLBACK_STATUS_STYLE: StatusStyle = { backgroundColor: '#6B7280', color: '#ffffff' };

/** Retorna a cor de fundo e de texto para um status (com fallback seguro). */
export const getStatusStyle = (status: string): StatusStyle =>
  STATUS_STYLES[status as Status] ?? FALLBACK_STATUS_STYLE;

/** Atalho para quem só precisa da cor de fundo do badge. */
export const getStatusColor = (status: string): string =>
  getStatusStyle(status).backgroundColor;

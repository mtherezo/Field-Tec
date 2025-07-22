// src/store/atendimentoStore.ts

import { create } from 'zustand';
import { Atendimento } from '../types/atendimento';
// IMPORTAR AS FUNÇÕES DO SQLITE
import {
  getAtendimentosFromDB,
  addAtendimentoToDB,
  updateAtendimentoInDB,
  deleteAtendimentoFromDB,
} from '../services/databaseService';

// interface da store
interface AtendimentoState {
  atendimentos: Atendimento[];
  isLoading: boolean;
  initializeAtendimentos: () => Promise<void>;
  addAtendimento: (novoAtendimento: Atendimento) => Promise<void>;
  updateAtendimento: (atendimentoAtualizado: Atendimento) => Promise<void>;
  removeAtendimento: (atendimentoId: string) => Promise<void>;
}

export const useAtendimentoStore = create<AtendimentoState>((set, get) => ({
  atendimentos: [],
  isLoading: true,

  // A INICIALIZAÇÃO BUSCA DO SQLITE
  initializeAtendimentos: async () => {
    // Não mostra o loading novamente se já tiver dados
    if (!get().isLoading) {
        set({ isLoading: true });
    }
    const dadosDoDB = await getAtendimentosFromDB();
    // Ordena os dados na memória após buscá-los
    dadosDoDB.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
    set({ atendimentos: dadosDoDB, isLoading: false });
  },

  // AS AÇÕES SALVAM NO SQLITE E ATUALIZAM A MEMÓRIA
  addAtendimento: async (novoAtendimento) => {
    await addAtendimentoToDB(novoAtendimento);
    // Recarrega a lista da fonte da verdade (o DB) para garantir consistência
    await get().initializeAtendimentos();
  },

  updateAtendimento: async (atendimentoAtualizado) => {
    await updateAtendimentoInDB(atendimentoAtualizado);
    await get().initializeAtendimentos();
  },

  removeAtendimento: async (atendimentoId) => {
    await deleteAtendimentoFromDB(atendimentoId);
    await get().initializeAtendimentos();
  },
}));

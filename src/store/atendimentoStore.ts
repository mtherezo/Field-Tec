// src/store/atendimentoStore.ts

import { create } from 'zustand';
import { Atendimento } from '../types/atendimento';
// ✅ 1. IMPORTAR AS FUNÇÕES CORRETAS E ATUALIZADAS
import {
  performStartupDbTasks, // A nova função de inicialização e migração
  getAtendimentosFromDB,
  addAtendimentoToDB,
  updateAtendimentoInDB,
  deleteAtendimentoFromDB,
  deleteAllAtendimentosFromDB,
} from '../services/databaseService';

interface AtendimentoState {
  atendimentos: Atendimento[];
  isLoading: boolean;
  initializeAtendimentos: () => Promise<void>;
  addAtendimento: (novoAtendimento: Atendimento) => Promise<void>;
  updateAtendimento: (atendimentoAtualizado: Atendimento) => Promise<void>;
  removeAtendimento: (atendimentoId: string) => Promise<void>;
  clearAllAtendimentos: () => Promise<void>;
}

export const useAtendimentoStore = create<AtendimentoState>((set, get) => ({
  atendimentos: [],
  isLoading: true,

  // ✅ 2. FUNÇÃO DE INICIALIZAÇÃO CORRIGIDA
  initializeAtendimentos: async () => {
    try {
      if (!get().isLoading) set({ isLoading: true });
      
      // Chama a função única que prepara o DB e migra os dados
      await performStartupDbTasks();
      
      // AGORA, com a tabela pronta, busca os dados
      const dadosDoDB = await getAtendimentosFromDB();
      
      dadosDoDB.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
      
      set({ atendimentos: dadosDoDB, isLoading: false });
    } catch (error) {
      console.error("Falha ao inicializar a store:", error);
      set({ isLoading: false });
    }
  },

  addAtendimento: async (novoAtendimento) => {
    await addAtendimentoToDB(novoAtendimento);
    // Recarrega tudo do DB para garantir que a lista esteja sempre atualizada
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

  clearAllAtendimentos: async () => {
    await deleteAllAtendimentosFromDB();
    set({ atendimentos: [] });
  },
}));

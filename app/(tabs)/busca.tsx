// app/(tabs)/busca.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  Keyboard,
  Pressable,
} from 'react-native';
import { Atendimento } from '@/src/types/atendimento';
import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const AtendimentoItem = ({ item }: { item: Atendimento }) => {
    const router = useRouter();
    const handleNavigate = () => {
        router.push({
            pathname: "/atendimento/[id]",
            params: { id: item.id },
        });
    };
    return (
        <Pressable style={styles.itemContainer} onPress={handleNavigate}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.numeroChamado}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            {item.status.includes('Pendente') && item.detalhePendencia && (
                <View style={styles.pendenciaRow}>
                    <FontAwesome name="info-circle" size={14} color="#B45309" />
                    <Text style={styles.pendenciaText}>{item.detalhePendencia}</Text>
                </View>
            )}
            <Text style={styles.itemSubtitle}>Causa Real: {item.causaReal || 'Não informada'}</Text>
            <Text style={styles.itemText}>Solução: {item.diagnosticoSolucao || 'Não informada'}</Text>
            <Text style={styles.itemDate}>
                Data: {new Date(item.dataInicio).toLocaleDateString('pt-BR')}
            </Text>
        </Pressable>
    );
};

const getStatusColor = (status: string) => {
    if (status === 'Concluído') return '#28a745';
    if (status.includes('Pendente')) return '#ffc107';
    return 'orange';
};

type AnaliseProblemas = {
  [problema: string]: number;
};

export default function BuscaScreen() {
  const { atendimentos } = useAtendimentoStore();
  const params = useLocalSearchParams<{ terminalId?: string }>();
  const router = useRouter(); // Adicionado para limpar os parâmetros

  const [terminalId, setTerminalId] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [analise, setAnalise] = useState<AnaliseProblemas>({});
  const [pesquisaFeita, setPesquisaFeita] = useState(false);

  const handleSearch = (idParaBuscar?: string) => {
    Keyboard.dismiss();
    setPesquisaFeita(true);

    const termoBusca = (idParaBuscar || terminalId).trim();
    
    const filtrados = atendimentos.filter(
      (at) => at.numeroLogicoTerminal === termoBusca
    );
    filtrados.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
    setResultados(filtrados);

    const contagem: AnaliseProblemas = {};
    for (const atendimento of filtrados) {
      const problema = atendimento.causaReal || 'Causa não informada';
      contagem[problema] = (contagem[problema] || 0) + 1;
    }
    setAnalise(contagem);
  };

  // FUNÇÃO PARA LIMPAR A BUSCA
  const handleClear = () => {
    Keyboard.dismiss();
    setTerminalId('');
    setResultados([]);
    setAnalise({});
    setPesquisaFeita(false);
    // Limpa os parâmetros da rota para não re-buscar ao focar novamente
    router.setParams({ terminalId: undefined });
  };

  // ✅ useFocusEffect MODIFICADO (SEM LIMPEZA AUTOMÁTICA)
  useFocusEffect(
    React.useCallback(() => {
      // Se um terminalId foi passado como parâmetro E é diferente do que já está na tela
      if (params.terminalId && params.terminalId !== terminalId) {
        setTerminalId(params.terminalId);
        handleSearch(params.terminalId);
      }
    }, [params.terminalId])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Busca por Terminal' }} />
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite o Nº Lógico do Terminal"
          value={terminalId}
          onChangeText={setTerminalId}
          keyboardType="numeric"
          onSubmitEditing={() => handleSearch()}
        />
        {/* ✅ BOTÃO DE LIMPAR ADICIONADO */}
        <View style={styles.buttonContainer}>
          {pesquisaFeita && <Button title="Limpar" onPress={handleClear} color="#DC3545" />}
          <Button title="Buscar" onPress={() => handleSearch()} />
        </View>
      </View>

      {pesquisaFeita && resultados.length === 0 && (
          <Text style={styles.emptyText}>Nenhum histórico encontrado para este terminal.</Text>
      )}

      {resultados.length > 0 && (
        <FlatList
          data={resultados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AtendimentoItem item={item} />}
          ListHeaderComponent={() => (
            <View style={styles.analiseContainer}>
              <Text style={styles.analiseTitle}>Problemas Recorrentes</Text>
              {Object.entries(analise)
                .sort(([, a], [, b]) => b - a)
                .map(([problema, count]) => (
                <Text key={problema} style={styles.analiseItem}>
                  • {problema}: <Text style={{fontWeight: 'bold'}}>{count} vez(es)</Text>
                </Text>
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3e2961ff' },
  searchContainer: { flexDirection: 'row', padding: 16, marginHorizontal: 16, marginTop: 8, backgroundColor: '#c7d8c4ff', alignItems: 'center' },
  input: { flex: 1, height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginRight: 10, backgroundColor: 'white' },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'white', fontWeight: 'bold' },
  analiseContainer: { padding: 16, backgroundColor: '#c7d8c4ff', marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  analiseTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  analiseItem: { fontSize: 15, marginBottom: 4 },
  itemContainer: { backgroundColor: '#c7d8c4ff', borderRadius: 12, padding: 16, marginVertical: 8, marginHorizontal: 16, borderWidth: 1, borderColor: '#EFEFEF', shadowColor: "#555", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 3.84, elevation: 5 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, color: 'black', fontWeight: 'bold' },
  itemSubtitle: { fontSize: 14, color: '#333', fontWeight: '600', marginTop: 8 },
  itemText: { fontSize: 14, color: '#26271eff', marginTop: 4 },
  itemDate: { fontSize: 12, color: '#26271eff', marginTop: 8, textAlign: 'right' },
  pendenciaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dabe52ff', borderRadius: 6, padding: 8, marginTop: 8 },
  pendenciaText: { marginLeft: 8, fontSize: 14, color: '#803a04ff', fontStyle: 'italic', flex: 1 },
});

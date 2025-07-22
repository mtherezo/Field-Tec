// app/(tabs)/busca.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Keyboard, Pressable, } from 'react-native';
import { Atendimento } from '../../src/types/atendimento';
import { getAtendimentos } from '../../src/services/storageService';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons'; // Adicionado para os ícones
import { SafeAreaView } from 'react-native-safe-area-context'; // Adicionado para layout seguro

// Componente de Item atualizado
const AtendimentoItem = ({ item }: { item: Atendimento }) => {
    const router = useRouter();
    
    const handleNavigate = () => {
        router.push({
            pathname: "/atendimento/[id]",
            params: { id: item.id },
        });
    };

    return (
        // O card é clicável
        <Pressable style={styles.itemContainer} onPress={handleNavigate}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.numeroChamado}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            {/* BLOCO CONDICIONAL PARA EXIBIR A PENDÊNCIA */}
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

// Função de cores
const getStatusColor = (status: string) => {
    if (status === 'Concluído') return '#28a745';
    if (status.includes('Pendente')) return '#ffc107';
    return 'orange';
};

type AnaliseProblemas = {
  [problema: string]: number;
};

export default function BuscaScreen() {
  const [terminalId, setTerminalId] = useState('');
  const [todosAtendimentos, setTodosAtendimentos] = useState<Atendimento[]>([]);
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [analise, setAnalise] = useState<AnaliseProblemas>({});
  const [pesquisaFeita, setPesquisaFeita] = useState(false);

  useEffect(() => {
    const carregarDadosIniciais = async () => {
      const dados = await getAtendimentos();
      setTodosAtendimentos(dados);
    };
    carregarDadosIniciais();
  }, []);

  const handleSearch = () => {
    Keyboard.dismiss();
    setPesquisaFeita(true);

    const filtrados = todosAtendimentos.filter(
      (at) => at.numeroLogicoTerminal === terminalId.trim()
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

  return (
    // Envolvido com SafeAreaView para garantir o espaçamento correto
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Busca por Terminal' }} />
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite o Nº Lógico do Terminal"
          value={terminalId}
          onChangeText={setTerminalId}
          keyboardType="numeric"
          onSubmitEditing={handleSearch}
        />
        <Button title="Buscar" onPress={handleSearch} />
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


// ESTILOS
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#3e2961ff' 
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16, 
    marginTop: 8, 
    backgroundColor: '#c7d8c4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: 'white',
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 20, 
    fontSize: 16, 
    color: '#666' 
  },
  analiseContainer: { 
    padding: 16, 
    backgroundColor: '#c7d8c4ff', 
    marginHorizontal: 16, 
    marginTop: 8, 
    borderRadius: 8 
  },
  analiseTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  analiseItem: { 
    fontSize: 15, 
    marginBottom: 4 
  },
  
  itemContainer: {
    backgroundColor: '#c7d8c4ff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: "#555",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'black',
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginTop: 8
  },
  itemText: {
    fontSize: 14,
    color: '#26271eff',
    marginTop: 4
  },
  itemDate: {
    fontSize: 12,
    color: '#26271eff',
    marginTop: 8,
    textAlign: 'right'
  },
  pendenciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dabe52ff',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  pendenciaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#803a04ff',
    fontStyle: 'italic',
    flex: 1,
  },
});
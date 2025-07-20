// app/(tabs)/index.tsx

// ✅ 1. IMPORTAR useColorScheme
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, Modal, useColorScheme } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

import { Atendimento, Status, statusOptions } from '../../src/types/atendimento';
import { getAtendimentos } from '../../src/services/storageService';

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
      <View style={styles.itemBody}>
        <View style={styles.infoRow}>
          <FontAwesome name="desktop" size={14} color="#666" style={styles.icon} />
          <Text style={styles.infoText}>{item.numeroLogicoTerminal}</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="commenting-o" size={14} color="#666" style={styles.icon} />
          <Text style={styles.infoText} numberOfLines={1}>{item.solicitacao}</Text>
        </View>
      </View>

      {item.status.includes('Pendente') && item.detalhePendencia && (
        <View style={styles.pendenciaRow}>
          <FontAwesome name="info-circle" size={14} color="#B45309" />
          <Text style={styles.pendenciaText}>{item.detalhePendencia}</Text>
        </View>
      )}

      <View style={styles.itemFooter}>
        <FontAwesome name="calendar" size={14} color="#666" style={styles.icon} />
        <Text style={styles.infoText}>
          {new Date(item.dataInicio).toLocaleDateString('pt-BR')}
        </Text>
      </View>
    </Pressable>
  );
};

const getStatusColor = (status: string) => {
  if (status === 'Concluído') return '#28a745';
  if (status.includes('Pendente')) return '#ffc107';
  return 'orange';
};

export default function ListaAtendimentosScreen() {
  // ✅ 2. DETECTAR O TEMA ATUAL DO CELULAR
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | Status>('Todos');

  useFocusEffect(
    useCallback(() => {
      const carregarDados = async () => {
        setIsLoading(true);
        const dadosSalvos = await getAtendimentos();
        dadosSalvos.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
        setAtendimentos(dadosSalvos);
        setIsLoading(false);
      };
      carregarDados();
    }, [])
  );

  const atendimentosFiltrados = atendimentos.filter(atendimento => {
    if (filtroStatus === 'Todos') {
      return true;
    }
    return atendimento.status === filtroStatus;
  });

  const handleExportData = async () => {
    const data = atendimentosFiltrados;
    if (data.length === 0) {
      Alert.alert("Sem Dados", "Não há atendimentos para exportar com o filtro atual.");
      return;
    }
    const headerString = 'ID,Numero Chamado,Numero Terminal,Solicitacao,Diagnostico,Causa Real,Status,Data Inicio,Data Fim,Detalhe Pendencia\n';
    const rowString = data.map(atendimento => {
      const cleanedSolicitacao = `"${atendimento.solicitacao.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const cleanedDiagnostico = `"${atendimento.diagnosticoSolucao.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const cleanedCausa = `"${atendimento.causaReal.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const cleanedPendencia = `"${(atendimento.detalhePendencia || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      return `${atendimento.id},${atendimento.numeroChamado},${atendimento.numeroLogicoTerminal},${cleanedSolicitacao},${cleanedDiagnostico},${cleanedCausa},${atendimento.status},${atendimento.dataInicio},${atendimento.dataFim || ''},${cleanedPendencia}\n`;
    }).join('');
    const csvString = `${headerString}${rowString}`;
    try {
      const fileUri = FileSystem.documentDirectory + 'atendimentos.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar atendimentos' });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível exportar os dados.");
    }
  };

  const generateHtmlForPdf = (data: Atendimento[]) => {
    const atendimentosHtml = data.map(at => `
      <tr>
        <td>${at.numeroChamado}</td>
        <td>${at.numeroLogicoTerminal}</td>
        <td>${at.status}</td>
        <td>${at.detalhePendencia || ''}</td>
        <td>${new Date(at.dataInicio).toLocaleDateString('pt-BR')}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, sans-serif; color: #333; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; text-align: left; padding: 8px; font-size: 10px; }
            th { background-color: #f2f2f2; }
            h1 { text-align: center; color: #3e2961ff; }
            p { font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Atendimentos</h1>
          <p><strong>Filtro Aplicado:</strong> ${filtroStatus}</p>
          <p><strong>Total de Registros:</strong> ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Terminal</th>
                <th>Status</th>
                <th>Detalhe Pendência</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${atendimentosHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    const data = atendimentosFiltrados;
    if (data.length === 0) {
      Alert.alert("Sem Dados", "Não há atendimentos para exportar em PDF com o filtro atual.");
      return;
    }

    try {
      const htmlContent = generateHtmlForPdf(data);
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar Relatório PDF',
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível gerar o arquivo PDF.");
    }
  };

  const isFiltroAtivo = filtroStatus !== 'Todos';

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Filtrar por Status</Text>
            {['Todos', ...statusOptions].map(status => (
              <Pressable key={status} style={styles.modalOption} onPress={() => { setFiltroStatus(status as any); setModalVisible(false); }}>
                <Text style={styles.modalOptionText}>{status}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Stack.Screen
        options={{
          title: 'Atendimentos',
          headerRight: () => {
            // ✅ 3. DEFINIR A COR DO ÍCONE COM BASE NO TEMA
            // Se o tema for escuro, a cor é branca. Se for claro, a cor é preta.
            const iconColor = colorScheme === 'dark' ? 'white' : 'black';

            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
                <Pressable onPress={() => setModalVisible(true)}>
                  {/* O ícone de filtro agora usa a cor dinâmica quando não está ativo */}
                  <FontAwesome name="filter" size={24} color={isFiltroAtivo ? '#007AFF' : iconColor} />
                </Pressable>
                <Pressable onPress={handleExportPdf}>
                  <FontAwesome name="file-pdf-o" size={24} color="#DC3545" />
                </Pressable>
                <Pressable onPress={handleExportData}>
                  <FontAwesome name="file-excel-o" size={24} color="#28a745" />
                </Pressable>
                <Pressable onPress={() => router.push('/novoAtendimento')}>
                  {/* O ícone de adicionar agora usa a cor dinâmica */}
                  <FontAwesome name="plus-circle" size={28} color={iconColor} />
                </Pressable>
              </View>
            );
          },
        }}
      />

      <FlatList
        data={atendimentosFiltrados}
        renderItem={({ item }) => <AtendimentoItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 8 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{isFiltroAtivo ? 'Nenhum atendimento encontrado com este filtro' : 'Nenhum atendimento cadastrado.'}</Text>
            {!isFiltroAtivo && <Text style={styles.emptySubtext}>Clique no '+' acima para começar.</Text>}
          </View>
        )}
      />
    </View>
  );
}

// Seus estilos personalizados mantidos
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#3e2961ff' 
  },
  loader: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  itemContainer: { 
    backgroundColor: '#c7d8c4ff', 
    borderRadius: 12,
    padding: 16, 
    marginVertical: 8, 
    marginHorizontal: 12, 
    borderWidth: 1, 
    borderColor: '#EFEFEF', 
    shadowColor: "#555", 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 3.84, 
    elevation: 5 
  },
  itemHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  itemTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    flex: 1 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12 
  },
  statusText: { 
    fontSize: 12, 
    color: 'black', 
    fontWeight: 'bold' 
  },
  itemBody: { 
    marginBottom: 8, 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  icon: { 
    marginRight: 8 
  },
  infoText: { 
    fontSize: 15, 
    color: '#444', 
    fontWeight: 'bold',
    flex: 1
  },
  pendenciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9dba5ff',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEEBC8',
  },
  pendenciaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#994606ff',
    fontStyle: 'italic',
    flex: 1,
  },
  itemFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0', 
    paddingTop: 8, 
    marginTop: 4 
  },
  emptyContainer: { 
    flex: 1, 
    marginTop: '50%', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyText: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#ccc', 
    marginTop: 8 
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)' 
  },
  modalView: { 
    margin: 20, 
    backgroundColor: '#d1d7ddff', 
    borderRadius: 20, 
    padding: 25, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 4, 
    elevation: 5, 
    width: '80%' 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 15 
  },
  modalOption: { 
    width: '100%', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  modalOptionText: { 
    textAlign: 'center', 
    fontSize: 15, 
    color: '#3b0653ff'
  },
});
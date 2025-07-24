// app/(tabs)/index.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, Modal, useColorScheme, Button } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';

import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { Atendimento, Status, statusOptions } from '@/src/types/atendimento';

const AtendimentoItem = ({ item }: { item: Atendimento }) => {
  const router = useRouter();
  const handleNavigate = () => { router.push({ pathname: "/atendimento/[id]", params: { id: item.id } }); };
  return (
    <Pressable style={styles.itemContainer} onPress={handleNavigate}>
      <View style={styles.itemHeader}><Text style={styles.itemTitle}>{item.numeroChamado}</Text><View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}><Text style={styles.statusText}>{item.status}</Text></View></View>
      <View style={styles.itemBody}><View style={styles.infoRow}><FontAwesome name="desktop" size={14} color="#666" style={styles.icon} /><Text style={styles.infoText}>{item.numeroLogicoTerminal}</Text></View><View style={styles.infoRow}><FontAwesome name="commenting-o" size={14} color="#666" style={styles.icon} /><Text style={styles.infoText} numberOfLines={1}>{item.solicitacao}</Text></View></View>
      {item.status.includes('Pendente') && item.detalhePendencia && (<View style={styles.pendenciaRow}><FontAwesome name="info-circle" size={14} color="#B45309" /><Text style={styles.pendenciaText}>{item.detalhePendencia}</Text></View>)}
      <View style={styles.itemFooter}><FontAwesome name="calendar" size={14} color="#666" style={styles.icon} /><Text style={styles.infoText}>{new Date(item.dataInicio).toLocaleDateString('pt-BR')}</Text></View>
    </Pressable>
  );
};
const getStatusColor = (status: string) => {
  if (status === 'Concluído') return '#28a745';
  if (status.includes('Pendente')) return '#ffc107';
  return 'orange';
};

export default function ListaAtendimentosScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const { atendimentos, isLoading, initializeAtendimentos, addAtendimento } = useAtendimentoStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  
  // ✅ 1. ESTADO DO FILTRO DE STATUS AGORA É UM ARRAY
  const [filtroStatus, setFiltroStatus] = useState<Status[]>([]);
  // Estado temporário para as seleções dentro do modal
  const [tempFiltroStatus, setTempFiltroStatus] = useState<Status[]>([]);

  const [dataInicioFiltro, setDataInicioFiltro] = useState<Date | null>(null);
  const [dataFimFiltro, setDataFimFiltro] = useState<Date | null>(null);

  useEffect(() => {
    initializeAtendimentos();
  }, []);

  // ✅ 2. LÓGICA DE FILTRAGEM ATUALIZADA
  const atendimentosFiltrados = atendimentos.filter(atendimento => {
    // Se o array de filtros de status estiver vazio, passa todos. Senão, verifica se o status do atendimento está no array.
    const statusMatch = filtroStatus.length === 0 || filtroStatus.includes(atendimento.status);
    if (!statusMatch) return false;

    const dataAtendimento = new Date(atendimento.dataInicio);
    if (dataInicioFiltro && dataFimFiltro) {
        const inicio = new Date(dataInicioFiltro);
        inicio.setHours(0, 0, 0, 0);
        const fim = new Date(dataFimFiltro);
        fim.setHours(23, 59, 59, 999);
        return dataAtendimento >= inicio && dataAtendimento <= fim;
    }
    return true;
  });

  // ✅ 3. NOVAS FUNÇÕES PARA O MODAL DE FILTRO
  const handleToggleStatus = (status: Status) => {
    setTempFiltroStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const aplicarFiltros = () => {
    setFiltroStatus(tempFiltroStatus);
    setModalVisible(false);
  };

  const limparFiltros = () => {
    setFiltroStatus([]);
    setTempFiltroStatus([]);
    setDataInicioFiltro(null);
    setDataFimFiltro(null);
    setModalVisible(false);
  };

  // Funções de exportação e data (inalteradas)
  const showDateFilterPicker = (tipo: 'inicio' | 'fim') => { /* ... sua função de data ... */ };
  const getFormattedDate = () => { /* ... sua função de formatar data ... */ };
  const generateHtmlForPdf = (data: Atendimento[]) => { /* ... sua função de gerar PDF ... */ };
  const handleExportPdf = async () => { /* ... sua função de exportar PDF ... */ };
  const handleExportXlsx = async () => { /* ... sua função de exportar XLSX ... */ };
  const handleImportXlsx = async () => { /* ... sua função de importar XLSX ... */ };

  const isFiltroAtivo = filtroStatus.length > 0 || (!!dataInicioFiltro && !!dataFimFiltro);

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {/* ✅ 4. MODAL ATUALIZADO COM CHECKBOXES E BOTÕES */}
      <Modal visible={modalVisible} onRequestClose={() => setModalVisible(false)} transparent={true} animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Filtrar por Status</Text>
            {statusOptions.map(status => (
              <Pressable key={status} style={styles.modalOption} onPress={() => handleToggleStatus(status)}>
                <FontAwesome name={tempFiltroStatus.includes(status) ? 'check-square-o' : 'square-o'} size={24} color="#3b0653ff" />
                <Text style={styles.modalOptionText}>{status}</Text>
              </Pressable>
            ))}
            
            <Text style={[styles.modalTitle, { marginTop: 20 }]}>Filtrar por Período</Text>
            <View style={styles.dateFilterRow}>
                <Pressable style={styles.datePickerButton} onPress={() => showDateFilterPicker('inicio')}><FontAwesome name="calendar" size={16} color="#333" /><Text style={styles.datePickerText}>{dataInicioFiltro ? `De: ${dataInicioFiltro.toLocaleDateString('pt-BR')}` : 'Data Início'}</Text></Pressable>
                <Pressable style={styles.datePickerButton} onPress={() => showDateFilterPicker('fim')}><FontAwesome name="calendar" size={16} color="#333" /><Text style={styles.datePickerText}>{dataFimFiltro ? `Até: ${dataFimFiltro.toLocaleDateString('pt-BR')}` : 'Data Fim'}</Text></Pressable>
            </View>
            
            <View style={styles.modalButtonContainer}>
              <Button title="Limpar Filtros" onPress={limparFiltros} color="#DC3545" />
              <Button title="Aplicar Filtros" onPress={aplicarFiltros} />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Stack.Screen
        options={{
          title: 'Atendimentos',
          headerRight: () => {
            const iconColor = colorScheme === 'dark' ? 'white' : 'black';
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
                <Pressable onPress={handleImportXlsx}><FontAwesome name="cloud-upload" size={26} color={iconColor} /></Pressable>
                <Pressable onPress={() => { setTempFiltroStatus(filtroStatus); setModalVisible(true); }}><FontAwesome name="filter" size={24} color={isFiltroAtivo ? '#007AFF' : iconColor} /></Pressable>
                <Pressable onPress={handleExportPdf}><FontAwesome name="file-pdf-o" size={24} color="#DC3545" /></Pressable>
                <Pressable onPress={handleExportXlsx}><FontAwesome name="file-excel-o" size={24} color="#28a745" /></Pressable>
                <Pressable onPress={() => router.push('/novoAtendimento')}><FontAwesome name="plus-circle" size={28} color={iconColor} /></Pressable>
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
        ListEmptyComponent={() => (<View style={styles.emptyContainer}><Text style={styles.emptyText}>{isFiltroAtivo ? 'Nenhum atendimento encontrado' : 'Nenhum atendimento cadastrado.'}</Text>{!isFiltroAtivo && <Text style={styles.emptySubtext}>Clique no '+' para começar.</Text>}</View>)}
      />
    </View>
  );
}

// ✅ 5. ESTILOS ATUALIZADOS PARA O MODAL
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3e2961ff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemContainer: { backgroundColor: '#c7d8c4ff', borderRadius: 12, padding: 16, marginVertical: 8, marginHorizontal: 12, borderWidth: 1, borderColor: '#EFEFEF', shadowColor: "#555", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 3.84, elevation: 5 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, color: 'black', fontWeight: 'bold' },
  itemBody: { marginBottom: 8, },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { marginRight: 8 },
  infoText: { fontSize: 15, color: '#444', fontWeight: 'bold', flex: 1 },
  pendenciaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9dba5ff', borderRadius: 6, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FEEBC8', },
  pendenciaText: { marginLeft: 8, fontSize: 14, color: '#994606ff', fontStyle: 'italic', flex: 1, },
  itemFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8, marginTop: 4 },
  emptyContainer: { flex: 1, marginTop: '50%', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: 'white' },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { margin: 20, backgroundColor: '#d1d7ddff', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalOption: { width: '100%', paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { fontSize: 15, color: '#3b0653ff', marginLeft: 15 },
  dateFilterRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, gap: 10, },
  datePickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFF4', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', },
  datePickerText: { marginLeft: 8, fontSize: 14, color: '#333', },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 30,
  }
});

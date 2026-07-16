// app/novoAtendimento.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  Keyboard,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { Atendimento, statusOptions, Status } from '@/src/types/atendimento';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickFromLibrary, takePhoto, deletePhotoFile } from '@/src/services/photoService';

export default function FormAtendimentoScreen() {
  const router = useRouter();
  const { atendimentoId } = useLocalSearchParams<{ atendimentoId?: string }>();
  const isEditMode = !!atendimentoId;

  const { addAtendimento, updateAtendimento, atendimentos } = useAtendimentoStore();

  // (Estados e refs continuam os mesmos)
  const [numeroChamado, setNumeroChamado] = useState('');
  const [numeroLogicoTerminal, setNumeroLogicoTerminal] = useState('');
  const [solicitacao, setSolicitacao] = useState('');
  const [diagnosticoSolucao, setDiagnosticoSolucao] = useState('');
  const [causaReal, setCausaReal] = useState('');
  const [status, setStatus] = useState<Status>('Em andamento');
  const [detalhePendencia, setDetalhePendencia] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const isPendente = status.includes('Pendente');
  const numeroLogicoTerminalRef = useRef<RNTextInput>(null);
  const solicitacaoRef = useRef<RNTextInput>(null);
  const diagnosticoSolucaoRef = useRef<RNTextInput>(null);
  const causaRealRef = useRef<RNTextInput>(null);
  const detalhePendenciaRef = useRef<RNTextInput>(null);

  useEffect(() => {
    if (isEditMode) {
      const atendimentoParaEditar = atendimentos.find(at => at.id === atendimentoId);
      if (atendimentoParaEditar) {
        setNumeroChamado(atendimentoParaEditar.numeroChamado);
        setNumeroLogicoTerminal(atendimentoParaEditar.numeroLogicoTerminal);
        setSolicitacao(atendimentoParaEditar.solicitacao);
        setDiagnosticoSolucao(atendimentoParaEditar.diagnosticoSolucao);
        setCausaReal(atendimentoParaEditar.causaReal);
        setStatus(atendimentoParaEditar.status);
        setDetalhePendencia(atendimentoParaEditar.detalhePendencia || '');
        setDataInicio(new Date(atendimentoParaEditar.dataInicio));
        if (atendimentoParaEditar.dataFim) { setDataFim(new Date(atendimentoParaEditar.dataFim)); }
        else { setDataFim(null); }
        setFotos(atendimentoParaEditar.fotos || []);
      }
    }
  }, [atendimentoId, isEditMode, atendimentos]);

  const showDateTimePicker = (currentDate: Date, setDateFunction: (date: Date) => void, mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({ value: currentDate, onChange: (e, d) => setDateFunction(d || currentDate), mode, is24Hour: true });
  };

  const handleAddFoto = async (origem: 'camera' | 'galeria') => {
    try {
      const uri = origem === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (uri) setFotos(prev => [...prev, uri]);
      // uri null = cancelado ou permissão negada (fluxo silencioso)
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar a foto.');
    }
  };

  const handleRemoveFoto = (uri: string) => {
    Alert.alert('Remover Foto', 'Deseja remover esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          setFotos(prev => prev.filter(f => f !== uri));
          deletePhotoFile(uri);
        },
      },
    ]);
  };

  // ✅ FUNÇÃO handleSave ATUALIZADA COM try/catch
  const handleSave = async () => {
    if (!numeroChamado.trim() || !numeroLogicoTerminal.trim()) {
      Alert.alert('Atenção', 'Número do Chamado e Número Lógico são obrigatórios.');
      return;
    }

    try {
      if (isEditMode) {
        const atendimentoAtualizado: Atendimento = {
          id: atendimentoId,
          numeroChamado, numeroLogicoTerminal, solicitacao, diagnosticoSolucao, causaReal, status,
          detalhePendencia: isPendente ? detalhePendencia : '',
          dataInicio: dataInicio.toISOString(),
          dataFim: dataFim ? dataFim.toISOString() : null,
          fotos,
        };
        await updateAtendimento(atendimentoAtualizado);
      } else {
        const novoAtendimento: Atendimento = {
          id: Date.now().toString(),
          numeroChamado, numeroLogicoTerminal, solicitacao, diagnosticoSolucao, causaReal, status,
          detalhePendencia: isPendente ? detalhePendencia : '',
          dataInicio: dataInicio.toISOString(),
          dataFim: dataFim ? dataFim.toISOString() : null,
          fotos,
        };
        await addAtendimento(novoAtendimento);
      }

      Alert.alert('Sucesso!', `Atendimento ${isEditMode ? 'atualizado' : 'cadastrado'}.`, [
        { text: 'OK', onPress: () => {
          if (isEditMode) { router.replace({ pathname: "/atendimento/[id]", params: { id: atendimentoId } }); } 
          else { router.replace("/(tabs)"); }
        }},
      ]);

    } catch (error: any) {
      // Se qualquer coisa falhar, este alerta vai aparecer
      console.error("ERRO CRÍTICO AO SALVAR:", error);
      Alert.alert(
        "Erro ao Salvar",
        `Ocorreu um erro inesperado. Por favor, reporte esta mensagem: ${error.message}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: isEditMode ? 'Editar Atendimento' : 'Novo Atendimento' }} />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* O JSX do formulário continua o mesmo */}
        <Text style={styles.label}>Chamado (SA)</Text>
        <RNTextInput style={styles.input} value={numeroChamado} onChangeText={setNumeroChamado} returnKeyType="next" onSubmitEditing={() => numeroLogicoTerminalRef.current?.focus()} blurOnSubmit={false} />
        <Text style={styles.label}>Terminal</Text>
        <RNTextInput ref={numeroLogicoTerminalRef} style={styles.input} value={numeroLogicoTerminal} onChangeText={setNumeroLogicoTerminal} keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => solicitacaoRef.current?.focus()} blurOnSubmit={false} />
        <Text style={styles.label}>Motivo</Text>
        <RNTextInput ref={solicitacaoRef} style={styles.input} value={solicitacao} onChangeText={setSolicitacao} multiline blurOnSubmit={false} />
        <Text style={styles.label}>Solução</Text>
        <RNTextInput ref={diagnosticoSolucaoRef} style={styles.input} value={diagnosticoSolucao} onChangeText={setDiagnosticoSolucao} multiline blurOnSubmit={false} />
        <Text style={styles.label}>Causa encontrada</Text>
        <RNTextInput ref={causaRealRef} style={styles.input} value={causaReal} onChangeText={setCausaReal} returnKeyType={isPendente ? "next" : "done"} onSubmitEditing={() => { if (isPendente) { detalhePendenciaRef.current?.focus(); } else { Keyboard.dismiss(); } }} blurOnSubmit={false} />
        <Text style={styles.label}>Status</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={status} onValueChange={(itemValue) => setStatus(itemValue as Status)}>
            {statusOptions.map((opt) => (<Picker.Item key={opt} label={opt} value={opt} />))}
          </Picker>
        </View>
        {isPendente && (
          <>
            <Text style={styles.label}>Qual a Pendência?</Text>
            <RNTextInput ref={detalhePendenciaRef} style={styles.input} value={detalhePendencia} onChangeText={setDetalhePendencia} placeholder="Ex: Aguardando peça X" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
          </>
        )}
        <Text style={styles.label}>Data de Início</Text>
        <Text style={styles.dateDisplay}>{dataInicio.toLocaleString('pt-BR')}</Text>
        <View style={styles.dateButtonsContainer}>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => showDateTimePicker(dataInicio, setDataInicio, 'date')}><FontAwesome name="calendar" size={15} color="#007AFF" /><Text style={[styles.buttonText, styles.secondaryButtonText]}>Alterar Data</Text></Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => showDateTimePicker(dataInicio, setDataInicio, 'time')}><FontAwesome name="clock-o" size={15} color="#007AFF" /><Text style={[styles.buttonText, styles.secondaryButtonText]}>Alterar Hora</Text></Pressable>
        </View>
        <Text style={styles.label}>Data Final</Text>
        <Text style={styles.dateDisplay}>{dataFim ? dataFim.toLocaleString('pt-BR') : 'Não definida'}</Text>
        <View style={styles.dateButtonsContainer}>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => showDateTimePicker(dataFim || new Date(), setDataFim, 'date')}><FontAwesome name="calendar" size={15} color="#007AFF" /><Text style={[styles.buttonText, styles.secondaryButtonText]}>Definir Data</Text></Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => showDateTimePicker(dataFim || new Date(), setDataFim, 'time')}><FontAwesome name="clock-o" size={15} color="#007AFF" /><Text style={[styles.buttonText, styles.secondaryButtonText]}>Definir Hora</Text></Pressable>
        </View>
        <Pressable style={[styles.button, styles.clearButton]} onPress={() => setDataFim(null)}><FontAwesome name="times-circle" size={15} color="#DC3545" /><Text style={[styles.buttonText, styles.clearButtonText]}>Limpar Data Final</Text></Pressable>

        <Text style={styles.label}>Fotos {fotos.length > 0 ? `(${fotos.length})` : ''}</Text>
        <View style={styles.fotoButtonsRow}>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => handleAddFoto('camera')}><FontAwesome name="camera" size={15} color="#007AFF" /><Text style={[styles.buttonText, styles.secondaryButtonText]}>Câmera</Text></Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => handleAddFoto('galeria')}><FontAwesome name="photo" size={15} color="#007AFF" /><Text style={[styles.buttonText, styles.secondaryButtonText]}>Galeria</Text></Pressable>
        </View>
        {fotos.length > 0 && (
          <View style={styles.fotoGrid}>
            {fotos.map(uri => (
              <Pressable key={uri} onPress={() => handleRemoveFoto(uri)} style={styles.fotoThumbWrapper}>
                <Image source={{ uri }} style={styles.fotoThumb} />
                <View style={styles.fotoRemoveBadge}><FontAwesome name="times" size={12} color="#fff" /></View>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable style={[styles.button, styles.primaryButton]} onPress={handleSave}>
          <FontAwesome name="save" size={15} color="white" /><Text style={styles.buttonText}>{isEditMode ? "Salvar Alterações" : "Salvar Atendimento"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#3e2961ff' },
  scrollContainer: { flex: 1 },
  scrollContentContainer: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 15, fontWeight: 'bold', marginBottom: 5, color: 'white' },
  input: { backgroundColor: '#c7d8c4ff', color: 'black', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', fontSize: 15, marginBottom: 10 },
  pickerContainer: { backgroundColor: '#c7d8c4ff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  dateDisplay: { fontSize: 15, textAlign: 'center', backgroundColor: '#c7d8c4ff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  dateButtonsContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  button: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.22, shadowRadius: 2.22 },
  primaryButton: { backgroundColor: '#007AFF', marginTop: 10 },
  secondaryButton: { backgroundColor: '#EFEFF4' },
  clearButton: { flex: 0, alignSelf: 'center', backgroundColor: '#FADBD8', borderWidth: 1, borderColor: '#DC3545', paddingHorizontal: 20 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  secondaryButtonText: { color: '#007AFF' },
  clearButtonText: { color: '#DC3545' },
  fotoButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fotoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  fotoThumbWrapper: { position: 'relative' },
  fotoThumb: { width: 90, height: 90, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  fotoRemoveBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#DC3545', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
});

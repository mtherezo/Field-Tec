// app/atendimento/[id].tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable, Image, Modal } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStatusStyle } from '@/constants/theme';
import { deletePhotoFile } from '@/src/services/photoService';

// (Componentes InfoCard e InfoRow continuam os mesmos)
const InfoCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);
const InfoRow = ({ label, value, icon }: { label: string; value: string; icon?: React.ComponentProps<typeof FontAwesome>['name']; }) => (
  <View style={styles.infoRow}>
    <View style={styles.labelContainer}>
      {icon && <FontAwesome name={icon} size={14} color="#555" style={styles.icon} />}
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={styles.value}>{value}</Text>
  </View>
);

export default function DetalhesAtendimentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { atendimentos, removeAtendimento, isLoading } = useAtendimentoStore();

  // O estado local 'atendimento' agora é derivado da store
  const atendimento = atendimentos.find(at => at.id === id);

  // Foto aberta no visualizador em tela cheia (null = fechado).
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);

  // ✅ 3. FUNÇÃO DE DELETAR ATUALIZADA
  const handleDelete = () => {
    if (!atendimento) return;

    Alert.alert( "Confirmar Exclusão", `Você tem certeza que deseja excluir o chamado ${atendimento.numeroChamado}?`,
      [ 
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sim, Excluir", 
          onPress: async () => {
            try {
              // Remove os arquivos de foto antes de apagar o registro
              await Promise.all((atendimento.fotos ?? []).map(deletePhotoFile));
              await removeAtendimento(atendimento.id);
              router.replace('/(tabs)');
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o atendimento.');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // O useEffect não é mais necessário para carregar os dados, a store já faz isso.

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }
  if (!atendimento) {
    return <View style={styles.centered}><Text>Atendimento não encontrado.</Text></View>;
  }

  const statusStyle = getStatusStyle(atendimento.status);
  const fotos = atendimento.fotos ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Chamado ${atendimento.numeroChamado}` }} />

      <Modal visible={!!fotoAberta} transparent animationType="fade" onRequestClose={() => setFotoAberta(null)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setFotoAberta(null)}>
          {fotoAberta && <Image source={{ uri: fotoAberta }} style={styles.viewerImage} resizeMode="contain" />}
          <View style={styles.viewerCloseHint}><FontAwesome name="times-circle" size={28} color="#fff" /></View>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <InfoCard title='Status do Chamado'>
           <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>{atendimento.status}</Text>
           </View>
        </InfoCard>
        
        {atendimento.status.includes('Pendente') && atendimento.detalhePendencia && (
          <InfoCard title='Detalhe da Pendência'>
            <View style={styles.pendenciaContainer}>
              <FontAwesome name="info-circle" size={18} color="#D69E2E" />
              <Text style={styles.blockText}>{atendimento.detalhePendencia}</Text>
            </View>
          </InfoCard>
        )}

        <InfoCard title='Informações Gerais'>
          <InfoRow icon="ticket" label="Nº Chamado:" value={atendimento.numeroChamado} />
          <InfoRow icon="desktop" label="Nº Lógico Terminal:" value={atendimento.numeroLogicoTerminal} />
          <InfoRow icon="calendar-check-o" label="Data de Início:" value={new Date(atendimento.dataInicio).toLocaleString('pt-BR')} />
          <InfoRow icon="calendar-times-o" label="Data de Fim:" value={atendimento.dataFim ? new Date(atendimento.dataFim).toLocaleString('pt-BR') : 'Em aberto'} />
        </InfoCard>

        <InfoCard title='Descrição do Problema'>
          <Text style={styles.blockText}>{atendimento.solicitacao || 'Não informado'}</Text>
        </InfoCard>
        <InfoCard title='Diagnóstico e Solução'>
          <Text style={styles.blockText}>{atendimento.diagnosticoSolucao || 'Não informado'}</Text>
        </InfoCard>
        <InfoCard title='Causa Real Encontrada'>
          <Text style={styles.blockText}>{atendimento.causaReal || 'Não informado'}</Text>
        </InfoCard>

        {fotos.length > 0 && (
          <InfoCard title={`Fotos (${fotos.length})`}>
            <View style={styles.fotoGrid}>
              {fotos.map(uri => (
                <Pressable key={uri} onPress={() => setFotoAberta(uri)}>
                  <Image source={{ uri }} style={styles.fotoThumb} />
                </Pressable>
              ))}
            </View>
          </InfoCard>
        )}

        <View style={styles.actionsContainer}>
          <Pressable style={[styles.button, styles.editButton]} onPress={() => { router.push({ pathname: '/novoAtendimento', params: { atendimentoId: atendimento.id } })}}>
            <FontAwesome name="pencil" size={16} color="white" />
            <Text style={styles.buttonText}>Editar</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
            <FontAwesome name="trash" size={16} color="white" />
            <Text style={styles.buttonText}>Excluir</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- ESTILOS (mantendo suas customizações) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1, 
    backgroundColor: '#3e2961ff',
  },
  scrollContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3e2961ff', // Adicionado para consistência
  },
  card: {
    backgroundColor: '#c7d8c4ff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    color: '#111',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  blockText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginHorizontal: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pendenciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0d39fff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FBBF24',
    gap: 10,
  },
  fotoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fotoThumb: { width: 90, height: 90, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerCloseHint: { position: 'absolute', top: 40, right: 20 },
});

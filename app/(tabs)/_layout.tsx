// app/(tabs)/_layout.tsx

import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

// A função auxiliar para o ícone
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF', // Cor para a aba ativa
        tabBarInactiveTintColor: 'gray',   // Cor para as abas inativas
      }}>
      <Tabs.Screen
        // Configuração para a tela principal (index.tsx)
        name="index"
        options={{
          title: 'Atendimentos',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-ul" color={color} />,
        }}
      />
      <Tabs.Screen
        // Configuração para a tela de busca (busca.tsx)
        name="busca"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />
      {/* ✅ NOVA ABA ADICIONADA */}
      <Tabs.Screen
        name="relatorios" // Corresponde ao arquivo relatorios.tsx
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
    </Tabs>
  );
}
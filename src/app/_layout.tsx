import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/Feedback';
import { ToastHost } from '@/components/Toast';
import { colors } from '@/constants/theme';
import { DATABASE_NAME, migrateDb } from '@/database/schema';

export default function RootLayout() {
  const [dbError, setDbError] = useState<Error | null>(null);

  if (dbError) {
    return (
      <View style={styles.fallback}>
        <ErrorState
          title="Não foi possível abrir o banco de dados"
          message={`${dbError.message}\n\nFeche e abra o aplicativo novamente.`}
        />
      </View>
    );
  }

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb} onError={setDbError}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="activity/[id]" options={{ title: 'Detalhes' }} />
        <Stack.Screen name="activity/form" options={{ title: 'Atividade' }} />
        <Stack.Screen name="subject/form" options={{ title: 'Disciplina' }} />
        <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      </Stack>
      <ToastHost />
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: colors.background },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip, ChipGroup } from '@/components/Chip';
import { showError } from '@/components/dialogs';
import { ErrorState, LoadingState } from '@/components/Feedback';
import { TextField } from '@/components/FormField';
import { Screen } from '@/components/Layout';
import { toast } from '@/components/Toast';
import { type IconName, REMINDER_LEADS } from '@/constants/options';
import { card, colors, radius, spacing, type } from '@/constants/theme';
import { DATABASE_NAME, getSqliteVersion } from '@/database/schema';
import { DEMO_COUNTS, hasDemoData } from '@/database/seed';
import { useQuery } from '@/hooks/useQuery';
import { getPreferences } from '@/repositories/settings';
import { countRecords } from '@/repositories/subjects';
import { clearAllData, enableReminders, loadDemoData, updatePreferences } from '@/services/actions';
import {
  getPermissionState,
  type PermissionState,
  requestPermission,
  sendTestNotification,
} from '@/services/notifications';

const PERMISSION_LABELS: Record<PermissionState, string> = {
  granted: 'concedida',
  denied: 'negada',
  undetermined: 'ainda não solicitada',
};

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { data, error, reload } = useQuery(async (db) => {
    const [preferences, counts, sqliteVersion, permission] = await Promise.all([
      getPreferences(db),
      countRecords(db),
      getSqliteVersion(db),
      getPermissionState().catch((): PermissionState => 'undetermined'),
    ]);
    return { preferences, counts, sqliteVersion, permission };
  }, []);
  const [busy, setBusy] = useState(false);

  // A permissão pode mudar nos ajustes do sistema: recarrega ao voltar para o app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && reload());
    return () => subscription.remove();
  }, [reload]);

  if (error) return <Screen edges={[]}><ErrorState message={error.message} onRetry={reload} /></Screen>;
  if (!data) return <Screen edges={[]}><LoadingState /></Screen>;

  const { preferences, counts, sqliteVersion, permission } = data;

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (taskError) {
      showError(taskError);
    } finally {
      setBusy(false);
    }
  };

  const askToOpenSettings = () =>
    Alert.alert(
      'Permissão de notificações negada',
      'Para receber lembretes, permita as notificações nos ajustes do sistema. No Expo Go, a permissão pertence ao app Expo Go.',
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
      ],
    );

  const toggleReminders = (enabled: boolean) =>
    run(async () => {
      if (!enabled) {
        await updatePreferences(db, { remindersEnabled: false });
        toast('Lembretes desativados');
      } else if (await enableReminders(db)) {
        toast('Lembretes ativados para os próximos prazos');
      } else {
        reload();
        askToOpenSettings();
      }
    });

  const sendTest = () =>
    run(async () => {
      const granted = permission === 'granted' || (await requestPermission());
      if (permission !== 'granted') reload();
      if (!granted) {
        askToOpenSettings();
        return;
      }
      await sendTestNotification();
      toast('A notificação de teste chega em 5 segundos');
    });

  const confirmDemo = async () => {
    const exists = await hasDemoData(db);
    Alert.alert(
      exists ? 'Recriar dados de demonstração?' : 'Carregar dados de demonstração?',
      exists
        ? 'As atividades de exemplo serão recriadas com datas atualizadas. Suas próprias disciplinas e atividades não serão alteradas.'
        : `Serão adicionadas até ${DEMO_COUNTS.subjects} disciplinas e ${DEMO_COUNTS.activities} atividades de exemplo, com datas a partir de hoje. Seus dados atuais serão mantidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: exists ? 'Recriar' : 'Carregar',
          onPress: () =>
            run(async () => {
              const result = await loadDemoData(db);
              toast(`${result.activitiesCreated} atividades e ${result.subjectsCreated} disciplinas novas`);
            }),
        },
      ],
    );
  };

  const confirmClear = () =>
    Alert.alert(
      'Apagar todos os dados?',
      `Serão removidas ${counts.subjects} disciplinas e ${counts.activities} atividades deste aparelho, além dos lembretes agendados. Esta ação não pode ser desfeita. Suas preferências serão mantidas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await clearAllData(db);
              toast('Todos os dados foram apagados');
            }),
        },
      ],
    );

  return (
    <Screen edges={[]}>
      <Group icon="person-circle-outline" title="Perfil">
        <NameField
          initial={preferences.userName}
          onSave={(userName) =>
            run(async () => {
              await updatePreferences(db, { userName });
              toast(userName ? `Olá, ${userName.split(' ')[0]}!` : 'Nome removido');
            })
          }
        />
      </Group>

      <Group icon="notifications-outline" title="Lembretes">
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={type.label}>Lembretes de prazos</Text>
            <Text style={type.caption}>Notificação local antes de cada prazo pendente.</Text>
          </View>
          <Switch
            accessibilityLabel="Lembretes de prazos"
            value={preferences.remindersEnabled}
            onValueChange={toggleReminders}
            disabled={busy}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
        {preferences.remindersEnabled && (
          <ChipGroup label="Antecedência" wrap>
            {REMINDER_LEADS.map((option) => (
              <Chip
                key={option.minutes}
                label={option.label}
                selected={preferences.reminderLeadMinutes === option.minutes}
                onPress={() =>
                  run(async () => {
                    await updatePreferences(db, { reminderLeadMinutes: option.minutes });
                    toast('Lembretes reagendados');
                  })
                }
              />
            ))}
          </ChipGroup>
        )}
        <Text style={type.caption}>
          Permissão do sistema: <Text style={styles.strong}>{PERMISSION_LABELS[permission]}</Text>
        </Text>
        <Button title="Enviar notificação de teste" icon="paper-plane-outline" variant="secondary" onPress={sendTest} />
        {permission === 'denied' && (
          <Button title="Abrir ajustes do sistema" icon="open-outline" variant="ghost" onPress={() => Linking.openSettings()} />
        )}
      </Group>

      <Group icon="sparkles-outline" title="Dados de demonstração">
        <Text style={type.caption}>
          Adiciona disciplinas e atividades fictícias em estados variados (pendentes, atrasadas e concluídas) para
          apresentar o app. Pode ser executado de novo sem duplicar registros.
        </Text>
        <Button title="Carregar dados de demonstração" icon="sparkles-outline" variant="secondary" onPress={confirmDemo} />
      </Group>

      <Group icon="server-outline" title="Armazenamento local">
        <InfoLine label="Banco de dados" value={`${DATABASE_NAME} · SQLite ${sqliteVersion}`} />
        <InfoLine label="Disciplinas" value={String(counts.subjects)} />
        <InfoLine label="Atividades" value={String(counts.activities)} />
        <Text style={type.caption}>
          Os dados ficam salvos somente neste aparelho e o app funciona sem internet. Desinstalar o app (ou limpar os
          dados do Expo Go) também apaga o banco.
        </Text>
        <Button title="Apagar todos os dados" icon="trash-outline" variant="danger" onPress={confirmClear} />
      </Group>

      <Group icon="information-circle-outline" title="Sobre">
        <InfoLine label="Aplicativo" value={`CampusFlow ${Constants.expoConfig?.version ?? ''}`} />
        <InfoLine label="Plataforma" value={`Expo SDK ${Constants.expoConfig?.sdkVersion?.split('.')[0] ?? '?'} · React Native`} />
        <Text style={type.caption}>
          Organizador acadêmico para estudantes universitários: tarefas, provas, trabalhos, disciplinas e prazos em um
          só lugar. Projeto acadêmico desenvolvido com React Native, Expo e TypeScript.
        </Text>
      </Group>
    </Screen>
  );
}

function Group({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={type.heading} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/** Salva o nome ao confirmar no teclado ou sair do campo. */
function NameField({ initial, onSave }: { initial: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial);
  // Confirmar no teclado também dispara onBlur: o ref evita salvar duas vezes.
  const saved = useRef(initial);
  const save = () => {
    const trimmed = name.trim();
    if (trimmed === saved.current) return;
    saved.current = trimmed;
    onSave(trimmed);
  };
  return (
    <TextField
      label="Como você quer ser chamado(a)?"
      value={name}
      onChangeText={setName}
      onBlur={save}
      onSubmitEditing={save}
      placeholder="Seu nome"
      maxLength={40}
      autoCapitalize="words"
      returnKeyType="done"
      hint="Usado na saudação da tela inicial."
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { ...card, padding: spacing.lg, gap: spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  strong: { fontWeight: '700', color: colors.text },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 14, color: colors.textMuted },
  infoValue: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
});

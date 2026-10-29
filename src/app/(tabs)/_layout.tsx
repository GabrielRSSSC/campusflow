import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import type { IconName } from '@/constants/options';
import { colors } from '@/constants/theme';
import { useReminderNavigation } from '@/services/notifications';

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Início', icon: 'home-outline', activeIcon: 'home' },
  { name: 'activities', title: 'Atividades', icon: 'checkbox-outline', activeIcon: 'checkbox' },
  { name: 'calendar', title: 'Calendário', icon: 'calendar-outline', activeIcon: 'calendar' },
  { name: 'subjects', title: 'Disciplinas', icon: 'library-outline', activeIcon: 'library' },
  { name: 'stats', title: 'Estatísticas', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
];

export default function TabsLayout() {
  useReminderNavigation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={23}
                color={focused ? colors.primary : colors.textFaint}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

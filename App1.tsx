import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { ThemeProvider, useTheme } from './lib/theme';
import { StoreProvider } from './lib/store';
import DashboardScreen from './screens/DashboardScreen';
import ClientsScreen from './screens/ClientsScreen';
import ClientDetailScreen from './screens/ClientDetailScreen';
import PropertiesScreen from './screens/PropertiesScreen';
import PropertyDetailScreen from './screens/PropertyDetailScreen';
import VoiceRecordScreen from './screens/VoiceRecordScreen';
import SettingsScreen from './screens/SettingsScreen';
import LicenseGate from './components/LicenseGate';
import Onboarding, { isOnboardingDone } from './components/Onboarding';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Отступ под жестовую полоску / кнопки навигации Android/iOS
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const tabBarHeight = 56 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        tabBarIcon: ({ focused, color, size }: any) => {
          const icons: any = { 'Главная': 'home', 'Клиенты': 'people', 'Объекты': 'business', 'Настройки': 'settings' };
          return <Ionicons name={focused ? icons[route.name] : icons[route.name] + '-outline'} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPad,
          height: tabBarHeight,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      })}
    >
      <Tab.Screen name="Главная" component={DashboardScreen} />
      <Tab.Screen name="Клиенты" component={ClientsScreen} />
      <Tab.Screen name="Объекты" component={PropertiesScreen} />
      <Tab.Screen name="Настройки" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isDark, colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    isOnboardingDone().then((done) => setShowOnboarding(!done));
  }, []);

  if (showOnboarding === null) return null;
  if (showOnboarding) return <Onboarding onDone={() => setShowOnboarding(false)} />;

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background, card: colors.card, text: colors.textPrimary, border: colors.border, primary: colors.accent } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, card: colors.card, text: colors.textPrimary, border: colors.border, primary: colors.accent } };

  return (
    <StoreProvider>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="VoiceRecord" component={VoiceRecordScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LicenseGate>
          <AppContent />
        </LicenseGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

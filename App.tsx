import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { getToken } from './src/services/api';
import { registerForPushNotifications } from './src/services/push.service';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AlertsHistoryScreen from './src/screens/AlertsHistoryScreen';
import { colors } from './src/theme';

type Screen = 'home' | 'history';

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    getToken().then((token) => {
      setLoggedIn(!!token);
      setCheckingSession(false);
    });
  }, []);

  function handleLoggedIn() {
    setLoggedIn(true);
    registerForPushNotifications().catch(() => {});
  }

  function handleLoggedOut() {
    setLoggedIn(false);
    setScreen('home');
  }

  if (checkingSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      {!loggedIn && <LoginScreen onLoggedIn={handleLoggedIn} />}
      {loggedIn && screen === 'home' && (
        <HomeScreen onLoggedOut={handleLoggedOut} onOpenHistory={() => setScreen('history')} />
      )}
      {loggedIn && screen === 'history' && (
        <AlertsHistoryScreen onBack={() => setScreen('home')} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});

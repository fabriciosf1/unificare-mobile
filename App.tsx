import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import notifee, { EventType } from 'react-native-notify-kit';
import { getToken, getRole, AppRole } from './src/services/api';
import { me as getPatientMe } from './src/services/auth.service';
import { registerForPushNotifications, registerForFamilyPushNotifications } from './src/services/push.service';
import { startBackgroundLocation } from './src/services/location.service';
import {
  handleAlarmAction,
  initAlarmChannel,
  needsExactAlarmPermission,
  openAlarmPermissionSettings,
} from './src/services/alarm.service';
import LoginScreen from './src/screens/LoginScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import AlertsHistoryScreen from './src/screens/AlertsHistoryScreen';
import AddMedicationScreen from './src/screens/AddMedicationScreen';
import AddAppointmentScreen from './src/screens/AddAppointmentScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FamilyHomeScreen from './src/screens/FamilyHomeScreen';
import SosCameraScreen from './src/screens/SosCameraScreen';
import WatchSosScreen from './src/screens/WatchSosScreen';
import { colors } from './src/theme';

type PatientScreen = 'home' | 'history' | 'addMedication' | 'addAppointment' | 'sosCamera' | 'profile';
type FamilyScreen = 'home' | 'watchSos';

interface SosCallData {
  patientId: number;
  patientName: string;
}

async function setupMedicationAlarms(): Promise<void> {
  await initAlarmChannel();
  if (await needsExactAlarmPermission()) {
    Alert.alert(
      'Alarme de remédio',
      'Para o alarme de remédio tocar no horário certo, mesmo com o celular bloqueado, permita "Alarmes e lembretes" nas configurações.',
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Abrir configurações', onPress: () => openAlarmPermissionSettings() },
      ],
    );
  }
}

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [patientScreen, setPatientScreen] = useState<PatientScreen>('home');
  const [familyScreen, setFamilyScreen] = useState<FamilyScreen>('home');
  const [sosCall, setSosCall] = useState<SosCallData | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const roleRef = useRef<AppRole | null>(null);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const storedRole = await getRole();

      if (token && storedRole) {
        setLoggedIn(true);
        setRole(storedRole);

        if (storedRole === 'patient') {
          try {
            const patient = await getPatientMe();
            if (patient.password_must_change) {
              setMustChangePassword(true);
              setCheckingSession(false);
              return;
            }
          } catch {
            // se a checagem falhar, segue o fluxo normal — a API vai barrar em outra chamada se o token for inválido
          }
          startBackgroundLocation().catch(() => {});
          setupMedicationAlarms().catch(() => {});
        }
        setCheckingSession(false);
        return;
      }

      setLoggedIn(false);
      setRole(null);
      setCheckingSession(false);
    })();
  }, []);

  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        handleAlarmAction(type, detail).catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    function handleSosNotification(data: Record<string, unknown>) {
      if (data?.type !== 'sos_call' || roleRef.current !== 'family') return;
      const patientId = Number(data.patientId);
      if (!patientId) return;
      setSosCall({ patientId, patientName: String(data.patientName ?? 'Paciente') });
      setFamilyScreen('watchSos');
    }

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      handleSosNotification(notification.request.content.data as Record<string, unknown>);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleSosNotification(response.notification.request.content.data as Record<string, unknown>);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  function handleLoggedIn(loggedInRole: AppRole, mustChange?: boolean) {
    setLoggedIn(true);
    setRole(loggedInRole);
    if (loggedInRole === 'patient') {
      if (mustChange) {
        setMustChangePassword(true);
        return;
      }
      registerForPushNotifications().catch(() => {});
      startBackgroundLocation().catch(() => {});
      setupMedicationAlarms().catch(() => {});
    } else {
      registerForFamilyPushNotifications().catch(() => {});
    }
  }

  function handlePasswordChanged() {
    setMustChangePassword(false);
    registerForPushNotifications().catch(() => {});
    startBackgroundLocation().catch(() => {});
    setupMedicationAlarms().catch(() => {});
  }

  function handleLoggedOut() {
    setLoggedIn(false);
    setRole(null);
    setPatientScreen('home');
    setFamilyScreen('home');
    setSosCall(null);
    setMustChangePassword(false);
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

      {loggedIn && role === 'family' && familyScreen === 'home' && (
        <FamilyHomeScreen onLoggedOut={handleLoggedOut} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'watchSos' && sosCall && (
        <WatchSosScreen
          patientId={sosCall.patientId}
          patientName={sosCall.patientName}
          onClose={() => setFamilyScreen('home')}
        />
      )}

      {loggedIn && role === 'patient' && mustChangePassword && (
        <ChangePasswordScreen onChanged={handlePasswordChanged} />
      )}

      {loggedIn && role === 'patient' && !mustChangePassword && patientScreen === 'home' && (
        <HomeScreen
          onLoggedOut={handleLoggedOut}
          onOpenHistory={() => setPatientScreen('history')}
          onAddMedication={() => setPatientScreen('addMedication')}
          onAddAppointment={() => setPatientScreen('addAppointment')}
          onOpenProfile={() => setPatientScreen('profile')}
          onOpenSosCamera={(patientId) => {
            setSosCall({ patientId, patientName: '' });
            setPatientScreen('sosCamera');
          }}
        />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'profile' && (
        <ProfileScreen onBack={() => setPatientScreen('home')} />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'history' && (
        <AlertsHistoryScreen onBack={() => setPatientScreen('home')} />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'addMedication' && (
        <AddMedicationScreen onBack={() => setPatientScreen('home')} onSaved={() => setPatientScreen('home')} />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'addAppointment' && (
        <AddAppointmentScreen onBack={() => setPatientScreen('home')} onSaved={() => setPatientScreen('home')} />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'sosCamera' && sosCall && (
        <SosCameraScreen patientId={sosCall.patientId} onClose={() => setPatientScreen('home')} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});

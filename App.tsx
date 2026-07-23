import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import notifee, { EventType } from 'react-native-notify-kit';
import { getToken, getRole, AppRole } from './src/services/api';
import { me as getPatientMe } from './src/services/auth.service';
import { familyMe } from './src/services/family.service';
import { registerForPushNotifications, registerForFamilyPushNotifications, ensureCriticalAlertChannel } from './src/services/push.service';
import { startBackgroundLocation } from './src/services/location.service';
import {
  handleAlarmAction,
  initAlarmChannel,
  needsExactAlarmPermission,
  openAlarmPermissionSettings,
} from './src/services/alarm.service';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import AlertsHistoryScreen from './src/screens/AlertsHistoryScreen';
import AddMedicationScreen from './src/screens/AddMedicationScreen';
import AddAppointmentScreen from './src/screens/AddAppointmentScreen';
import AddExamScreen from './src/screens/AddExamScreen';
import ExamsScreen from './src/screens/ExamsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FamiliaresScreen from './src/screens/FamiliaresScreen';
import FamilyHomeScreen from './src/screens/FamilyHomeScreen';
import FamilyProfileScreen from './src/screens/FamilyProfileScreen';
import FamilyAlertsScreen from './src/screens/FamilyAlertsScreen';
import FamilyMedicationsScreen from './src/screens/FamilyMedicationsScreen';
import FamilyAddExamScreen from './src/screens/FamilyAddExamScreen';
import FamilyExamsScreen from './src/screens/FamilyExamsScreen';
import FamilyAddMedicationScreen from './src/screens/FamilyAddMedicationScreen';
import FamilyAddAppointmentScreen from './src/screens/FamilyAddAppointmentScreen';
import SosCameraScreen from './src/screens/SosCameraScreen';
import WatchSosScreen from './src/screens/WatchSosScreen';
import { colors } from './src/theme';
import type { Medication } from './src/types';

type PatientScreen = 'home' | 'history' | 'addMedication' | 'addAppointment' | 'exams' | 'addExam' | 'sosCamera' | 'profile' | 'familiares';
type FamilyScreen = 'home' | 'watchSos' | 'alerts' | 'medications' | 'exams' | 'addExam' | 'addMedication' | 'editMedication' | 'addAppointment' | 'profile';
type AuthScreen = 'login' | 'forgotPassword';

interface SosCallData {
  patientId: number;
  patientName: string;
  // Presente só quando a tela foi aberta por um SOS de verdade (push 'sos_call') — ausente
  // quando é o familiar apenas pedindo pra ver a câmera por conta própria (sem alerta associado).
  alertUuid?: string;
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
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [patientScreen, setPatientScreen] = useState<PatientScreen>('home');
  const [familyScreen, setFamilyScreen] = useState<FamilyScreen>('home');
  const [sosCall, setSosCall] = useState<SosCallData | null>(null);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
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
          // Sequencial de propósito: pedir várias permissões do Android ao mesmo tempo faz o
          // sistema só exibir um diálogo e descartar os outros silenciosamente.
          await startBackgroundLocation().catch(() => {});
          await setupMedicationAlarms().catch(() => {});
        } else if (storedRole === 'family') {
          try {
            const contact = await familyMe();
            if (contact.password_must_change) {
              setMustChangePassword(true);
              setCheckingSession(false);
              return;
            }
          } catch {
            // idem — segue o fluxo normal se a checagem falhar
          }
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
    ensureCriticalAlertChannel().catch(() => {});
  }, []);

  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        handleAlarmAction(type, detail).catch(() => {});
      }
    });
  }, []);

  const pendingNotificationRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    function handleSosNotification(data: Record<string, unknown>) {
      if (data?.type !== 'sos_call' || roleRef.current !== 'family') return false;
      const patientId = Number(data.patientId);
      if (!patientId) return false;
      setSosCall({
        patientId,
        patientName: String(data.patientName ?? 'Paciente'),
        alertUuid: data.alertUuid ? String(data.alertUuid) : undefined,
      });
      setFamilyScreen('watchSos');
      return true;
    }

    function handleCameraRequestNotification(data: Record<string, unknown>) {
      if (data?.type !== 'camera_request' || roleRef.current !== 'patient') return false;
      const patientId = Number(data.patientId);
      if (!patientId) return false;
      setSosCall({ patientId, patientName: '' });
      setPatientScreen('sosCamera');
      return true;
    }

    // Se o role ainda não foi restaurado da sessão (cold start), a notificação não pode
    // ser roteada ainda — guarda pra reprocessar assim que `role` resolver (ver efeito abaixo).
    function routeNotification(data: Record<string, unknown>) {
      if (roleRef.current === null) {
        pendingNotificationRef.current = data;
        return;
      }
      const handled = handleSosNotification(data) || handleCameraRequestNotification(data);
      if (!handled) pendingNotificationRef.current = null;
    }

    // A resposta que efetivamente abriu o app (cold start) pode não chegar no listener "ao
    // vivo" abaixo — a Expo recomenda checar getLastNotificationResponseAsync no mount.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      routeNotification(data);
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      routeNotification(data);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      routeNotification(data);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  // Reprocessa a notificação que chegou antes de a sessão (role) terminar de restaurar.
  useEffect(() => {
    if (role === null) return;
    const pending = pendingNotificationRef.current;
    if (!pending) return;
    pendingNotificationRef.current = null;
    if (pending.type === 'sos_call' && role === 'family') {
      const patientId = Number(pending.patientId);
      if (patientId) {
        setSosCall({
          patientId,
          patientName: String(pending.patientName ?? 'Paciente'),
          alertUuid: pending.alertUuid ? String(pending.alertUuid) : undefined,
        });
        setFamilyScreen('watchSos');
      }
    } else if (pending.type === 'camera_request' && role === 'patient') {
      const patientId = Number(pending.patientId);
      if (patientId) {
        setSosCall({ patientId, patientName: '' });
        setPatientScreen('sosCamera');
      }
    }
  }, [role]);

  async function handleLoggedIn(loggedInRole: AppRole, mustChange?: boolean) {
    setLoggedIn(true);
    setRole(loggedInRole);
    setAuthScreen('login');
    if (mustChange) {
      setMustChangePassword(true);
      return;
    }
    if (loggedInRole === 'patient') {
      // Sequencial de propósito: pedir várias permissões do Android ao mesmo tempo faz o
      // sistema só exibir um diálogo e descartar os outros silenciosamente.
      await registerForPushNotifications().catch(() => {});
      await startBackgroundLocation().catch(() => {});
      await setupMedicationAlarms().catch(() => {});
    } else {
      await registerForFamilyPushNotifications().catch(() => {});
    }
  }

  async function handlePasswordChanged() {
    setMustChangePassword(false);
    if (role === 'patient') {
      await registerForPushNotifications().catch(() => {});
      await startBackgroundLocation().catch(() => {});
      await setupMedicationAlarms().catch(() => {});
    } else if (role === 'family') {
      await registerForFamilyPushNotifications().catch(() => {});
    }
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!loggedIn) {
        if (authScreen === 'forgotPassword') {
          setAuthScreen('login');
          return true;
        }
        return false;
      }

      if (mustChangePassword) {
        return true;
      }

      if (role === 'family') {
        switch (familyScreen) {
          case 'home':
            return false;
          case 'editMedication':
            setEditingMedication(null);
            setFamilyScreen('medications');
            return true;
          case 'addMedication':
            setFamilyScreen('medications');
            return true;
          case 'addExam':
            setFamilyScreen('exams');
            return true;
          case 'watchSos':
            setSosCall(null);
            setFamilyScreen('home');
            return true;
          default:
            setFamilyScreen('home');
            return true;
        }
      }

      if (role === 'patient') {
        switch (patientScreen) {
          case 'home':
            return false;
          case 'addExam':
            setPatientScreen('exams');
            return true;
          case 'sosCamera':
            setSosCall(null);
            setPatientScreen('home');
            return true;
          default:
            setPatientScreen('home');
            return true;
        }
      }

      return false;
    });

    return () => sub.remove();
  }, [loggedIn, authScreen, mustChangePassword, role, familyScreen, patientScreen]);

  function handleLoggedOut() {
    setLoggedIn(false);
    setRole(null);
    setAuthScreen('login');
    setPatientScreen('home');
    setFamilyScreen('home');
    setSosCall(null);
    setMustChangePassword(false);
  }

  if (checkingSession) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </SafeAreaProvider>
    );
  }

  const statusBarBackground = role === 'patient' ? colors.greenDarker : role === 'family' ? colors.blueDarker : undefined;
  const statusBarStyle = role ? 'light-content' : 'dark-content';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} />
      {!loggedIn && authScreen === 'login' && (
        <LoginScreen onLoggedIn={handleLoggedIn} onForgotPassword={() => setAuthScreen('forgotPassword')} />
      )}
      {!loggedIn && authScreen === 'forgotPassword' && (
        <ForgotPasswordScreen onBack={() => setAuthScreen('login')} />
      )}

      {loggedIn && mustChangePassword && (role === 'patient' || role === 'family') && (
        <ChangePasswordScreen role={role} onChanged={handlePasswordChanged} />
      )}

      {loggedIn && role === 'family' && familyScreen === 'home' && !mustChangePassword && (
        <FamilyHomeScreen
          onLoggedOut={handleLoggedOut}
          onOpenAlerts={() => setFamilyScreen('alerts')}
          onOpenMedications={() => setFamilyScreen('medications')}
          onOpenCamera={(patientId, patientName) => {
            setSosCall({ patientId, patientName });
            setFamilyScreen('watchSos');
          }}
          onOpenAddExam={() => setFamilyScreen('exams')}
          onOpenAddAppointment={() => setFamilyScreen('addAppointment')}
          onOpenProfile={() => setFamilyScreen('profile')}
        />
      )}
      {loggedIn && role === 'family' && familyScreen === 'profile' && (
        <FamilyProfileScreen onBack={() => setFamilyScreen('home')} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'alerts' && (
        <FamilyAlertsScreen onBack={() => setFamilyScreen('home')} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'medications' && (
        <FamilyMedicationsScreen
          onBack={() => setFamilyScreen('home')}
          onAddMedication={() => setFamilyScreen('addMedication')}
          onEditMedication={(medication) => {
            setEditingMedication(medication);
            setFamilyScreen('editMedication');
          }}
        />
      )}
      {loggedIn && role === 'family' && familyScreen === 'addMedication' && (
        <FamilyAddMedicationScreen onBack={() => setFamilyScreen('medications')} onSaved={() => setFamilyScreen('medications')} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'editMedication' && editingMedication && (
        <FamilyAddMedicationScreen
          medication={editingMedication}
          onBack={() => setFamilyScreen('medications')}
          onSaved={() => {
            setEditingMedication(null);
            setFamilyScreen('medications');
          }}
        />
      )}
      {loggedIn && role === 'family' && familyScreen === 'addAppointment' && (
        <FamilyAddAppointmentScreen onBack={() => setFamilyScreen('home')} onSaved={() => setFamilyScreen('home')} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'exams' && (
        <FamilyExamsScreen onBack={() => setFamilyScreen('home')} onAddExam={() => setFamilyScreen('addExam')} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'addExam' && (
        <FamilyAddExamScreen onBack={() => setFamilyScreen('exams')} onSaved={() => setFamilyScreen('exams')} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'watchSos' && sosCall && (
        <WatchSosScreen
          patientId={sosCall.patientId}
          patientName={sosCall.patientName}
          alertUuid={sosCall.alertUuid}
          onClose={() => setFamilyScreen('home')}
        />
      )}

      {loggedIn && role === 'patient' && !mustChangePassword && patientScreen === 'home' && (
        <HomeScreen
          onLoggedOut={handleLoggedOut}
          onOpenHistory={() => setPatientScreen('history')}
          onAddMedication={() => setPatientScreen('addMedication')}
          onAddAppointment={() => setPatientScreen('addAppointment')}
          onAddExam={() => setPatientScreen('exams')}
          onOpenProfile={() => setPatientScreen('profile')}
          onOpenFamiliares={() => setPatientScreen('familiares')}
          onOpenSosCamera={(patientId) => {
            setSosCall({ patientId, patientName: '' });
            setPatientScreen('sosCamera');
          }}
        />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'profile' && (
        <ProfileScreen onBack={() => setPatientScreen('home')} />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'familiares' && (
        <FamiliaresScreen onBack={() => setPatientScreen('home')} />
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
      {loggedIn && role === 'patient' && patientScreen === 'exams' && (
        <ExamsScreen onBack={() => setPatientScreen('home')} onAddExam={() => setPatientScreen('addExam')} />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'addExam' && (
        <AddExamScreen onBack={() => setPatientScreen('exams')} onSaved={() => setPatientScreen('exams')} />
      )}
      {loggedIn && role === 'patient' && patientScreen === 'sosCamera' && sosCall && (
        <SosCameraScreen patientId={sosCall.patientId} onClose={() => setPatientScreen('home')} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});

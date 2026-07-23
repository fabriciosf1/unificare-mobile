import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import notifee, { EventType } from 'react-native-notify-kit';
import { getToken, getRole, AppRole } from './src/services/api';
import { me as getPatientMe } from './src/services/auth.service';
import { familyMe } from './src/services/family.service';
import { registerForPushNotifications, registerForFamilyPushNotifications } from './src/services/push.service';
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

type PatientScreen = 'home' | 'history' | 'addMedication' | 'addAppointment' | 'exams' | 'addExam' | 'sosCamera' | 'profile' | 'familiares';
type FamilyScreen = 'home' | 'watchSos' | 'alerts' | 'medications' | 'exams' | 'addExam' | 'addMedication' | 'addAppointment' | 'profile';
type AuthScreen = 'login' | 'forgotPassword';

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
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
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

    function handleCameraRequestNotification(data: Record<string, unknown>) {
      if (data?.type !== 'camera_request' || roleRef.current !== 'patient') return;
      const patientId = Number(data.patientId);
      if (!patientId) return;
      setSosCall({ patientId, patientName: '' });
      setPatientScreen('sosCamera');
    }

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      handleSosNotification(data);
      handleCameraRequestNotification(data);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      handleSosNotification(data);
      handleCameraRequestNotification(data);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  function handleLoggedIn(loggedInRole: AppRole, mustChange?: boolean) {
    setLoggedIn(true);
    setRole(loggedInRole);
    setAuthScreen('login');
    if (mustChange) {
      setMustChangePassword(true);
      return;
    }
    if (loggedInRole === 'patient') {
      registerForPushNotifications().catch(() => {});
      startBackgroundLocation().catch(() => {});
      setupMedicationAlarms().catch(() => {});
    } else {
      registerForFamilyPushNotifications().catch(() => {});
    }
  }

  function handlePasswordChanged() {
    setMustChangePassword(false);
    if (role === 'patient') {
      registerForPushNotifications().catch(() => {});
      startBackgroundLocation().catch(() => {});
      setupMedicationAlarms().catch(() => {});
    } else if (role === 'family') {
      registerForFamilyPushNotifications().catch(() => {});
    }
  }

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  const statusBarBackground = role === 'patient' ? colors.greenDarker : role === 'family' ? colors.blueDarker : undefined;
  const statusBarStyle = role ? 'light-content' : 'dark-content';

  return (
    <>
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
        <FamilyMedicationsScreen onBack={() => setFamilyScreen('home')} onAddMedication={() => setFamilyScreen('addMedication')} />
      )}
      {loggedIn && role === 'family' && familyScreen === 'addMedication' && (
        <FamilyAddMedicationScreen onBack={() => setFamilyScreen('medications')} onSaved={() => setFamilyScreen('medications')} />
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
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});

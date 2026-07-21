import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from './patient.service';

export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

  // Push remoto via expo-notifications foi removido do Expo Go a partir do SDK 53 — só funciona em dev build.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
  await registerPushToken(expoPushToken, Platform.OS);
}

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from './patient.service';
import { registerFamilyPushToken } from './family.service';

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  // Push remoto via expo-notifications foi removido do Expo Go a partir do SDK 53 — só funciona em dev build.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
  return expoPushToken;
}

export async function registerForPushNotifications(): Promise<void> {
  const token = await getExpoPushToken();
  if (token) {
    await registerPushToken(token, Platform.OS);
  }
}

export async function registerForFamilyPushNotifications(): Promise<void> {
  const token = await getExpoPushToken();
  if (token) {
    await registerFamilyPushToken(token, Platform.OS);
  }
}

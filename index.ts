import { registerRootComponent } from 'expo';
import notifee from 'react-native-notify-kit';
import { handleAlarmAction } from './src/services/alarm.service';

import App from './App';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  await handleAlarmAction(type, detail);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

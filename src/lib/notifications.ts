import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    // token = (await Notifications.getExpoPushTokenAsync({ projectId: 'YOUR_PROJECT_ID' })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleMaintenanceReminder(vehicleName: string, serviceType: string, monthsFromNow: number = 6) {
  const trigger = new Date();
  trigger.setMonth(trigger.getMonth() + monthsFromNow);
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Maintenance Reminder 🛠️",
      body: `It's been ${monthsFromNow} months since the last ${serviceType} on your ${vehicleName}.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelReminderNotifications(idsString: string | null | undefined) {
  if (!idsString) return;
  const ids = idsString.split(',').filter(id => id.trim() !== '');
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.warn('Failed to cancel notification:', id);
    }
  }
}

export async function scheduleRepeatingBatch(
  vehicleName: string,
  serviceType: string,
  startDate: Date,
  repeatIntervalDays: number | null,
  batchSize: number = 10
): Promise<string> {
  const newIds: string[] = [];
  
  for (let i = 0; i < batchSize; i++) {
    const triggerDate = new Date(startDate);
    if (repeatIntervalDays && repeatIntervalDays > 0) {
      triggerDate.setDate(triggerDate.getDate() + (i * repeatIntervalDays));
    } else if (i > 0) {
      // If no repeat interval, only schedule the first one
      break;
    }

    // Ensure we only schedule future dates
    if (triggerDate.getTime() > Date.now()) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Maintenance Due: ${serviceType} 🛠️`,
            body: `Your ${vehicleName} is due for ${serviceType}. Please log it when done!`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        newIds.push(id);
      } catch (e) {
        console.warn('Failed to schedule notification:', e);
      }
    }
  }

  return newIds.join(',');
}

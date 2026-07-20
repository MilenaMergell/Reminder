import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Registriert Aktionstypen und richtet den Listener für ausgeführte Benachrichtigungsaktionen ein.
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export async function initNotifications() {
  if (!Capacitor.isNativePlatform()) {
    console.log('initNotifications: Browser-Modus, überspringe Registrierung.');
    return;
  }

  try {
    // Aktionstypen mit registerActionTypes() registrieren
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'REMINDER_ACTIONS',
          actions: [
            {
              id: 'view',
              title: 'Ansehen'
            },
            {
              id: 'dismiss',
              title: 'Verwerfen',
              destructive: true
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Fehler beim Registrieren der Aktionstypen:', error);
  }

  // Listener für ausgeführte Aktionen (localNotificationActionPerformed)
  await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    console.log('Benachrichtigungsaktion ausgeführt:', notification.actionId, notification.notification);
  });
}

/**
 * Erstellt den Android Notification Channel (wird auf iOS ignoriert).
 */
export async function createNotificationChannel() {
  if (Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: 'erinnerungen',
        name: 'Erinnerungen',
        description: 'Benachrichtigungen für Erinnerungen',
        importance: 4, // HIGH
        visibility: 1, // PUBLIC
        vibration: true
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Notification Channels:', error);
    }
  }
}

/**
 * Prüft den aktuellen Benachrichtigungs-Berechtigungsstatus.
 * @returns {Promise<string>} 'granted', 'denied' oder 'prompt'
 */
export async function checkPermission() {
  if (!Capacitor.isNativePlatform()) {
    return 'granted'; // Im Browser immer erlauben (zum Testen)
  }
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display;
  } catch (error) {
    console.error('Fehler bei Berechtigungsprüfung:', error);
    return 'denied';
  }
}

/**
 * Fordert die Benachrichtigungs-Berechtigung an.
 * @returns {Promise<string>} 'granted' oder 'denied'
 */
export async function requestPermission() {
  if (!Capacitor.isNativePlatform()) {
    return 'granted';
  }
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display;
  } catch (error) {
    console.error('Fehler beim Anfordern der Berechtigung:', error);
    return 'denied';
  }
}

/**
 * Plant eine lokale Benachrichtigung für eine Erinnerung.
 * Erfordert nur ein Datum; fehlt die Uhrzeit, wird 00:00 Uhr verwendet.
 * @param {Object} reminder - Die Erinnerung mit id, text, date, time (optional)
 */
export async function scheduleNotification(reminder) {
  if (!reminder.date) {
    return; // Keine Benachrichtigung ohne Datum
  }

  // Falls keine Uhrzeit angegeben → Benachrichtigung auf 00:00 Uhr setzen
  const timeStr = reminder.time || '00:00';
  const scheduledDate = new Date(`${reminder.date}T${timeStr}`);

  // Nicht planen wenn Zeitpunkt in der Vergangenheit
  if (scheduledDate <= new Date()) {
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log('Benachrichtigung geplant (Browser-Modus):', reminder.text, 'am', scheduledDate);
    return;
  }

  console.log('scheduleNotification: Plane Benachrichtigung für:', reminder.text, 'am', scheduledDate.toISOString());

  try {
    const result = await LocalNotifications.schedule({
      notifications: [
        {
          id: reminder.id,
          title: 'Erinnerung',
          body: reminder.text,
          schedule: { at: scheduledDate, allowWhileIdle: true },
          channelId: 'erinnerungen',
          smallIcon: 'ic_launcher',
          actionTypeId: 'REMINDER_ACTIONS',
          autoCancel: true,
          extra: {
            reminderId: reminder.id
          }
        }
      ]
    });
    console.log('scheduleNotification: Erfolgreich geplant, Ergebnis:', JSON.stringify(result));

    // Geplante Benachrichtigungen zur Verifizierung auflisten
    try {
      const pending = await LocalNotifications.getPending();
      console.log('scheduleNotification: Ausstehende Benachrichtigungen:', JSON.stringify(pending));
    } catch (e) {
      console.log('scheduleNotification: Konnte ausstehende Benachrichtigungen nicht abrufen:', e);
    }
  } catch (error) {
    console.error('Fehler beim Planen der Benachrichtigung:', error);
  }
}

/**
 * Bricht eine geplante Benachrichtigung ab.
 * @param {number} reminderId - Die ID der Erinnerung
 */
export async function cancelNotification(reminderId) {
  if (!Capacitor.isNativePlatform()) {
    console.log('Benachrichtigung abgebrochen (Browser-Modus), ID:', reminderId);
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: reminderId }]
    });
  } catch (error) {
    console.error('Fehler beim Abbrechen der Benachrichtigung:', error);
  }
}

/**
 * Aktualisiert eine geplante Benachrichtigung (cancel + schedule).
 * @param {Object} reminder - Die aktualisierte Erinnerung
 */
export async function updateNotification(reminder) {
  await cancelNotification(reminder.id);
  await scheduleNotification(reminder);
}

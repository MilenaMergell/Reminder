import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'erinnerungen';

/**
 * Lädt alle Erinnerungen aus dem persistenten Speicher.
 * @returns {Promise<Array>} Array von Erinnerungs-Objekten
 */
export async function loadReminders() {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      return JSON.parse(value);
    }
    return [];
  } catch (error) {
    console.error('Fehler beim Laden der Erinnerungen:', error);
    return [];
  }
}

/**
 * Speichert alle Erinnerungen in den persistenten Speicher.
 * @param {Array} reminders - Array von Erinnerungs-Objekten
 */
export async function saveReminders(reminders) {
  try {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(reminders)
    });
  } catch (error) {
    console.error('Fehler beim Speichern der Erinnerungen:', error);
  }
}

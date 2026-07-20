import { Capacitor } from '@capacitor/core';

/**
 * Öffnet die App-Einstellungen des Geräts.
 * Ermöglicht dem Nutzer, Berechtigungen manuell zu ändern.
 */
export async function openAppSettings() {
  if (!Capacitor.isNativePlatform()) {
    console.log('App-Einstellungen können nur auf einem Gerät geöffnet werden.');
    return;
  }

  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import('capacitor-native-settings');
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App
    });
  } catch (error) {
    console.error('Fehler beim Öffnen der App-Einstellungen:', error);
  }
}

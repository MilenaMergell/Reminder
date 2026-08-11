# Erinnerungen-App

Eine Android-App, die den Nutzer an Aufgaben erinnert. Erinnerungen lassen sich anlegen, bearbeiten und löschen; zu einem gewählten Zeitpunkt löst das Betriebssystem eine lokale Benachrichtigung aus.

Fallstudie im Modul **Hybride App-Entwicklung** (WWI23-6), Aufgabenstellung *Erinnerungen-App*.

**Gruppe:** Anna Heyer · Marie Hübner · Milena Mergell
**Präsentation:** 19. August 2026

---

## Funktionsumfang

**Kernfunktionen**

- Erinnerung hinzufügen — Text ist Pflichtfeld, Datum und Uhrzeit unabhängig voneinander optional
- Erinnerung bearbeiten — alle Eigenschaften änderbar, auch nachträgliches Entfernen des Datums
- Erinnerung löschen — aus der Listenansicht heraus, mit Sicherheitsabfrage
- Lokale Benachrichtigung zum gewählten Zeitpunkt
- Speichern der Erinnerungen über einen Neustart der App hinweg

**Zusätzlich umgesetzt**

- Erledigt-Häkchen mit Durchstreichen und Filter zum Ausblenden
- Sortierung nach Fälligkeit, Einträge ohne Datum am Ende
- Hinweis auf überfällige, unerledigte Einträge
- Prüfung der Eingaben mit Fehlermeldung direkt am betroffenen Feld
- Dunkelmodus nach Systemeinstellung, deutsche Datums- und Zeitformate
- Unit-Tests für die Service-Module

---

## Technologie

| Baustein | Version | Rolle |
|---|---|---|
| Vue | 3 | Komponenten und reaktive Aktualisierung der Oberfläche |
| Ionic | 8 | UI-Komponenten und Seitennavigation |
| Capacitor | 8 | Zugriff auf native Funktionen, erzeugt das Android-Projekt |
| Vite | 8 | Bündelt den Quellcode zu ausführbaren Web-Dateien |
| Vitest | 3 | Unit-Tests der Service-Module |

**Zielplattform:** Android, `minSdkVersion 24` (Android 7.0) bis `targetSdkVersion 36`

**Eingesetzte Capacitor-Plugins**

| Plugin | Wofür | Nativ dahinter |
|---|---|---|
| `@capacitor/preferences` | Erinnerungen speichern und laden | SharedPreferences |
| `@capacitor/local-notifications` | Kanal, Berechtigungen, Benachrichtigungen planen und abmelden | AlarmManager, NotificationManager |
| `capacitor-native-settings` | Einstellungsseite der App öffnen | Intent auf die App-Details |

---

## Installation und Ausführen

**Voraussetzungen:** Node.js 20 oder neuer, npm. Für den Android-Build zusätzlich Android Studio mit installiertem SDK.

```bash
npm install
```

### Im Browser (Entwicklung)

```bash
npm run dev
```

> **Hinweis:** Im Browser sind keine echten Benachrichtigungen möglich. Die Service-Module erkennen das über `Capacitor.isNativePlatform()` und schreiben stattdessen in die Konsole. Oberfläche und Datenhaltung lassen sich so ohne Emulator entwickeln, die Benachrichtigungen selbst nicht.

### Auf einem Android-Gerät oder Emulator

```bash
npm run build          # Quellcode nach dist/ bündeln
npx cap sync android   # dist/ ins Android-Projekt übernehmen
npx cap open android   # Android Studio öffnen
```

In Android Studio auf einem verbundenen Gerät oder Emulator starten.

### APK erzeugen

In Android Studio über *Build → Build Bundle(s) / APK(s) → Build APK(s)*. Die Datei liegt anschließend unter:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Zur Installation auf einem Gerät muss dort die Installation aus unbekannten Quellen erlaubt sein.

### Tests

```bash
npm run test:unit      # Unit-Tests (Vitest)
npm run lint           # Code-Stil (ESLint)
```

Die Tests ersetzen die Capacitor-Plugins durch Attrappen und laufen deshalb ohne Emulator.

---

## Projektstruktur

```
src/
├── main.js                      Start der App: Vue, Ionic, Router
├── App.vue                      Wurzelkomponente mit Router-Outlet
├── router/index.js              Routen: Liste, Hinzufügen, Bearbeiten
├── services/
│   ├── storage.js               Speichern und Laden (Preferences)
│   ├── notifications.js         Benachrichtigungen und Berechtigungen
│   └── settings.js              Einstellungsseite der App öffnen
├── views/
│   ├── HomePage.vue             Listenansicht
│   └── ReminderFormPage.vue     Einfüge- und Bearbeitungsansicht
└── theme/variables.css          Farbschema
android/app/src/main/AndroidManifest.xml    Berechtigungen
tests/unit/                      Unit-Tests
```

**Aufbau in Kürze:** Die Views greifen nie direkt auf ein Capacitor-Plugin zu, sondern immer auf eine Funktion aus `services/`. Dadurch steht der Code nur einmal da, die Services sind einzeln testbar, und ein Wechsel der Datenhaltung würde nur `storage.js` betreffen.

**Datenmodell:** Die App verwaltet eine Liste von Objekten dieser Form, abgelegt als JSON unter dem Schlüssel `erinnerungen`.

```js
{
  id:   1751234567891,   // Zeitstempel, auf 32 Bit begrenzt
  text: "Milch kaufen",  // Pflichtfeld
  date: "2026-08-01",    // optional, sonst null
  time: "18:30",         // optional, sonst null
  done: false
}
```

Die ID der Erinnerung ist zugleich die ID der Benachrichtigung. Deshalb die Begrenzung auf 32 Bit — Android akzeptiert für Benachrichtigungs-IDs nur Ganzzahlen dieser Größe.

---

## Nachweis der Grundanforderungen

| # | Anforderung | Umgesetzt in |
|---|---|---|
| 1 | App unterstützt Android oder iOS | `android/`, `capacitor.config.json` — Zielplattform Android |
| 2 | Alle benötigten Berechtigungen werden angefordert | `AndroidManifest.xml` (Z. 40–47) für die Deklaration, `services/notifications.js` → `checkPermission()` (Z. 68) und `requestPermission()` (Z. 85) für die Laufzeitanfrage |
| 3 | Text, Datum und Uhrzeit; Datum und Uhrzeit optional | `views/ReminderFormPage.vue` — Schalter `hasDate` und `hasTime`, fehlende Werte werden als `null` gespeichert |
| 4 | Listenansicht mit allen Eigenschaften | `views/HomePage.vue` — Liste mit Text, formatiertem Datum, Uhrzeit und Überfällig-Hinweis |
| 5 | Einfügeansicht für neue Erinnerungen | `views/ReminderFormPage.vue`, Route `/reminder/add` in `router/index.js` |
| 6 | Beim Hinzufügen wird eine lokale Benachrichtigung geplant | `views/ReminderFormPage.vue` → `save()` (Z. 230), Aufruf von `scheduleNotification()` (Z. 282) |
| 7 | Bearbeiten und Löschen über die Listenansicht | `views/HomePage.vue` — `ion-item-sliding` (Z. 52), `editReminder()` (Z. 206), `deleteReminder()` (Z. 213) |
| 8 | Beim Bearbeiten sind alle Eigenschaften aktualisierbar | `views/ReminderFormPage.vue` → `save()`, Bearbeiten-Zweig (Z. 244–258); ID und Erledigt-Status bleiben erhalten |
| 9 | Beim Löschen wird die geplante Benachrichtigung entfernt | `views/HomePage.vue` → `deleteReminder()`, `cancelNotification()` (Z. 227) — vor dem Entfernen aus der Liste |
| 10 | Erinnerungen bleiben nach einem Neustart erhalten | `services/storage.js` → `loadReminders()` (Z. 9), `saveReminders()` (Z. 26); abgedeckt durch `tests/unit/storage.spec.ts` |

Die **Zusatzanforderungen** — Erledigt-Aktion direkt in der Benachrichtigung und App Shortcut — sind nicht umgesetzt. Sie waren laut Aufgabenstellung nur für Gruppen mit vier Studierenden verbindlich; diese Gruppe besteht aus drei Personen.

---

## Berechtigungen

| Berechtigung | Wofür | Erteilung |
|---|---|---|
| `POST_NOTIFICATIONS` | Benachrichtigungen anzeigen | zur Laufzeit (ab Android 13 Pflicht) |
| `USE_EXACT_ALARM` | minutengenaue Weckrufe | automatisch |
| `SCHEDULE_EXACT_ALARM` | minutengenaue Weckrufe (ältere Versionen) | Sonderfreigabe ab Android 12 |
| `RECEIVE_BOOT_COMPLETED` | Weckrufe nach einem Neustart des Geräts | automatisch |
| `WAKE_LOCK` | Gerät zum Auslösezeitpunkt wecken | automatisch |

`POST_NOTIFICATIONS` zählt seit Android 13 nicht mehr zu den normalen Berechtigungen: der Eintrag im Manifest allein bleibt wirkungslos, die App muss zur Laufzeit fragen. Lehnt der Nutzer ab, lässt Android keinen weiteren Dialog zu — die Listenansicht zeigt dann einen Hinweis mit einer Schaltfläche, die über `capacitor-native-settings` direkt die Einstellungsseite der App öffnet.

---

## Bekannte Einschränkungen

- Gebaut und getestet wurde ausschließlich für **Android**. Die eingesetzten Plugins unterstützen iOS, ein iOS-Build wurde von uns aber nicht erzeugt; dafür wäre ein Mac mit Xcode nötig.
- Wird das **heutige Datum ohne Uhrzeit** gewählt, gilt intern 00:00 Uhr. Dieser Zeitpunkt ist bereits vergangen, die Erinnerung wird gespeichert, aber keine Benachrichtigung geplant. Der Nutzer erhält darüber keinen Hinweis.
- Der Listener für Benachrichtigungs-Aktionen wird in `ReminderFormPage.vue` registriert, nicht beim Start der App. Wird das Formular nie geöffnet, ist er nicht aktiv. Er gehört nach `main.js`.
- Herstellereigene Stromsparfunktionen können Weckrufe trotz `allowWhileIdle` zusätzlich verzögern.
- `capacitor-native-settings` ist ein Plugin von Drittanbietern und liegt in Version 7 gegen Capacitor 8 vor. Es funktioniert, ist aber keine offiziell abgestimmte Kombination.

---

## Einsatz von KI-Werkzeugen

Laut Aufgabenstellung ist der Einsatz von KI-Werkzeugen erlaubt, muss aber dokumentiert werden.

| Werkzeug | Wofür | Umfang |
|---|---|---|
| Agent ChatGPT | Entwicklung der App | Unterstützung bei der Entwicklung, Fehlersuche und Kommentaren |
| Claude (Anthropic) | Verständnisfragen | Unterstützung bei Verständnisproblemen und Fachfragen |
| Claude (Anthropic) | Vorbereitung der Präsentation | Gliederung und Strukturierung der Präsentation |
| Claude (Anthropic) | Erstellung dieser README | Struktur und Formulierung, Nachweistabelle auf Basis des Quellcodes |

Der erzeugte Code und alle Aussagen in dieser Dokumentation wurden von der Gruppe geprüft. Die Verantwortung für Inhalt und Richtigkeit liegt bei den Autorinnen.

---

## Abgabe

- **Quellcode:** dieses Repository
- **APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Präsentation:** `Praesentation_Erinnerungen-App_mit-Screenshots.pptx`

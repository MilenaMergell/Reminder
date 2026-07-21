<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Erinnerungen</ion-title>
        <ion-buttons slot="end">
          <ion-button id="toggle-done-btn" @click="toggleShowDone">
            <ion-icon slot="icon-only" :icon="showDone ? eyeOffOutline : eyeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Erinnerungen</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Berechtigungs-Hinweis -->
      <ion-card v-if="permissionDenied" color="warning" class="permission-card">
        <ion-card-content>
          <div class="permission-content">
            <ion-icon :icon="notificationsOffOutline" class="permission-icon"></ion-icon>
            <div>
              <p class="permission-text">
                Benachrichtigungen sind deaktiviert. Bitte aktiviere sie in den Einstellungen, um Erinnerungen zu erhalten.
              </p>
              <ion-button id="open-settings-btn" size="small" fill="outline" @click="onOpenSettings">
                Einstellungen öffnen
              </ion-button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Leerer Zustand -->
      <div v-if="filteredReminders.length === 0" class="empty-state">
        <ion-icon :icon="calendarOutline" class="empty-icon"></ion-icon>
        <h2>Keine Erinnerungen</h2>
        <p v-if="reminders.length === 0">
          Tippe auf das <strong>+</strong>, um eine neue Erinnerung hinzuzufügen.
        </p>
        <p v-else>
          Alle Erinnerungen sind erledigt. Tippe auf das Auge-Symbol, um erledigte anzuzeigen.
        </p>
      </div>

      <!-- Erinnerungsliste -->
      <ion-list v-if="filteredReminders.length > 0" id="reminder-list">
        <ion-item-sliding v-for="reminder in filteredReminders" :key="reminder.id" :id="'reminder-' + reminder.id">
          <ion-item :class="{ 'done-item': reminder.done }">
            <ion-checkbox
              slot="start"
              :checked="reminder.done"
              @ionChange="toggleDone(reminder)"
              :aria-label="'Erledigt: ' + reminder.text"
            ></ion-checkbox>
            <ion-label :class="{ 'done-label': reminder.done }">
              <h2>{{ reminder.text }}</h2>
              <p v-if="reminder.date || reminder.time" class="reminder-datetime">
                <ion-icon :icon="timeOutline" class="datetime-icon"></ion-icon>
                <span v-if="reminder.date">{{ formatDate(reminder.date) }}</span>
                <span v-if="reminder.date && reminder.time"> · </span>
                <span v-if="reminder.time">{{ reminder.time }} Uhr</span>
              </p>
              <p v-else class="reminder-no-date">Kein Datum gesetzt</p>
            </ion-label>
            <ion-note v-if="isOverdue(reminder)" slot="end" color="danger" class="overdue-badge">
              Überfällig
            </ion-note>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="primary" @click="editReminder(reminder)">
              <ion-icon slot="icon-only" :icon="createOutline"></ion-icon>
            </ion-item-option>
            <ion-item-option color="danger" @click="deleteReminder(reminder)">
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- FAB Button -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button id="add-reminder-btn" @click="addReminder">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonCheckbox, IonIcon,
  IonFab, IonFabButton, IonButton, IonButtons, IonNote,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonCard, IonCardContent, alertController
} from '@ionic/vue';
import {
  addOutline, trashOutline, createOutline, timeOutline,
  eyeOutline, eyeOffOutline, calendarOutline, notificationsOffOutline
} from 'ionicons/icons';

import { loadReminders, saveReminders } from '../services/storage.js';
import { checkPermission, requestPermission, cancelNotification, scheduleNotification, createNotificationChannel } from '../services/notifications.js';
import { openAppSettings } from '../services/settings.js';

const router = useRouter();
const reminders = ref([]);
const showDone = ref(true);
const permissionDenied = ref(false);

/**
 * Sortiert die Erinnerungen: nach Fälligkeit aufsteigend, ohne Datum am Ende.
 */
const sortedReminders = computed(() => {
  return [...reminders.value].sort((a, b) => {
    const aHasDate = !!a.date;
    const bHasDate = !!b.date;

    // Ohne Datum am Ende
    if (!aHasDate && !bHasDate) return 0;
    if (!aHasDate) return 1;
    if (!bHasDate) return -1;

    // Nach Datum+Uhrzeit aufsteigend (ohne Uhrzeit → 00:00)
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA - dateB;
  });
});

/**
 * Filtert die Erinnerungen basierend auf dem showDone-Toggle.
 */
const filteredReminders = computed(() => {
  if (showDone.value) {
    return sortedReminders.value;
  }
  return sortedReminders.value.filter(r => !r.done);
});

/**
 * Formatiert ein ISO-Datum in ein deutsches Format.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Prüft, ob eine Erinnerung überfällig ist.
 */
function isOverdue(reminder) {
  if (!reminder.date || reminder.done) return false;
  const dueDate = new Date(`${reminder.date}T${reminder.time || '00:00'}`);
  return dueDate < new Date();
}

/**
 * Markiert eine Erinnerung als erledigt/unerledigt.
 */
async function toggleDone(reminder) {
  reminder.done = !reminder.done;
  await saveReminders(reminders.value);

  if (reminder.done) {
    await cancelNotification(reminder.id);
  }
  else if (reminder.date){
    await scheduleNotification(reminder);
  }
}

/**
 * Erledigte Erinnerungen ein-/ausblenden.
 */
function toggleShowDone() {
  showDone.value = !showDone.value;

}

/**
 * Navigiert zur Einfügeansicht.
 */
function addReminder() {
  router.push('/reminder/add');
}

/**
 * Navigiert zur Bearbeitungsansicht.
 */
function editReminder(reminder) {
  router.push(`/reminder/edit/${reminder.id}`);
}

/**
 * Löscht eine Erinnerung nach Bestätigung.
 */
async function deleteReminder(reminder) {
  const alert = await alertController.create({
    header: 'Löschen',
    message: `Möchtest du die Erinnerung "${reminder.text}" wirklich löschen?`,
    buttons: [
      {
        text: 'Abbrechen',
        role: 'cancel'
      },
      {
        text: 'Löschen',
        role: 'destructive',
        handler: async () => {
          // Benachrichtigung abbrechen
          await cancelNotification(reminder.id);

          // Aus der Liste entfernen
          reminders.value = reminders.value.filter(r => r.id !== reminder.id);
          await saveReminders(reminders.value);
        }
      }
    ]
  });
  await alert.present();
}

/**
 * Öffnet die App-Einstellungen.
 */
async function onOpenSettings() {
  await openAppSettings();
}

/**
 * Prüft die Benachrichtigungs-Berechtigung und fordert sie ggf. an.
 */
async function checkNotificationPermission() {
  let status = await checkPermission();

  if (status === 'prompt') {
    status = await requestPermission();
  }

  permissionDenied.value = (status === 'denied');
}

/**
 * Initialisierung beim Laden der Seite.
 */
onMounted(async () => {
  await createNotificationChannel();
  await checkNotificationPermission();
  reminders.value = await loadReminders();
});

// Daten neu laden wenn die Seite wieder sichtbar wird (z.B. nach Bearbeitung)
import { onIonViewWillEnter } from '@ionic/vue';

onIonViewWillEnter(async () => {
  reminders.value = await loadReminders();
  // Berechtigung erneut prüfen (falls der Nutzer sie in den Einstellungen geändert hat)
  const status = await checkPermission();
  permissionDenied.value = (status === 'denied');
});
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: var(--ion-color-medium);
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.done-item {
  --background: var(--ion-color-light);
  opacity: 0.65;
}

.done-label h2 {
  text-decoration: line-through;
  color: var(--ion-color-medium);
}

.done-label p {
  color: var(--ion-color-medium) !important;
}

.reminder-datetime {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.datetime-icon {
  font-size: 14px;
  color: var(--ion-color-primary);
}

.reminder-no-date {
  font-size: 13px;
  color: var(--ion-color-medium);
  font-style: italic;
}

.overdue-badge {
  font-size: 11px;
  font-weight: 600;
}

.permission-card {
  margin: 12px;
}

.permission-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.permission-icon {
  font-size: 28px;
  min-width: 28px;
  color: var(--ion-color-warning-contrast);
}

.permission-text {
  margin: 0 0 8px 0;
  font-size: 14px;
  line-height: 1.4;
}
</style>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" text="Zurück"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing ? 'Bearbeiten' : 'Neue Erinnerung' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <!-- Erinnerungstext -->
      <ion-item id="text-input-item">
        <ion-label position="stacked">Erinnerungstext *</ion-label>
        <ion-textarea
          id="reminder-text-input"
          v-model="text"
          placeholder="Was möchtest du nicht vergessen?"
          :auto-grow="true"
          :rows="2"
          @ionInput="clearTextError"
        ></ion-textarea>
      </ion-item>
      <p v-if="textError" class="error-message" id="text-error">{{ textError }}</p>

      <!-- Datum -->
      <ion-item id="date-toggle-item">
        <ion-label>Datum</ion-label>
        <ion-toggle
          slot="end"
          :checked="hasDate"
          @ionChange="toggleDate"
          id="date-toggle"
        ></ion-toggle>
      </ion-item>

      <div v-if="hasDate" class="datetime-container">
        <ion-datetime
          id="date-picker"
          presentation="date"
          v-model="date"
          :locale="'de-DE'"
          :first-day-of-week="1"
          @ionChange="clearDateError"
        ></ion-datetime>
      </div>

      <!-- Uhrzeit -->
      <ion-item id="time-toggle-item" v-if="hasDate">
        <ion-label>Uhrzeit</ion-label>
        <ion-toggle
          slot="end"
          :checked="hasTime"
          @ionChange="toggleTime"
          id="time-toggle"
        ></ion-toggle>
      </ion-item>

      <div v-if="hasDate && hasTime" class="datetime-container">
        <ion-datetime
          id="time-picker"
          presentation="time"
          v-model="time"
          :locale="'de-DE'"
          :hour-cycle="'h23'"
          @ionChange="clearDateError"
        ></ion-datetime>
      </div>

      <p v-if="dateError" class="error-message" id="date-error">{{ dateError }}</p>

      <!-- Aktions-Buttons -->
      <div class="action-buttons">
        <ion-button
          id="save-btn"
          expand="block"
          @click="save"
          class="save-button"
        >
          {{ isEditing ? 'Speichern' : 'Hinzufügen' }}
        </ion-button>

        <ion-button
          id="cancel-btn"
          expand="block"
          fill="outline"
          color="medium"
          @click="cancel"
        >
          Abbrechen
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonTextarea, IonButton, IonButtons,
  IonBackButton, IonDatetime, IonToggle, toastController
} from '@ionic/vue';

import { loadReminders, saveReminders } from '../services/storage.js';
import { scheduleNotification, updateNotification, initNotifications, requestPermission, createNotificationChannel } from '../services/notifications.js';

const route = useRoute();
const router = useRouter();

const text = ref('');
const date = ref(null);
const time = ref(null);
const hasDate = ref(false);
const hasTime = ref(false);
const textError = ref('');
const dateError = ref('');
const editingReminder = ref(null);

/**
 * Ob wir eine bestehende Erinnerung bearbeiten.
 */
const isEditing = computed(() => {
  return route.name === 'EditReminder';
});

/**
 * Aktiviert/deaktiviert das Datum.
 */
function toggleDate(event) {
  hasDate.value = event.detail.checked;
  if (!hasDate.value) {
    date.value = null;
    hasTime.value = false;
    time.value = null;
    dateError.value = '';
  }
}

/**
 * Aktiviert/deaktiviert die Uhrzeit.
 */
function toggleTime(event) {
  hasTime.value = event.detail.checked;
  if (!hasTime.value) {
    time.value = null;
  }
}

/**
 * Löscht den Text-Fehler beim Tippen.
 */
function clearTextError() {
  textError.value = '';
}

/**
 * Löscht den Datum-Fehler beim Ändern.
 */
function clearDateError() {
  dateError.value = '';
}

/**
 * Extrahiert das Datum im Format YYYY-MM-DD aus dem ion-datetime-Wert.
 */
function extractDate(isoString) {
  if (!isoString) return null;
  // ion-datetime gibt ISO-Strings zurück, z.B. "2024-01-15" oder "2024-01-15T10:30"
  return isoString.substring(0, 10);
}

/**
 * Extrahiert die Uhrzeit im Format HH:mm aus dem ion-datetime-Wert.
 */
function extractTime(isoString) {
  if (!isoString) return null;
  // ion-datetime time presentation gibt z.B. "10:30" oder "2024-01-15T10:30" zurück
  if (isoString.includes('T')) {
    return isoString.substring(11, 16);
  }
  return isoString.substring(0, 5);
}

/**
 * Validiert die Eingaben.
 * @returns {boolean} true wenn gültig
 */
function validate() {
  let isValid = true;

  // Text darf nicht leer sein
  if (!text.value || text.value.trim().length === 0) {
    textError.value = 'Bitte einen Erinnerungstext eingeben.';
    isValid = false;
  }

  return isValid;
}

/**
 * Speichert die Erinnerung (erstellt oder aktualisiert).
 */
async function save() {
  if (!validate()) return;

  const reminders = await loadReminders();

  const selectedDate = hasDate.value ? extractDate(date.value) : null;
  const selectedTime = (hasDate.value && hasTime.value) ? extractTime(time.value) : null;

  // Benachrichtigungs-Berechtigung anfordern wenn ein Datum gesetzt ist
  if (selectedDate) {
    await createNotificationChannel();
    await requestPermission();
  }

  if (isEditing.value && editingReminder.value) {
    // Bestehende Erinnerung aktualisieren
    const index = reminders.findIndex(r => r.id === editingReminder.value.id);
    if (index !== -1) {
      reminders[index] = {
        ...reminders[index],
        text: text.value.trim(),
        date: selectedDate,
        time: selectedTime
      };

      await saveReminders(reminders);

      // Benachrichtigung aktualisieren
      await updateNotification(reminders[index]);

      const toast = await toastController.create({
        message: 'Erinnerung aktualisiert.',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
    }
  } else {
    // Neue Erinnerung erstellen
    const newReminder = {
      id: Date.now() % 2147483647,
      text: text.value.trim(),
      date: selectedDate,
      time: selectedTime,
      done: false
    };

    reminders.push(newReminder);
    await saveReminders(reminders);

    // Benachrichtigung planen
    await scheduleNotification(newReminder);

    const toast = await toastController.create({
      message: 'Erinnerung hinzugefügt.',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  router.back();
}

/**
 * Bricht die Aktion ab und navigiert zurück.
 */
function cancel() {
  router.back();
}

/**
 * Lädt die Daten einer bestehenden Erinnerung beim Bearbeiten.
 */
onMounted(async () => {
  await initNotifications();
  if (isEditing.value) {
    const id = parseInt(route.params.id);
    const reminders = await loadReminders();
    const reminder = reminders.find(r => r.id === id);

    if (reminder) {
      editingReminder.value = reminder;
      text.value = reminder.text;

      if (reminder.date) {
        hasDate.value = true;
        date.value = reminder.date;

        if (reminder.time) {
          hasTime.value = true;
          time.value = reminder.time;
        }
      }
    } else {
      // Erinnerung nicht gefunden
      router.back();
    }
  }
});
</script>

<style scoped>
.datetime-container {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.datetime-container ion-datetime {
  --background: var(--ion-color-light);
  border-radius: 12px;
}

.error-message {
  color: var(--ion-color-danger);
  font-size: 13px;
  margin: 4px 16px 12px 16px;
  font-weight: 500;
}

.action-buttons {
  margin-top: 32px;
  padding: 0 4px;
}

.save-button {
  margin-bottom: 12px;
}
</style>

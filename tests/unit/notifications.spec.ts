import { describe, expect, test, vi, beforeEach } from 'vitest'

const scheduleMock = vi.fn(() => Promise.resolve({}))
const cancelMock = vi.fn(() => Promise.resolve())
const getPendingMock = vi.fn(() => Promise.resolve({ notifications: [] }))
const registerActionTypesMock = vi.fn(() => Promise.resolve())
const addListenerMock = vi.fn(() => Promise.resolve())
const createChannelMock = vi.fn(() => Promise.resolve())
const checkPermissionsMock = vi.fn(() => Promise.resolve({ display: 'granted' }))
const requestPermissionsMock = vi.fn(() => Promise.resolve({ display: 'granted' }))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: (...args) => scheduleMock(...args),
    cancel: (...args) => cancelMock(...args),
    getPending: (...args) => getPendingMock(...args),
    registerActionTypes: (...args) => registerActionTypesMock(...args),
    addListener: (...args) => addListenerMock(...args),
    createChannel: (...args) => createChannelMock(...args),
    checkPermissions: (...args) => checkPermissionsMock(...args),
    requestPermissions: (...args) => requestPermissionsMock(...args)
  }
}))

// Steuerbarer Mock für Capacitor.isNativePlatform(), damit wir sowohl den
// "echten Geräte"-Pfad als auch den Browser-Fallback testen können.
let isNativePlatform = true
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform,
    getPlatform: () => 'android'
  }
}))

import { scheduleNotification, cancelNotification } from '@/services/notifications.js'

/**
 * Baut Datum/Uhrzeit-Strings (lokale Zeit, wie sie auch die App aus
 * ion-datetime extrahiert) aus einem Date-Objekt, damit die Tests
 * unabhängig von der Zeitzone des Testrunners konsistent bleiben.
 */
function toLocalDateTimeParts(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return { dateStr, timeStr }
}

describe('notifications.js', () => {
  beforeEach(() => {
    isNativePlatform = true
    scheduleMock.mockClear()
    cancelMock.mockClear()
    getPendingMock.mockClear()
  })

  describe('scheduleNotification (Grundanforderung 6)', () => {
    test('plant keine Benachrichtigung, wenn kein Datum gesetzt ist', async () => {
      await scheduleNotification({ id: 1, text: 'Test', date: null, time: null })
      expect(scheduleMock).not.toHaveBeenCalled()
    })

    test('plant keine Benachrichtigung, wenn der Zeitpunkt in der Vergangenheit liegt', async () => {
      await scheduleNotification({ id: 1, text: 'Test', date: '2020-01-01', time: '10:00' })
      expect(scheduleMock).not.toHaveBeenCalled()
    })

    test('plant eine Benachrichtigung für einen zukünftigen Zeitpunkt mit Datum und Uhrzeit', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000) // +1h
      const { dateStr, timeStr } = toLocalDateTimeParts(future)

      await scheduleNotification({ id: 42, text: 'Wäsche waschen', date: dateStr, time: timeStr })

      expect(scheduleMock).toHaveBeenCalledTimes(1)
      const payload = scheduleMock.mock.calls[0][0]
      expect(payload.notifications[0].id).toBe(42)
      expect(payload.notifications[0].body).toBe('Wäsche waschen')
    })

    test('plant auch bei reinem Datum ohne Uhrzeit (bewusste Design-Entscheidung: Standardzeit 00:00)', async () => {
      const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // +2 Tage
      const { dateStr } = toLocalDateTimeParts(future)

      await scheduleNotification({ id: 43, text: 'Tagesaufgabe', date: dateStr, time: null })

      expect(scheduleMock).toHaveBeenCalledTimes(1)
    })

    test('plant nichts im Browser-Modus (nicht native Plattform)', async () => {
      isNativePlatform = false
      const future = new Date(Date.now() + 60 * 60 * 1000)
      const { dateStr, timeStr } = toLocalDateTimeParts(future)

      await scheduleNotification({ id: 1, text: 'Test', date: dateStr, time: timeStr })

      expect(scheduleMock).not.toHaveBeenCalled()
    })
  })

  describe('cancelNotification (Grundanforderung 9)', () => {
    test('storniert eine Benachrichtigung mit der übergebenen ID', async () => {
      await cancelNotification(42)
      expect(cancelMock).toHaveBeenCalledWith({ notifications: [{ id: 42 }] })
    })

    test('ruft das Plugin im Browser-Modus nicht auf', async () => {
      isNativePlatform = false
      await cancelNotification(42)
      expect(cancelMock).not.toHaveBeenCalled()
    })
  })
})

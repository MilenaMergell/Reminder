import { describe, expect, test, vi, beforeEach } from 'vitest'

// In-Memory-Ersatz für den nativen Preferences-Speicher, damit die Tests
// ohne echtes Gerät/Emulator laufen.
const preferencesStore = new Map()

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(({ key }) => Promise.resolve({ value: preferencesStore.get(key) ?? null })),
    set: vi.fn(({ key, value }) => {
      preferencesStore.set(key, value)
      return Promise.resolve()
    })
  }
}))

import { loadReminders, saveReminders } from '@/services/storage.js'

describe('storage.js', () => {
  beforeEach(() => {
    preferencesStore.clear()
  })

  test('loadReminders gibt ein leeres Array zurück, wenn noch nichts gespeichert wurde (Grundanforderung 10)', async () => {
    const reminders = await loadReminders()
    expect(reminders).toEqual([])
  })

  test('saveReminders speichert die Liste als JSON-String unter dem Schlüssel "erinnerungen"', async () => {
    const reminders = [{ id: 1, text: 'Wäsche waschen', date: null, time: null, done: false }]
    await saveReminders(reminders)

    expect(preferencesStore.get('erinnerungen')).toBe(JSON.stringify(reminders))
  })

  test('loadReminders lädt zuvor gespeicherte Erinnerungen unverändert zurück (Persistenz-Round-Trip)', async () => {
    const reminders = [
      { id: 1, text: 'Wäsche waschen', date: '2026-08-01', time: '18:00', done: false },
      { id: 2, text: 'Müll rausbringen', date: null, time: null, done: true }
    ]
    await saveReminders(reminders)

    const loaded = await loadReminders()
    expect(loaded).toEqual(reminders)
  })

  test('loadReminders gibt ein leeres Array zurück, falls die gespeicherten Daten kein gültiges JSON sind', async () => {
    preferencesStore.set('erinnerungen', 'kein-gueltiges-json')
    const reminders = await loadReminders()
    expect(reminders).toEqual([])
  })
})

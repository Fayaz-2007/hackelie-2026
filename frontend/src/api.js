// The backend always runs on port 8000, on whatever host served this page —
// using location.hostname (not a hardcoded "localhost") is what lets this
// page work when opened from another device on the same WiFi.
const BACKEND_PORT = 8000

const httpProtocol = window.location.protocol === 'https:' ? 'https' : 'http'
const wsProtocol = httpProtocol === 'https' ? 'wss' : 'ws'
const host = window.location.hostname || 'localhost'

export const API_BASE = `${httpProtocol}://${host}:${BACKEND_PORT}`
export const WS_URL = `${wsProtocol}://${host}:${BACKEND_PORT}/ws/live`

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`)
  }
  return response.json()
}

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`)
  }
  return response.json()
}

export function fetchLatest() {
  return getJson('/api/latest')
}

export function fetchHistory(limit = 100) {
  return getJson(`/api/history?limit=${limit}`)
}

export function fetchAlerts(limit = 50) {
  return getJson(`/api/alerts?limit=${limit}`)
}

export function fetchSettings() {
  return getJson('/api/settings')
}

export function saveSettings(settings) {
  return postJson('/api/settings', settings)
}

export function postBookingInitiated(event) {
  return postJson('/api/booking-initiated', event)
}

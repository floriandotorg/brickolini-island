import './style.css'
import Alpine from 'alpinejs'
import { initStores } from './lib/store'
import { loadFromISO } from './lib/load'

initStores()

Alpine.start()

if (import.meta.env.DEV) {
  const res = await fetch('/LEGO_ISLANDI.ISO')
  if (!res.ok) {
    throw new Error(`Failed to fetch ISO: ${res.status}`)
  }
  const blob = await res.blob()
  const file = new File([blob], 'your.iso', { type: 'application/octet-stream' })
  loadFromISO(file)
}

const dropZone = document.getElementById('drop-zone')
const isoInput = document.getElementById('iso-input') as HTMLInputElement | null
const dropZoneLabel = dropZone?.querySelector('label[for="iso-input"]')

if (!dropZone || !isoInput || !dropZoneLabel) {
  throw new Error('Elements not found')
}

const handleFileSelect = async (file: File | null) => {
  if (!file) {
    throw new Error('No file selected.')
  }

  if (!file.name.toLowerCase().endsWith('.iso')) {
    throw new Error('Invalid file type. Please select an ISO file.')
  }

  loadFromISO(file)
}

for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
  dropZone.addEventListener(
    eventName,
    e => {
      e.preventDefault()
      e.stopPropagation()
    },
    false,
  )
}

dropZone.addEventListener(
  'drop',
  e => {
    const dt = e.dataTransfer
    const files = dt?.files

    if (files && files.length > 0) {
      handleFileSelect(files[0] ?? null)
    }
  },
  false,
)

isoInput.addEventListener('change', e => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFileSelect(target.files[0] ?? null)
  }
})

dropZone.addEventListener('click', e => {
  if (e.target !== dropZoneLabel && e.target !== isoInput) {
    isoInput.click()
  }
})

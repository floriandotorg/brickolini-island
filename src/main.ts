import './style.css'
import Alpine from 'alpinejs'
import { loadFromISO } from './lib/load'
import { initStores } from './lib/store'

initStores()

Alpine.data('dropZoneComponent', () => ({
  dragging: false,

  handleFileSelect(files: FileList | null) {
    const file = files?.[0] ?? null
    if (!file) {
      throw new Error('No file selected.')
    }

    if (!file.name.toLowerCase().endsWith('.iso')) {
      throw new Error('Invalid file type. Please select an ISO file.')
    }

    loadFromISO(file)
  },

  handleDrop(event: DragEvent) {
    this.dragging = false
    const files = event.dataTransfer?.files
    this.handleFileSelect(files ?? null)
  },
}))

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

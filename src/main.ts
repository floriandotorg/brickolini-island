import './style.css'
import { IsoReader, IsoVariant } from './lib/iso'

const dropZone = document.getElementById('drop-zone')
const isoInput = document.getElementById('iso-input') as HTMLInputElement | null
const dropZoneLabel = dropZone?.querySelector('label[for="iso-input"]')

const handleFileSelect = async (file: File | null) => {
	if (!file) {
		console.error('No file selected.')
		return
	}

	if (!file.name.toLowerCase().endsWith('.iso')) {
		console.error('Invalid file type. Please select an ISO file.')
		return
	}

	try {
		const buffer = await file.arrayBuffer()
		const reader = new IsoReader(buffer, IsoVariant.ISO9660)
		const files = reader.filelist.sort()
		console.log('Files in ISO:', files)
	} catch (e) {
		console.error('Error reading ISO:', e)
		if (e instanceof Error) {
			console.error(`Error details: ${e.message}`)
		} else {
			console.error('An unknown error occurred while reading the ISO file.')
		}
	}
}

if (dropZone && isoInput) {
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

	for (const eventName of ['dragenter', 'dragover']) {
		dropZone.addEventListener(
			eventName,
			() => {
				dropZone.classList.add('highlight')
			},
			false,
		)
	}

	for (const eventName of ['dragleave', 'drop']) {
		dropZone.addEventListener(
			eventName,
			() => {
				dropZone.classList.remove('highlight')
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

	if (dropZoneLabel) {
		dropZone.addEventListener('click', e => {
			if (e.target !== dropZoneLabel && e.target !== isoInput) {
				isoInput.click()
			}
		})
	}
} else {
	console.error('Required elements (drop-zone, iso-input) not found.')
	if (!dropZone) {
		console.error("Element with ID 'drop-zone' not found.")
	}
	if (!isoInput) {
		console.error("Element with ID 'iso-input' not found.")
	}
}

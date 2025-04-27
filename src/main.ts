import "./style.css";

const dropZone = document.getElementById("drop-zone");
const isoInput = document.getElementById(
	"iso-input",
) as HTMLInputElement | null;
const dropZoneLabel = dropZone?.querySelector('label[for="iso-input"]');

const handleFileSelect = (file: File | null) => {
	if (!file) {
		console.error("No file selected.");
		// Handle error display in the UI
		return;
	}

	if (!file.name.toLowerCase().endsWith(".iso")) {
		console.error("Invalid file type. Please select an ISO file.");
		// Handle error display in the UI
		return;
	}

	console.log("Selected ISO file:", file.name);
	// TODO: Add logic to process the ISO file
	// e.g., display loading state, start parsing
};

if (dropZone && isoInput) {
	// Prevent default drag behaviors
	for (const eventName of ["dragenter", "dragover", "dragleave", "drop"]) {
		dropZone.addEventListener(
			eventName,
			(e) => {
				e.preventDefault();
				e.stopPropagation();
			},
			false,
		);
	}

	// Highlight drop zone when item is dragged over it
	for (const eventName of ["dragenter", "dragover"]) {
		dropZone.addEventListener(
			eventName,
			() => {
				dropZone.classList.add("highlight"); // Add a CSS class for highlighting
			},
			false,
		);
	}

	for (const eventName of ["dragleave", "drop"]) {
		dropZone.addEventListener(
			eventName,
			() => {
				dropZone.classList.remove("highlight"); // Remove highlight class
			},
			false,
		);
	}

	// Handle dropped files
	dropZone.addEventListener(
		"drop",
		(e) => {
			const dt = e.dataTransfer;
			const files = dt?.files;

			if (files && files.length > 0) {
				handleFileSelect(files[0] ?? null); // Pass null if files[0] is undefined
			}
		},
		false,
	);

	// Handle file selection via button
	isoInput.addEventListener("change", (e) => {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			handleFileSelect(target.files[0] ?? null); // Pass null if files[0] is undefined
		}
	});

	// Allow clicking the drop zone to trigger file input
	if (dropZoneLabel) {
		// Clicking the label already triggers the input, so we only need the drop zone itself
		dropZone.addEventListener("click", (e) => {
			// Prevent triggering the input if the click was on the label/button itself
			if (e.target !== dropZoneLabel) {
				isoInput.click();
			}
		});
	}
} else {
	console.error("Required elements (drop-zone or iso-input) not found.");
}

// Add a 'highlight' class style to style.css if you want visual feedback
/*
.highlight {
  border-color: #4CAF50; // Green border for highlight
  background-color: #e8f5e9;
}
*/

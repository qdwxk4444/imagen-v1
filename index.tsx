/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// --- DOM Element Selectors ---
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const aspectRatioSelect = document.getElementById('aspect-ratio-select') as HTMLSelectElement;
const productFileInput = document.getElementById('product-file-input') as HTMLInputElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const productPreview = document.getElementById('product-preview') as HTMLImageElement;
const productPlaceholder = document.getElementById('product-placeholder') as HTMLParagraphElement;
const poseFileInput = document.getElementById('pose-file-input') as HTMLInputElement;
const posePreview = document.getElementById('pose-preview') as HTMLImageElement;
const posePlaceholder = document.getElementById('pose-placeholder') as HTMLParagraphElement;


// Output elements
const outputContainer = document.getElementById('output-container');
const outputImage = document.getElementById('output-image') as HTMLImageElement;
const outputText = document.getElementById('output-text') as HTMLParagraphElement;
const outputPlaceholder = document.getElementById('output-placeholder') as HTMLParagraphElement;
const loadingSpinner = document.getElementById('loading-spinner') as HTMLDivElement;

// Download controls
const downloadControls = document.querySelector('.download-controls') as HTMLDivElement;
const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
const formatSelect = document.getElementById('format-select') as HTMLSelectElement;

// --- State Variables ---
let productFile: File | null = null;
let poseFile: File | null = null;


// --- Helper Functions ---

/**
 * Handles file input changes to display a preview and store the file.
 * @param input The file input element.
 * @param preview The image element for the preview.
 * @param placeholder The placeholder text element.
 * @param fileSetter The function to set the state for the file.
 */
function handleFileChange(
  input: HTMLInputElement,
  preview: HTMLImageElement,
  placeholder: HTMLParagraphElement,
  fileSetter: (file: File | null) => void
) {
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
      fileSetter(null);
      preview.src = '#';
      preview.style.display = 'none';
      placeholder.style.display = 'block';
      return;
    }

    // Display preview
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    preview.onload = () => URL.revokeObjectURL(preview.src); // Free memory

    // Set the file state
    fileSetter(file);
  });
}

/**
 * Sets the UI to a loading state.
 */
function setLoading(isLoading: boolean) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
    generateButton.disabled = isLoading;
    if (isLoading) {
        outputImage.style.display = 'none';
        outputText.textContent = '';
        outputPlaceholder.style.display = 'none';
        outputContainer.style.border = 'none';
        downloadControls.classList.add('controls-hidden');
        downloadButton.disabled = true;
    }
}

/**
 * Displays an error message in the output area.
 * @param message The error message to display.
 */
function displayError(message: string) {
    outputPlaceholder.textContent = message;
    outputPlaceholder.style.color = 'var(--error-color)';
    outputPlaceholder.style.display = 'block';
    outputImage.style.display = 'none';
    downloadControls.classList.add('controls-hidden');
    downloadButton.disabled = true;
}


/**
 * Handles downloading the generated image.
 */
function handleDownload() {
    if (!outputImage.src || outputImage.src.endsWith('#')) {
        console.error("No image source available for download.");
        return;
    }

    const format = formatSelect.value as 'png' | 'jpeg';
    const mimeType = `image/${format}`;
    const filename = `generated-model.${format}`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // For JPG format, fill the background with white to avoid black background
        // where transparency would be in a PNG.
        if (format === 'jpeg' && ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx?.drawImage(img, 0, 0);

        // Create a link and trigger the download
        const link = document.createElement('a');
        link.download = filename;
        // For JPEG, the second argument specifies quality (0.0 to 1.0)
        link.href = canvas.toDataURL(mimeType, 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    img.onerror = () => {
        console.error("Failed to load image into canvas for downloading.");
        displayError("An error occurred while preparing the image for download.");
    };

    img.src = outputImage.src;
}

// --- Main Application Logic ---

async function generateImage() {
  if (!productFile) {
    alert('Please upload a product image.');
    return;
  }
  
  const userPrompt = promptInput.value || 'A confident-looking model in a brightly lit studio setting.';
  const selectedAspectRatio = aspectRatioSelect.value;
  
  setLoading(true);
  displayError(''); // Clear previous errors

  try {
    const formData = new FormData();
    formData.append('productFile', productFile);
    formData.append('userPrompt', userPrompt);
    formData.append('selectedAspectRatio', selectedAspectRatio);

    if (poseFile) {
      formData.append('poseFile', poseFile);
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.image) {
        outputImage.src = data.image;
        outputImage.style.display = 'block';
        outputPlaceholder.style.display = 'none';
        downloadControls.classList.remove('controls-hidden');
        downloadButton.disabled = false;
    } else {
        displayError("The model did not return an image. Please try adjusting your prompt or images.");
    }
    
    if (data.text) {
        outputText.textContent = data.text;
    }

  } catch (error) {
    console.error("Error generating image:", error);
    displayError("An error occurred while generating the image. Please check the console for details.");
  } finally {
    setLoading(false);
  }
}

// --- Event Listeners ---

handleFileChange(productFileInput, productPreview, productPlaceholder, (file) => productFile = file);
handleFileChange(poseFileInput, posePreview, posePlaceholder, (file) => poseFile = file);
generateButton.addEventListener('click', generateImage);
downloadButton.addEventListener('click', handleDownload);
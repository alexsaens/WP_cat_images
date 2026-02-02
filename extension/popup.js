// ============================================
// Whisker & Paws Ad Engine - Chrome Extension
// ============================================

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  N8N_BASE_URL: 'https://n8n.xdo.it.com/webhook',
  API_KEY: 'whisker-2025'
};

// DOM Elements
const conceptInput = document.getElementById('concept');
const modelSelect = document.getElementById('model');
const generateBtn = document.getElementById('generateBtn');
const btnText = generateBtn.querySelector('.btn-text');
const btnLoading = generateBtn.querySelector('.btn-loading');
const resultsSection = document.getElementById('results');
const cardsContainer = document.getElementById('cards');
const globalError = document.getElementById('globalError');
const globalErrorMessage = globalError.querySelector('.error-message');
const globalRetryBtn = globalError.querySelector('.btn-retry');
const downloadAllBtn = document.getElementById('downloadAllBtn');

// State
let currentVariations = [];
let currentImageUrls = {};
let currentModel = '';
let currentConcept = '';

// Platform icons (simple text icons for extension)
const platformIcons = {
  Google: 'G',
  Meta: 'M',
  TikTok: 'T',
  Pinterest: 'P',
  YouTube: 'Y'
};

// ============================================
// Utility Functions
// ============================================

function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function fetchImageAsBlob(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch image');
  }
  return response.blob();
}

function getAspectRatioClass(dimensions) {
  if (!dimensions) return '';
  const ratio = dimensions.width / dimensions.height;
  if (ratio > 1.5) return 'aspect-landscape-wide';
  if (ratio > 1.1) return 'aspect-landscape';
  if (ratio > 0.9) return 'aspect-square';
  if (ratio > 0.6) return 'aspect-portrait';
  return 'aspect-portrait-tall';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  btnText.classList.toggle('hidden', isLoading);
  btnLoading.classList.toggle('hidden', !isLoading);
}

function showGlobalError(message) {
  globalErrorMessage.textContent = message;
  globalError.classList.remove('hidden');
}

function hideGlobalError() {
  globalError.classList.add('hidden');
}

function updateDownloadAllButton() {
  const completedCount = Object.keys(currentImageUrls).length;
  if (completedCount > 0) {
    downloadAllBtn.textContent = `Download All (${completedCount})`;
    downloadAllBtn.classList.remove('hidden');
  } else {
    downloadAllBtn.classList.add('hidden');
  }
}

// ============================================
// Event Listeners
// ============================================

generateBtn.addEventListener('click', handleGenerate);
globalRetryBtn.addEventListener('click', handleGenerate);
downloadAllBtn.addEventListener('click', handleDownloadAll);

// ============================================
// Download Functions
// ============================================

async function downloadSingleCard(index) {
  const variation = currentVariations[index];
  const imageUrl = currentImageUrls[index];

  if (!variation || !imageUrl) return;

  const baseName = sanitizeFilename(currentConcept);
  const platform = variation.platform.toLowerCase();
  const filePrefix = `${baseName}_${platform}`;

  // Create and download text file
  const dimensionsText = variation.dimensions
    ? `${variation.dimensions.width}x${variation.dimensions.height}`
    : 'N/A';
  const textContent = `Platform: ${variation.platform}
Dimensions: ${dimensionsText}
Copy: ${variation.copy}
Image Prompt: ${variation.image_prompt}
Generated: ${new Date().toISOString()}`;

  const textBlob = new Blob([textContent], { type: 'text/plain' });
  downloadBlob(textBlob, `${filePrefix}.txt`);

  // Download image
  try {
    const imageBlob = await fetchImageAsBlob(imageUrl);
    downloadBlob(imageBlob, `${filePrefix}.png`);
  } catch (err) {
    console.error('Failed to download image:', err);
    window.open(imageUrl, '_blank');
  }
}

async function handleDownloadAll() {
  const completedIndices = Object.keys(currentImageUrls).map(Number);
  if (completedIndices.length === 0) return;

  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = 'Downloading...';

  try {
    // Download each card's files with a small delay to avoid browser blocking
    for (const index of completedIndices) {
      await downloadSingleCard(index);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } catch (err) {
    console.error('Download all failed:', err);
    showGlobalError('Some downloads may have failed');
  } finally {
    downloadAllBtn.disabled = false;
    updateDownloadAllButton();
  }
}

// Global function for individual download button onclick
window.downloadCard = async function(index) {
  const btn = document.getElementById(`download-btn-${index}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Downloading...';
  }

  try {
    await downloadSingleCard(index);
  } catch (err) {
    console.error('Download failed:', err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Download';
    }
  }
};

// ============================================
// Main Generation Flow
// ============================================

async function handleGenerate() {
  const concept = conceptInput.value.trim();
  const model = modelSelect.value;

  if (!concept) {
    showGlobalError('Please enter an ad concept');
    return;
  }

  // Reset UI and state
  hideGlobalError();
  setLoading(true);
  resultsSection.classList.add('hidden');
  cardsContainer.innerHTML = '';
  currentImageUrls = {};
  downloadAllBtn.classList.add('hidden');

  currentModel = model;
  currentConcept = concept;

  try {
    // Step 1: Generate copy variations
    const variations = await generateCopy(concept);
    currentVariations = variations;

    // Step 2: Show results section and render skeleton cards
    resultsSection.classList.remove('hidden');
    renderSkeletonCards(variations);

    // Step 3: Generate images for each card (in parallel)
    await Promise.all(
      variations.map((variation, index) =>
        generateImageForCard(variation, index)
      )
    );

  } catch (error) {
    showGlobalError(error.message || 'Failed to generate ads');
  } finally {
    setLoading(false);
  }
}

// ============================================
// API Calls
// ============================================

async function generateCopy(concept) {
  const response = await fetch(`${CONFIG.N8N_BASE_URL}/generate-copy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY
    },
    body: JSON.stringify({ concept })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Copy generation failed (${response.status})`);
  }

  const data = await response.json();

  // Handle both array response and wrapped response
  const variations = Array.isArray(data) ? data : data.variations;

  if (!variations || !Array.isArray(variations) || variations.length === 0) {
    throw new Error('Invalid response from copy generation');
  }

  return variations;
}

async function generateImage(prompt, modelId, width, height) {
  const response = await fetch(`${CONFIG.N8N_BASE_URL}/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY
    },
    body: JSON.stringify({
      prompt,
      model_id: modelId,
      width,
      height
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Image generation failed (${response.status})`);
  }

  const data = await response.json();

  if (!data.image_url) {
    throw new Error('No image URL in response');
  }

  return data.image_url;
}

// ============================================
// UI Rendering
// ============================================

function renderSkeletonCards(variations) {
  cardsContainer.innerHTML = '';

  variations.forEach((variation, index) => {
    const card = createCard(variation, index);
    cardsContainer.appendChild(card);
  });
}

function createCard(variation, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = `card-${index}`;

  const platformLower = variation.platform.toLowerCase();
  const aspectClass = getAspectRatioClass(variation.dimensions);
  const dimensionsText = variation.dimensions
    ? `${variation.dimensions.width}x${variation.dimensions.height}`
    : '';

  card.innerHTML = `
    <div class="card-header">
      <span class="platform-badge ${platformLower}">
        ${platformIcons[variation.platform] || variation.platform[0]}
        ${variation.platform}
      </span>
      <div class="card-header-right">
        ${dimensionsText ? `<span class="card-dimensions">${dimensionsText}</span>` : ''}
        <span class="card-status" id="status-${index}">Rendering image...</span>
      </div>
    </div>
    <div class="card-body">
      <p class="card-copy">${escapeHtml(variation.copy)}</p>
      <div class="card-image-container ${aspectClass}" id="image-container-${index}">
        <div class="image-loading">
          <div class="image-spinner"></div>
          <span class="image-loading-text">Generating ${dimensionsText}...</span>
        </div>
      </div>
      <div class="prompt-preview">
        <strong>Prompt:</strong> ${escapeHtml(variation.image_prompt)}
      </div>
      <button class="btn-download hidden" id="download-btn-${index}" onclick="downloadCard(${index})">
        Download
      </button>
    </div>
  `;

  return card;
}

async function generateImageForCard(variation, index) {
  const container = document.getElementById(`image-container-${index}`);
  const status = document.getElementById(`status-${index}`);
  const downloadBtn = document.getElementById(`download-btn-${index}`);

  try {
    const width = variation.dimensions?.width || 1024;
    const height = variation.dimensions?.height || 1024;
    const imageUrl = await generateImage(variation.image_prompt, currentModel, width, height);

    // Store the image URL
    currentImageUrls[index] = imageUrl;

    // Success - show the image
    container.innerHTML = `
      <img class="card-image" src="${imageUrl}" alt="${escapeHtml(variation.platform)} ad image" />
    `;
    status.textContent = 'Complete';
    status.style.color = '#38a169';

    // Show download button
    if (downloadBtn) {
      downloadBtn.classList.remove('hidden');
    }

    // Update download all button
    updateDownloadAllButton();

  } catch (error) {
    // Error - show retry button
    container.innerHTML = `
      <div class="image-error">
        <p class="image-error-text">${escapeHtml(error.message)}</p>
        <button class="btn-retry" onclick="retryImage(${index})">Retry</button>
      </div>
    `;
    status.textContent = 'Failed';
    status.style.color = '#c53030';
  }
}

// Global function for retry button onclick
window.retryImage = async function(index) {
  const variation = currentVariations[index];
  const container = document.getElementById(`image-container-${index}`);
  const status = document.getElementById(`status-${index}`);
  const downloadBtn = document.getElementById(`download-btn-${index}`);

  // Hide download button during retry
  if (downloadBtn) {
    downloadBtn.classList.add('hidden');
  }

  // Remove from image URLs if it was there
  delete currentImageUrls[index];
  updateDownloadAllButton();

  // Show loading state again
  container.innerHTML = `
    <div class="image-loading">
      <div class="image-spinner"></div>
      <span class="image-loading-text">Retrying...</span>
    </div>
  `;
  status.textContent = 'Rendering image...';
  status.style.color = '#888';

  await generateImageForCard(variation, index);
};

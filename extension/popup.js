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

// State
let currentVariations = [];
let currentModel = '';

// Platform icons (simple text icons for extension)
const platformIcons = {
  Google: 'G',
  Meta: 'M',
  TikTok: 'T',
  Pinterest: 'P',
  YouTube: 'Y'
};

// ============================================
// Event Listeners
// ============================================

generateBtn.addEventListener('click', handleGenerate);
globalRetryBtn.addEventListener('click', handleGenerate);

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

  // Reset UI
  hideGlobalError();
  setLoading(true);
  resultsSection.classList.add('hidden');
  cardsContainer.innerHTML = '';

  currentModel = model;

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

async function generateImage(prompt, modelId) {
  const response = await fetch(`${CONFIG.N8N_BASE_URL}/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY
    },
    body: JSON.stringify({
      prompt,
      model_id: modelId
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

  card.innerHTML = `
    <div class="card-header">
      <span class="platform-badge ${platformLower}">
        ${platformIcons[variation.platform] || variation.platform[0]}
        ${variation.platform}
      </span>
      <span class="card-status" id="status-${index}">Rendering image...</span>
    </div>
    <div class="card-body">
      <p class="card-copy">${escapeHtml(variation.copy)}</p>
      <div class="card-image-container" id="image-container-${index}">
        <div class="image-loading">
          <div class="image-spinner"></div>
          <span class="image-loading-text">Generating with AI...</span>
        </div>
      </div>
      <div class="prompt-preview">
        <strong>Prompt:</strong> ${escapeHtml(variation.image_prompt)}
      </div>
    </div>
  `;

  return card;
}

async function generateImageForCard(variation, index) {
  const container = document.getElementById(`image-container-${index}`);
  const status = document.getElementById(`status-${index}`);

  try {
    const imageUrl = await generateImage(variation.image_prompt, currentModel);

    // Success - show the image
    container.innerHTML = `
      <img class="card-image" src="${imageUrl}" alt="${escapeHtml(variation.platform)} ad image" />
    `;
    status.textContent = 'Complete';
    status.style.color = '#38a169';

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

// ============================================
// Utility Functions
// ============================================

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

'use client';

import { useState, useCallback } from 'react';
import JSZip from 'jszip';

// ============================================
// Configuration - UPDATE THESE VALUES
// ============================================
const CONFIG = {
  N8N_BASE_URL: 'https://n8n.xdo.it.com/webhook',
  API_KEY: 'whisker-2025',
};

// ============================================
// Types
// ============================================
interface Dimensions {
  width: number;
  height: number;
}

interface Variation {
  platform: 'Google' | 'Meta' | 'TikTok' | 'Pinterest' | 'YouTube';
  copy: string;
  image_prompt: string;
  dimensions: Dimensions;
}

interface CardState {
  variation: Variation;
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

const MODEL_OPTIONS = [
  { value: 'fal-ai/flux/dev', label: 'Flux Dev (High Quality)' },
  { value: 'fal-ai/fast-sdxl', label: 'Fast SDXL (Speed)' },
  { value: 'fal-ai/recraft-v3', label: 'Recraft V3 (Vector/Illustration)' },
  { value: 'fal-ai/nano-banana-pro', label: 'Nano Banana Pro (Creative)' },
];

// ============================================
// Utility Functions
// ============================================
function sanitizeFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch image');
  }
  return response.blob();
}

function getAspectRatioClass(dimensions: Dimensions): string {
  const ratio = dimensions.width / dimensions.height;
  if (ratio > 1.5) return 'aspect-landscape-wide';
  if (ratio > 1.1) return 'aspect-landscape';
  if (ratio > 0.9) return 'aspect-square';
  if (ratio > 0.6) return 'aspect-portrait';
  return 'aspect-portrait-tall';
}

// ============================================
// API Functions
// ============================================
async function generateCopy(concept: string): Promise<Variation[]> {
  const response = await fetch(`${CONFIG.N8N_BASE_URL}/generate-copy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY,
    },
    body: JSON.stringify({ concept }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Copy generation failed (${response.status})`);
  }

  const data = await response.json();
  const variations = Array.isArray(data) ? data : data.variations;

  if (!variations || !Array.isArray(variations) || variations.length === 0) {
    throw new Error('Invalid response from copy generation');
  }

  return variations;
}

async function generateImage(
  prompt: string,
  modelId: string,
  width: number,
  height: number
): Promise<string> {
  const response = await fetch(`${CONFIG.N8N_BASE_URL}/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY,
    },
    body: JSON.stringify({
      prompt,
      model_id: modelId,
      width,
      height,
    }),
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
// Download Functions
// ============================================
async function downloadSingleCard(
  cardState: CardState,
  conceptName: string
): Promise<void> {
  const { variation, imageUrl } = cardState;
  if (!imageUrl) return;

  const baseName = sanitizeFilename(conceptName);
  const platform = variation.platform.toLowerCase();
  const filePrefix = `${baseName}_${platform}`;

  const textContent = `Platform: ${variation.platform}
Dimensions: ${variation.dimensions.width}x${variation.dimensions.height}
Copy: ${variation.copy}
Image Prompt: ${variation.image_prompt}
Generated: ${new Date().toISOString()}`;

  const textBlob = new Blob([textContent], { type: 'text/plain' });
  const textUrl = URL.createObjectURL(textBlob);
  const textLink = document.createElement('a');
  textLink.href = textUrl;
  textLink.download = `${filePrefix}.txt`;
  textLink.click();
  URL.revokeObjectURL(textUrl);

  try {
    const imageBlob = await fetchImageAsBlob(imageUrl);
    const imageDownloadUrl = URL.createObjectURL(imageBlob);
    const imageLink = document.createElement('a');
    imageLink.href = imageDownloadUrl;
    imageLink.download = `${filePrefix}.png`;
    imageLink.click();
    URL.revokeObjectURL(imageDownloadUrl);
  } catch (err) {
    console.error('Failed to download image:', err);
    window.open(imageUrl, '_blank');
  }
}

async function downloadAllAsZip(
  cards: CardState[],
  conceptName: string
): Promise<void> {
  const zip = new JSZip();
  const baseName = sanitizeFilename(conceptName);
  const folder = zip.folder(baseName);

  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }

  const downloadPromises = cards.map(async (cardState) => {
    const { variation, imageUrl } = cardState;
    if (!imageUrl) return;

    const platform = variation.platform.toLowerCase();
    const filePrefix = `${baseName}_${platform}`;

    const textContent = `Platform: ${variation.platform}
Dimensions: ${variation.dimensions.width}x${variation.dimensions.height}
Copy: ${variation.copy}
Image Prompt: ${variation.image_prompt}
Generated: ${new Date().toISOString()}`;
    folder.file(`${filePrefix}.txt`, textContent);

    try {
      const imageBlob = await fetchImageAsBlob(imageUrl);
      folder.file(`${filePrefix}.png`, imageBlob);
    } catch (err) {
      console.error(`Failed to fetch image for ${platform}:`, err);
    }
  });

  await Promise.all(downloadPromises);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = zipUrl;
  link.download = `${baseName}_ads.zip`;
  link.click();
  URL.revokeObjectURL(zipUrl);
}

// ============================================
// Components
// ============================================
function PlatformIcon({ platform }: { platform: string }) {
  const icons: Record<string, string> = {
    Google: 'G',
    Meta: 'M',
    TikTok: 'T',
    Pinterest: 'P',
    YouTube: 'Y',
  };
  return <span className="platform-icon">{icons[platform] || platform[0]}</span>;
}

interface AdCardProps {
  cardState: CardState;
  index: number;
  conceptName: string;
  onRetry: (index: number) => void;
}

function AdCard({ cardState, index, conceptName, onRetry }: AdCardProps) {
  const { variation, imageUrl, isLoading, error } = cardState;
  const platformLower = variation.platform.toLowerCase();
  const [isDownloading, setIsDownloading] = useState(false);
  const aspectClass = getAspectRatioClass(variation.dimensions);

  const handleDownload = async () => {
    if (!imageUrl) return;
    setIsDownloading(true);
    try {
      await downloadSingleCard(cardState, conceptName);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className={`platform-badge ${platformLower}`}>
          <PlatformIcon platform={variation.platform} />
          {variation.platform}
        </span>
        <div className="card-header-right">
          <span className="card-dimensions">
            {variation.dimensions.width}x{variation.dimensions.height}
          </span>
          <span className={`card-status ${imageUrl ? 'success' : error ? 'error' : ''}`}>
            {isLoading ? 'Rendering...' : imageUrl ? 'Complete' : error ? 'Failed' : 'Pending'}
          </span>
        </div>
      </div>
      <div className="card-body">
        <p className="card-copy">{variation.copy}</p>
        <div className={`card-image-container ${aspectClass}`}>
          {isLoading && (
            <div className="image-loading">
              <div className="image-spinner"></div>
              <span className="image-loading-text">Generating {variation.dimensions.width}x{variation.dimensions.height}...</span>
            </div>
          )}
          {imageUrl && (
            <img
              className="card-image"
              src={imageUrl}
              alt={`${variation.platform} ad image`}
            />
          )}
          {error && !isLoading && (
            <div className="image-error">
              <p className="image-error-text">{error}</p>
              <button className="btn-retry" onClick={() => onRetry(index)}>
                Retry
              </button>
            </div>
          )}
        </div>
        <div className="prompt-preview">
          <strong>Prompt:</strong> {variation.image_prompt}
        </div>
        {imageUrl && (
          <button
            className="btn-download"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function Home() {
  const [concept, setConcept] = useState('');
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [cards, setCards] = useState<CardState[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const generateImageForCard = useCallback(
    async (index: number, variation: Variation, selectedModel: string) => {
      setCards((prev) =>
        prev.map((card, i) =>
          i === index ? { ...card, isLoading: true, error: null } : card
        )
      );

      try {
        const imageUrl = await generateImage(
          variation.image_prompt,
          selectedModel,
          variation.dimensions.width,
          variation.dimensions.height
        );
        setCards((prev) =>
          prev.map((card, i) =>
            i === index ? { ...card, imageUrl, isLoading: false } : card
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Image generation failed';
        setCards((prev) =>
          prev.map((card, i) =>
            i === index ? { ...card, error: errorMessage, isLoading: false } : card
          )
        );
      }
    },
    []
  );

  const handleGenerate = async () => {
    if (!concept.trim()) {
      setGlobalError('Please enter an ad concept');
      return;
    }

    setGlobalError(null);
    setIsGenerating(true);
    setCards([]);

    try {
      const variations = await generateCopy(concept);

      const initialCards: CardState[] = variations.map((variation) => ({
        variation,
        imageUrl: null,
        isLoading: true,
        error: null,
      }));
      setCards(initialCards);

      await Promise.all(
        variations.map((variation, index) =>
          generateImageForCard(index, variation, model)
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate ads';
      setGlobalError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = (index: number) => {
    const card = cards[index];
    if (card) {
      generateImageForCard(index, card.variation, model);
    }
  };

  const handleDownloadAll = async () => {
    const completedCards = cards.filter((card) => card.imageUrl);
    if (completedCards.length === 0) return;

    setIsDownloadingAll(true);
    try {
      await downloadAllAsZip(completedCards, concept);
    } catch (err) {
      console.error('Download all failed:', err);
      setGlobalError('Failed to download ZIP file');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const completedCount = cards.filter((card) => card.imageUrl).length;
  const hasCompletedCards = completedCount > 0;

  return (
    <div className="container">
      <header className="header">
        <h1>Whisker & Paws</h1>
        <p className="subtitle">Ad Engine</p>
      </header>

      <div className="input-section">
        <div className="input-row">
          <div className="input-group">
            <label htmlFor="concept">Your Ad Concept</label>
            <textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g., Premium organic cat food that helps cats live longer, healthier lives..."
              rows={3}
            />
          </div>
          <div className="input-group">
            <label htmlFor="model">Image Model</label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ marginTop: '16px' }}
            >
              {isGenerating ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                'Generate Ads'
              )}
            </button>
          </div>
        </div>
      </div>

      {globalError && (
        <div className="global-error">
          <p className="error-message">{globalError}</p>
          <button className="btn-retry" onClick={handleGenerate}>
            Retry
          </button>
        </div>
      )}

      {cards.length > 0 && (
        <div className="results">
          <div className="results-header">
            <h2>Generated Variations</h2>
            {hasCompletedCards && (
              <button
                className="btn-download-all"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
              >
                {isDownloadingAll
                  ? 'Creating ZIP...'
                  : `Download All (${completedCount})`}
              </button>
            )}
          </div>
          <div className="cards-grid">
            {cards.map((cardState, index) => (
              <AdCard
                key={index}
                cardState={cardState}
                index={index}
                conceptName={concept}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

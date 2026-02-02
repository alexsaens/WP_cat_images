'use client';

import { useState, useCallback } from 'react';

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
interface Variation {
  platform: 'Google' | 'Meta' | 'TikTok' | 'Pinterest' | 'YouTube';
  copy: string;
  image_prompt: string;
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

async function generateImage(prompt: string, modelId: string): Promise<string> {
  const response = await fetch(`${CONFIG.N8N_BASE_URL}/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY,
    },
    body: JSON.stringify({
      prompt,
      model_id: modelId,
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
  onRetry: (index: number) => void;
}

function AdCard({ cardState, index, onRetry }: AdCardProps) {
  const { variation, imageUrl, isLoading, error } = cardState;
  const platformLower = variation.platform.toLowerCase();

  return (
    <div className="card">
      <div className="card-header">
        <span className={`platform-badge ${platformLower}`}>
          <PlatformIcon platform={variation.platform} />
          {variation.platform}
        </span>
        <span className={`card-status ${imageUrl ? 'success' : error ? 'error' : ''}`}>
          {isLoading ? 'Rendering image...' : imageUrl ? 'Complete' : error ? 'Failed' : 'Pending'}
        </span>
      </div>
      <div className="card-body">
        <p className="card-copy">{variation.copy}</p>
        <div className="card-image-container">
          {isLoading && (
            <div className="image-loading">
              <div className="image-spinner"></div>
              <span className="image-loading-text">Generating with AI...</span>
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
  const [cards, setCards] = useState<CardState[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const generateImageForCard = useCallback(
    async (index: number, variation: Variation, selectedModel: string) => {
      // Set loading state for this card
      setCards((prev) =>
        prev.map((card, i) =>
          i === index ? { ...card, isLoading: true, error: null } : card
        )
      );

      try {
        const imageUrl = await generateImage(variation.image_prompt, selectedModel);
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
      // Step 1: Generate copy variations
      const variations = await generateCopy(concept);

      // Step 2: Create initial card states (skeleton)
      const initialCards: CardState[] = variations.map((variation) => ({
        variation,
        imageUrl: null,
        isLoading: true,
        error: null,
      }));
      setCards(initialCards);

      // Step 3: Generate images for all cards in parallel
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
          <h2>Generated Variations</h2>
          <div className="cards-grid">
            {cards.map((cardState, index) => (
              <AdCard
                key={index}
                cardState={cardState}
                index={index}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

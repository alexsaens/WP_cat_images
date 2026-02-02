# Whisker & Paws Ad Engine

A marketing asset generator that creates multi-platform ad variations using AI. Generate ad copy and images for Google, Meta, TikTok, Pinterest, and YouTube in seconds.

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   Chrome Ext    │────▶│         n8n Workflows                │
│   or Web App    │     │                                      │
└────────┬────────┘     │  ┌─────────────────────────────────┐ │
         │              │  │ /webhook/generate-copy          │ │
         │              │  │ └─▶ Anthropic Claude 3.5 Sonnet │ │
         │              │  │     └─▶ 5 ad variations         │ │
         │              │  └─────────────────────────────────┘ │
         │              │                                      │
         │              │  ┌─────────────────────────────────┐ │
         │              │  │ /webhook/generate-image         │ │
         │              │  │ └─▶ fal.ai (Flux/SDXL/etc)      │ │
         │              │  │     └─▶ Generated image URL     │ │
         │              │  └─────────────────────────────────┘ │
         │              └──────────────────────────────────────┘
         │
         ▼
   User sees text first,
   then images load one-by-one
```

## Quick Start

### 1. Set Up n8n Workflows

#### Import Workflows
1. Go to your n8n instance (e.g., `https://n8n.xdo.it.com/`)
2. Create a new workflow and import `n8n/workflow_copy_gen.json`
3. Create another workflow and import `n8n/workflow_image_gen.json`

#### Configure Credentials

**Anthropic API Key:**
1. In n8n, go to **Settings > Credentials**
2. Create new **Anthropic API** credential
3. Enter your Anthropic API key
4. In `workflow_copy_gen.json`, update the credential reference in the "Generate Copy with Claude" node

**fal.ai API Key:**
1. In n8n, go to **Settings > Credentials**
2. Create new **Header Auth** credential:
   - Name: `fal.ai API Key`
   - Header Name: `Authorization`
   - Header Value: `Key YOUR_FAL_API_KEY`
3. In `workflow_image_gen.json`, update the credential reference in the "Call fal.ai" node

#### Activate Workflows
1. Open each imported workflow
2. Click **Activate** (toggle in top-right)
3. Note the webhook URLs shown (should be `/webhook/generate-copy` and `/webhook/generate-image`)

### 2. Configure Frontend URLs

Update the n8n base URL in both frontends if different from the default:

**Chrome Extension:** Edit `extension/popup.js`
```javascript
const CONFIG = {
  N8N_BASE_URL: 'https://your-n8n-instance.com/webhook',  // <-- Update this
  API_KEY: 'whisker-2025'
};
```

**Web App:** Edit `web-app/app/page.tsx`
```typescript
const CONFIG = {
  N8N_BASE_URL: 'https://your-n8n-instance.com/webhook',  // <-- Update this
  API_KEY: 'whisker-2025',
};
```

### 3. Run the Web App

```bash
cd web-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension` folder
5. Click the extension icon in your toolbar

## Project Structure

```
/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json       # Extension configuration
│   ├── popup.html          # Popup UI
│   ├── popup.css           # Styles
│   ├── popup.js            # Orchestration logic
│   └── icons/              # Extension icons (add your own)
│
├── web-app/                # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Main page with generation logic
│   │   └── globals.css     # Global styles
│   ├── package.json
│   └── next.config.js
│
├── n8n/                    # n8n Workflow JSON files
│   ├── workflow_copy_gen.json    # Copy generation workflow
│   └── workflow_image_gen.json   # Image generation workflow
│
└── docs/                   # Additional documentation
```

## API Reference

### POST /webhook/generate-copy

Generate 5 ad copy variations for different platforms.

**Headers:**
```
Content-Type: application/json
x-api-key: whisker-2025
```

**Request Body:**
```json
{
  "concept": "Premium organic cat food that helps cats live longer"
}
```

**Response:**
```json
[
  {
    "platform": "Google",
    "copy": "Organic cat food for a healthier, longer life.",
    "image_prompt": "A happy tabby cat eating from a premium bowl..."
  },
  {
    "platform": "Meta",
    "copy": "Give your fur baby the gift of health! 🐱...",
    "image_prompt": "Warm lifestyle shot of a cat owner..."
  }
  // ... 3 more variations
]
```

### POST /webhook/generate-image

Generate a single image from a prompt.

**Headers:**
```
Content-Type: application/json
x-api-key: whisker-2025
```

**Request Body:**
```json
{
  "prompt": "A happy tabby cat eating from a premium ceramic bowl...",
  "model_id": "fal-ai/flux/dev"
}
```

**Response:**
```json
{
  "image_url": "https://fal.media/files/..."
}
```

## Image Models

| Model ID | Description | Best For |
|----------|-------------|----------|
| `fal-ai/flux/dev` | High quality, detailed | Product shots, hero images |
| `fal-ai/fast-sdxl` | Fast generation | Quick iterations, testing |
| `fal-ai/recraft-v3` | Vector/illustration style | Logos, graphics, icons |
| `fal-ai/nano-banana-pro` | Creative/experimental | Unique artistic styles |

## Configuration Reference

### Environment Variables (n8n)

Set these in your n8n instance:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `ANTHROPIC_API_KEY` | Anthropic API key | [console.anthropic.com](https://console.anthropic.com/) |
| `FAL_KEY` | fal.ai API key | [fal.ai/dashboard](https://fal.ai/dashboard) |

### Hardcoded Values to Update

| File | Variable | Default Value |
|------|----------|---------------|
| `extension/popup.js` | `CONFIG.N8N_BASE_URL` | `https://n8n.xdo.it.com/webhook` |
| `extension/popup.js` | `CONFIG.API_KEY` | `whisker-2025` |
| `web-app/app/page.tsx` | `CONFIG.N8N_BASE_URL` | `https://n8n.xdo.it.com/webhook` |
| `web-app/app/page.tsx` | `CONFIG.API_KEY` | `whisker-2025` |

## Security

- All requests to n8n require the `x-api-key` header
- The API key is validated in the n8n workflow before processing
- Unauthorized requests receive a 401 response

## Troubleshooting

### "Unauthorized" error
- Check that `x-api-key` header is set correctly
- Verify the API key matches in both frontend and n8n workflow

### Images not generating
- Check fal.ai credentials in n8n
- Verify the model ID is valid
- Check n8n execution logs for detailed errors

### CORS errors
- The n8n workflows include CORS headers
- If issues persist, check n8n's CORS configuration

### Copy generation returns invalid JSON
- The Claude prompt is designed to return pure JSON
- Check n8n execution logs to see the raw response
- The Code node includes fallback parsing logic

## License

MIT

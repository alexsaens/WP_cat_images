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
x-api-key: XXXXXXXXXXX
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
x-api-key: XXXXXXX
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



## Troubleshooting

### "Unauthorized" error
- Check that `XXXXXX` header is set correctly
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

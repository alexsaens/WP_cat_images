# Detailed Setup Guide

This guide walks through the complete setup process for the Whisker & Paws Ad Engine.

## Prerequisites

- Node.js 18+ (for the web app)
- Chrome browser (for the extension)
- Self-hosted n8n instance with:
  - Access to import workflows
  - Ability to create credentials
- API keys for:
  - Anthropic (Claude 3.5 Sonnet)
  - fal.ai (image generation)

## Step 1: Get Your API Keys

### Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy and save it securely

### fal.ai API Key
1. Go to [fal.ai](https://fal.ai/)
2. Sign up or log in
3. Go to Dashboard > Keys
4. Create a new API key
5. Copy and save it securely

## Step 2: Set Up n8n

### Import the Copy Generation Workflow

1. Open your n8n instance
2. Click **Add Workflow** (+ button)
3. Click the three dots menu → **Import from File**
4. Select `n8n/workflow_copy_gen.json`
5. The workflow will be imported with these nodes:
   - Webhook Trigger (POST /generate-copy)
   - Check API Key (validates x-api-key header)
   - Generate Copy with Claude (Anthropic node)
   - Parse Claude Response (Code node)
   - Respond with Variations
   - Respond Unauthorized

### Import the Image Generation Workflow

1. Click **Add Workflow** (+ button)
2. Click the three dots menu → **Import from File**
3. Select `n8n/workflow_image_gen.json`
4. The workflow will be imported with these nodes:
   - Webhook Trigger (POST /generate-image)
   - Check API Key
   - Call fal.ai (HTTP Request)
   - Extract Image URL (Code node)
   - Respond with Image URL
   - Respond Unauthorized

### Configure Anthropic Credential

1. In n8n, go to **Settings** (gear icon) → **Credentials**
2. Click **Add Credential**
3. Search for "Anthropic"
4. Select **Anthropic API**
5. Enter:
   - **Credential Name**: `Anthropic API`
   - **API Key**: Your Anthropic API key
6. Click **Save**
7. Open the **workflow_copy_gen** workflow
8. Click on the **Generate Copy with Claude** node
9. In the Credential dropdown, select your new Anthropic credential
10. Click **Save**

### Configure fal.ai Credential

1. Go to **Settings** → **Credentials**
2. Click **Add Credential**
3. Search for "Header Auth"
4. Select **Header Auth**
5. Enter:
   - **Credential Name**: `fal.ai API Key`
   - **Name** (header name): `Authorization`
   - **Value** (header value): `Key YOUR_FAL_API_KEY` (replace with your actual key)
6. Click **Save**
7. Open the **workflow_image_gen** workflow
8. Click on the **Call fal.ai** node
9. In the Credential dropdown, select your new Header Auth credential
10. Click **Save**

### Activate Workflows

1. Open each workflow
2. Toggle the **Active** switch in the top-right corner
3. You should see "Workflow is active" confirmation

### Verify Webhook URLs

After activation, note the webhook URLs:
- Copy generation: `https://your-n8n-instance.com/webhook/generate-copy`
- Image generation: `https://your-n8n-instance.com/webhook/generate-image`

## Step 3: Update Frontend Configuration

### If your n8n URL is different from the default

The default configuration assumes `https://n8n.xdo.it.com/webhook`.

**For Chrome Extension:**
Edit `extension/popup.js` line 7:
```javascript
N8N_BASE_URL: 'https://YOUR-N8N-INSTANCE/webhook',
```

**For Web App:**
Edit `web-app/app/page.tsx` line 11:
```typescript
N8N_BASE_URL: 'https://YOUR-N8N-INSTANCE/webhook',
```

### If you want a different API key

Change `whisker-2025` in:
1. `extension/popup.js` - CONFIG.API_KEY
2. `web-app/app/page.tsx` - CONFIG.API_KEY
3. Both n8n workflows - in the "Check API Key" node condition

## Step 4: Test the Workflows

### Test Copy Generation
```bash
curl -X POST https://your-n8n-instance.com/webhook/generate-copy \
  -H "Content-Type: application/json" \
  -H "x-api-key: whisker-2025" \
  -d '{"concept": "Premium cat treats made with real salmon"}'
```

Expected response: JSON array with 5 ad variations.

### Test Image Generation
```bash
curl -X POST https://your-n8n-instance.com/webhook/generate-image \
  -H "Content-Type: application/json" \
  -H "x-api-key: whisker-2025" \
  -d '{"prompt": "A fluffy orange cat enjoying premium treats", "model_id": "fal-ai/fast-sdxl"}'
```

Expected response: JSON with `image_url` field.

## Step 5: Run the Frontends

### Web App
```bash
cd web-app
npm install
npm run dev
```
Open http://localhost:3000

### Chrome Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top-right)
4. Click "Load unpacked"
5. Select the `extension` folder
6. Click the extension icon to open

## Troubleshooting

### Workflow not responding
- Check if workflow is activated (toggle should be ON)
- Check n8n execution logs for errors
- Verify webhook path matches your request URL

### "Invalid API key" / 401 errors
- Ensure `x-api-key` header is present in request
- Verify key matches in frontend and n8n workflow
- Check for typos or extra whitespace

### Claude returns malformed JSON
- Check n8n execution to see raw response
- The Code node has fallback parsing logic
- If persistent, check Anthropic API status

### fal.ai errors
- Verify your fal.ai API key is valid
- Check if you have credits/quota remaining
- Some models may have rate limits

### CORS errors in browser
- Workflows include CORS headers
- If using a proxy/CDN, ensure headers pass through
- Check browser network tab for exact error

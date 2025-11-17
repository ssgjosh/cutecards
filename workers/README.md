# AI Message Suggestions - Deployment Guide

## What This Does

Generates personalized greeting card messages using OpenRouter AI (GPT-4o-mini with vision).

**Cost**: ~$0.001-0.002 per request (less than 1 penny)

**Features**:
- Analyzes card image to match tone
- Generates 3 message suggestions (short, medium, long)
- One-time use per card (session tracking)
- Ultra-cheap via OpenRouter

## Deployment Steps

### 1. Install Wrangler (if not already installed)

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Set Your OpenRouter API Key

Get your API key from: https://openrouter.ai/keys

Then set it as a secret:

```bash
cd "C:\Users\josh.smith\Shopify Theme\workers"
wrangler secret put OPENROUTER_API_KEY
```

When prompted, paste your OpenRouter API key.

### 4. Deploy the Worker

```bash
cd "C:\Users\josh.smith\Shopify Theme\workers"
wrangler deploy
```

### 5. Update Worker URL in Frontend

After deployment, Wrangler will show your worker URL. It will look like:

```
https://cute-cards-ai-suggestions.<YOUR-SUBDOMAIN>.workers.dev
```

Update the URL in `assets/cc-choice.js` (line 1532):

```javascript
const response = await fetch('https://cute-cards-ai-suggestions.YOUR-SUBDOMAIN.workers.dev', {
```

Replace `YOUR-SUBDOMAIN` with the actual subdomain from your deployment.

### 6. Deploy Frontend Changes

```bash
cd "C:\Users\josh.smith\Shopify Theme"
shopify theme push --theme 190802035018 --only assets/cc-choice.js --only assets/cc-choice.css --allow-live
```

## Testing

1. Open a product modal on your site
2. Click "Stuck for words?"
3. Fill in:
   - Recipient: Mum
   - Occasion: Birthday
   - Details: Loves gardening
4. Click "Generate Suggestions"
5. Should see 3 AI-generated messages appear
6. Click one to insert it into the card

## Troubleshooting

### "Authentication required"
Your OpenRouter API key isn't set. Run:
```bash
wrangler secret put OPENROUTER_API_KEY
```

### "AI service error"
Check OpenRouter API key is valid and has credits.

### "Failed to generate suggestions"
Check browser console for detailed error. Worker URL might be wrong in cc-choice.js.

### Session tracking not working
Clear your browser session storage or use incognito mode to test.

## Cost Monitoring

Track your API usage at: https://openrouter.ai/activity

Expected costs:
- Per request: $0.001-0.002
- 1000 requests: ~$1-2
- Monthly (estimated): <$10 for moderate traffic

## Files Modified

- `workers/ai-suggestions.js` - Cloudflare Worker
- `workers/wrangler.toml` - Worker configuration
- `assets/cc-choice.js` - Frontend AI form & handlers
- `assets/cc-choice.css` - AI form styling

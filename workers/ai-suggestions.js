/**
 * Cloudflare Worker: AI Message Suggestions
 * Generates personalized greeting card messages using OpenRouter API
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const { recipient, occasion, details, imageUrl } = await request.json();

      // Validate inputs
      if (!recipient || !occasion) {
        return new Response(JSON.stringify({
          error: 'Missing required fields'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Build the prompt
      const prompt = `You are writing a greeting card message. Write 3 personalized messages for this card.

Recipient: ${recipient}
Occasion: ${occasion}
${details ? `About them: ${details}` : ''}

Write 3 different messages:
1. Brief (under 50 characters)
2. Sweet (80-120 characters)
3. Heartfelt (150-250 characters)

Rules:
- Be warm and genuine
- Use the details about the recipient to make it personal and specific
- No "Dear [name]" or signatures
- Just the message text

Return ONLY the 3 messages as plain text, one per line, numbered 1-3.`;

      // Build message content (text-only for now)
      // Note: Vision disabled temporarily - Shopify CDN URLs return 404 when accessed by OpenRouter
      // TODO: Implement image proxy or use different image source
      const messageContent = [{
        type: 'text',
        text: prompt
      }];

      // Call OpenRouter API
      const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://zir0yr-xe.myshopify.com',
          'X-Title': 'Cute Cards',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          max_tokens: 400,
          temperature: 0.9
        })
      });

      if (!openrouterResponse.ok) {
        const errorText = await openrouterResponse.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          error: 'AI service error',
          details: errorText
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await openrouterResponse.json();
      const content = data.choices[0].message.content;

      // Parse numbered list format (1. Message, 2. Message, 3. Message)
      const lines = content
        .split(/\n+/)
        .map(l => l.trim())
        .filter(l => l.length > 10)
        .map(l => l.replace(/^\d+[\.\):\-]\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(l => l.length > 0);

      // Create suggestions with descriptive labels
      const labels = ['Brief & Sweet', 'Warm & Personal', 'Heartfelt'];
      const suggestions = lines.slice(0, 3).map((message, i) => ({
        message: message,
        label: labels[i] || 'Option ' + (i + 1)
      }));

      // Fallback if parsing failed
      if (suggestions.length === 0) {
        suggestions.push(
          {
            message: "Wishing you all the happiness in the world!",
            label: 'Brief & Sweet'
          },
          {
            message: "Hope your special day is filled with love and laughter.",
            label: 'Warm & Personal'
          },
          {
            message: "Sending you warm wishes on your special day. May it be filled with joy, love, and wonderful memories!",
            label: 'Heartfelt'
          }
        );
      }

      return new Response(JSON.stringify({
        suggestions: suggestions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

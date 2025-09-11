import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { messages, options = {} } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Ensure "json" appears in messages for OpenAI requirement
    const enhancedMessages = [...messages];
    if (enhancedMessages.length > 0) {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1];
      if (!lastMessage.content.toLowerCase().includes('json')) {
        enhancedMessages[enhancedMessages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + ' Return response in JSON format.'
        };
      }
    }

    const {
      temperature = 0.8,
      max_tokens = 1200,
      max_completion_tokens,
      model = 'gpt-5-2025-08-07'
    } = options;

    console.log(`AI Chat JSON - Model: ${model}, Messages: ${messages.length}`);

    // Normalize model parameters based on model type
    const isGPT5Model = model?.startsWith('gpt-5');
    const isGPT4_1Model = model?.includes('gpt-4.1');
    const isO3Model = model?.startsWith('o3') || model?.startsWith('o4');
    const isNewerModel = isGPT5Model || isGPT4_1Model || isO3Model;
    
    const tokenLimit = max_completion_tokens || max_tokens;
    const tokenParameter = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

    // Build request body with proper parameters
    const requestBody: any = {
      model,
      messages: enhancedMessages,
      [tokenParameter]: tokenLimit,
      response_format: { type: "json_object" }
    };

    // GPT-5 models don't support reasoning parameter - removed

    // Only add temperature for legacy models
    if (!isNewerModel) {
      requestBody.temperature = temperature;
    }

    console.log(`Request body keys: ${Object.keys(requestBody).join(', ')}`);
    console.log(`Using model: ${model}`);

    // Reduce timeout for faster failure detection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error ${response.status}:`, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: `HTTP ${response.status}: ${errorText}` } };
      }

      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'OpenAI API request failed',
          status: response.status,
          details: errorData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const finishReason = data.choices?.[0]?.finish_reason;
    
    console.log(`✅ API Success - Model: ${data.model}, Finish: ${finishReason}, Content: ${content?.length || 0} chars`);
    
    if (!content || content.trim() === '') {
      const errorMsg = finishReason === 'length' 
        ? 'Response truncated - prompt too long. Try shorter input.'
        : `No content received from OpenAI (finish_reason: ${finishReason})`;
      
      console.error(errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg, finishReason }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced JSON parsing with cleanup
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      console.log('Successfully parsed JSON response');
    } catch (parseError) {
      console.error('Initial JSON parse failed, attempting cleanup');
      
      // Clean content by removing common wrapping patterns
      let cleanedContent = content
        .replace(/```json\s*|\s*```/g, '') // Remove code fences
        .replace(/^[^{]*/, '') // Remove text before first {
        .replace(/[^}]*$/, '') // Remove text after last }
        .trim();
      
      try {
        parsedContent = JSON.parse(cleanedContent);
        console.log('Successfully parsed cleaned JSON');
      } catch (cleanError) {
        // Final attempt: extract largest JSON block
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedContent = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from response');
          } catch (extractError) {
            console.error('All JSON parsing attempts failed');
            return new Response(
              JSON.stringify({ 
                error: 'Invalid JSON response from OpenAI',
                rawContent: content.substring(0, 500)
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'No JSON found in response',
              rawContent: content.substring(0, 500)
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }

    // Return the parsed response with metadata
    const result = {
      ...parsedContent,
      _apiMeta: {
        modelUsed: data.model,
        finishReason,
        usage: data.usage
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Chat JSON function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
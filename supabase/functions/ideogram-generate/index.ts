import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

// Universal Text Placement Templates with STRICT Size Constraints (inline for edge function) 
const universalTextPlacementTemplates = [
  {
    id: "memeTopBottom",
    label: "Meme Top/Bottom", 
    description: "Bold captions in clear horizontal bands at top and/or bottom",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Top/bottom band - ABSOLUTE MAXIMUM: Caption must occupy ≤25% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible. MANDATORY: Scale font DOWN to fit constraint.
SCENE: [SCENE_DESCRIPTION]
SIZE ENFORCEMENT: VIOLATION = IMMEDIATE REJECTION. Shrink font to stay inside band. NON-NEGOTIABLE HEIGHT LIMIT.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER stretch text to fill canvas, NEVER exceed 25% height, REJECT if oversized`
  },
  {
    id: "negativeSpace",
    label: "Negative Space",
    description: "Text integrated seamlessly into natural empty areas", 
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Natural empty margin space - ABSOLUTE MAXIMUM: ≤20% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible. MANDATORY: Shrink to fit inside margin.
SCENE: [SCENE_DESCRIPTION]
SIZE ENFORCEMENT: VIOLATION = IMMEDIATE REJECTION. Size limit is NON-NEGOTIABLE.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER stretch text to fill space, NEVER exceed 20% height, REJECT if oversized`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Clean banner across bottom third - ABSOLUTE MAXIMUM: ≤20% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible. MANDATORY: Use smallest readable font if needed.
SCENE: [SCENE_DESCRIPTION]
SIZE ENFORCEMENT: VIOLATION = IMMEDIATE REJECTION. Font size must respect height limit. NON-NEGOTIABLE.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER stretch text to fill banner, NEVER exceed 20% height, REJECT if oversized`
  },
  {
    id: "subtleCaption", 
    label: "Subtle Caption",
    description: "Minimal caption overlay, unobtrusive but legible",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Small, unobtrusive - ABSOLUTE MAXIMUM: ≤10% of image height, but fully legible.
STYLE: Modern sans-serif, bold, high contrast, fully legible. MANDATORY: Minimize size while maintaining readability.
SCENE: [SCENE_DESCRIPTION]
SIZE ENFORCEMENT: VIOLATION = IMMEDIATE REJECTION. Use smallest readable font. NON-NEGOTIABLE 10% LIMIT.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER exceed 10% height, keep minimal but readable, REJECT if oversized`
  }
];

// Action binding system for visual-caption matching
const ACTION_LEXICON = {
  clumsy: {
    required: ["fumble", "trip", "stumble", "miss", "bobble", "awkward", "loses grip", "drops"],
    forbidden: ["dunk", "posterize", "swish", "soar", "glide", "slam", "nothing but net", "perfect", "score"]
  },
  bad_performance: {
    required: ["airball", "brick", "whiff", "shank", "fails", "misses", "botches"],
    forbidden: ["success", "wins", "victory", "champion", "perfect"]
  },
  timing_issues: {
    required: ["too early", "too late", "before", "after", "wrong time"],
    forbidden: ["perfect timing", "right moment", "exactly when"]
  }
};

// Extract action requirements from caption
function bindCaptionActions(caption: string): { required: string[], forbidden: string[] } {
  const text = caption.toLowerCase();
  const required: string[] = [];
  const forbidden: string[] = [];
  
  // Detect clumsy/awkward performance
  if (/clumsy|fumble|awkward|needs patience|drops|loses|trips|stumble/i.test(text)) {
    required.push(...ACTION_LEXICON.clumsy.required);
    forbidden.push(...ACTION_LEXICON.clumsy.forbidden);
  }
  
  // Detect bad performance indicators  
  if (/bad|terrible|awful|fails|misses|can't|unable|struggles/i.test(text)) {
    required.push(...ACTION_LEXICON.bad_performance.required);
    forbidden.push(...ACTION_LEXICON.bad_performance.forbidden);
  }
  
  // Detect timing-based actions
  if (/before|after|too early|too late|wrong time|premature/i.test(text)) {
    required.push(...ACTION_LEXICON.timing_issues.required);  
    forbidden.push(...ACTION_LEXICON.timing_issues.forbidden);
  }
  
  return {
    required: [...new Set(required)],
    forbidden: [...new Set(forbidden)]
  };
}

// Build size-aware prompt with text, scene, and action binding
function buildSizeAwareTextPrompt(templateId: string, finalText: string, sceneDescription: string, strengthLevel: number = 1) {
  const template = universalTextPlacementTemplates.find(t => t.id === templateId);
  
  if (!template) {
    // Default to memeTopBottom if template not found
    const defaultTemplate = universalTextPlacementTemplates[0];
    const positivePrompt = defaultTemplate.positivePrompt
      .replace('[FINAL_TEXT]', finalText)
      .replace('[SCENE_DESCRIPTION]', sceneDescription);
    return {
      positivePrompt,
      negativePrompt: defaultTemplate.negativePrompt
    };
  }
  
  // Get action binding for this caption
  const actionBinding = bindCaptionActions(finalText);
  
  let basePrompt = template.positivePrompt;
  let baseNegative = template.negativePrompt;
  
  // Add action requirements to scene description
  let enhancedScene = sceneDescription;
  if (actionBinding.required.length > 0) {
    enhancedScene += ` REQUIRED ACTIONS: Show ${actionBinding.required.slice(0, 3).join(' OR ')} - do NOT show successful actions.`;
  }
  if (actionBinding.forbidden.length > 0) {
    enhancedScene += ` FORBIDDEN: Never show ${actionBinding.forbidden.slice(0, 3).join(', ')}.`;
  }
  
  // Progressive size constraint strengthening
  if (strengthLevel >= 2) {
    basePrompt = basePrompt.replace('ABSOLUTE MAXIMUM:', 'CRITICAL SIZE VIOLATION ALERT:');
    baseNegative += ', font too large, oversized text';
  }
  
  if (strengthLevel >= 3) {
    basePrompt = basePrompt + ' EMERGENCY SIZE REDUCTION: Use smallest readable font. Scale down aggressively.';
    baseNegative += ', size violation detected, text overflow';
  }
  
  const positivePrompt = basePrompt
    .replace('[FINAL_TEXT]', finalText)
    .replace('[SCENE_DESCRIPTION]', enhancedScene);
    
  return {
    positivePrompt,
    negativePrompt: baseNegative
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    console.log('Starting ideogram generation request...');
    console.log('Environment check - SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'SET' : 'MISSING');
    console.log('Environment check - SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'MISSING');
    console.log('Environment check - IDEOGRAM_API_KEY:', Deno.env.get('IDEOGRAM_API_KEY') ? 'SET' : 'MISSING');
    
    // Create service role client for database/storage operations
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to get user from auth (if JWT provided)
    let userId = null;
    let guestId = null;
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (!userError && user) {
        userId = user.id;
        console.log('Authenticated user:', userId);
      }
    }
    
    // If no authenticated user, generate a guest ID
    if (!userId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Using guest ID:', guestId);
    }

    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));

    const { prompt, aspect_ratio, style_type, model, negative_prompt, layout_token, final_text, scene_description, strength_level } = body;

    if (!prompt) {
      console.error('Missing prompt in request');
      return new Response('Missing prompt', { status: 400, headers: corsHeaders });
    }

    console.log('Parsed request params:', { prompt, aspect_ratio, style_type, model, negative_prompt, layout_token, final_text, scene_description, strength_level });

    // SIZE-AWARE PROMPT ENHANCEMENT: If we have layout and text info, enhance the prompt
    let enhancedPrompt = prompt;
    let enhancedNegativePrompt = negative_prompt || '';
    
    if (layout_token && final_text && scene_description) {
      console.log('🎯 Enhancing prompt with size-aware template...');
      const sizeAwarePrompts = buildSizeAwareTextPrompt(
        layout_token, 
        final_text, 
        scene_description, 
        strength_level || 1
      );
      
      // Replace the basic prompt with the size-aware enhanced version
      enhancedPrompt = sizeAwarePrompts.positivePrompt;
      enhancedNegativePrompt = sizeAwarePrompts.negativePrompt;
      
      console.log('📏 Size-aware prompt generated:', {
        layout: layout_token,
        strength: strength_level || 1,
        promptLength: enhancedPrompt.length,
        negativePromptLength: enhancedNegativePrompt.length
      });
    }

    // Insert job record
    console.log('Creating job record with:', { userId, guestId, prompt: enhancedPrompt, negative_prompt: enhancedNegativePrompt, style_type, aspect_ratio });
    const { data: job, error: jobError } = await serviceRoleClient
      .from('gen_jobs')
      .insert({
        user_id: userId,
        guest_id: guestId,
        prompt: enhancedPrompt,
        negative_prompt: enhancedNegativePrompt || '',
        style: style_type || 'DESIGN',
        aspect: aspect_ratio || 'ASPECT_1_1',
        status: 'running'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error details:', JSON.stringify(jobError, null, 2));
      return new Response(JSON.stringify({ error: 'Failed to create job', details: jobError }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Created job successfully:', job.id);

    try {
      // Call Ideogram API
      const ideogramApiKey = Deno.env.get('IDEOGRAM_API_KEY');
      if (!ideogramApiKey) {
        throw new Error('Ideogram API key not configured');
      }

      console.log('Calling Ideogram V3 API...');
      
      // Map aspect_ratio to V3 resolution format - V3 uses enumerated values
      const resolutionMap: { [key: string]: string } = {
        'ASPECT_1_1': 'RESOLUTION_1024_1024',
        'ASPECT_10_16': 'RESOLUTION_832_1216', 
        'ASPECT_16_10': 'RESOLUTION_1216_832',
        'ASPECT_9_16': 'RESOLUTION_832_1216', 
        'ASPECT_16_9': 'RESOLUTION_1216_832'  
      };
      
      const resolution = resolutionMap[aspect_ratio] || 'RESOLUTION_1024_1024';
      const seed = Math.floor(Math.random() * 1000000);
      
      // V3 API expects JSON with image_request wrapper
      // Handle negative prompt separately if provided, otherwise combine with positive prompt
      const finalPrompt = enhancedNegativePrompt && enhancedNegativePrompt.trim() 
        ? `${enhancedPrompt}. Avoid: ${enhancedNegativePrompt}` 
        : enhancedPrompt;
      
      const requestPayload = {
        image_request: {
          prompt: finalPrompt,
          resolution: resolution,
          seed: seed
        }
      };
      
      console.log('V3 API payload:', JSON.stringify(requestPayload, null, 2));
      
      // Use correct V3 endpoint with JSON payload
      const ideogramResponse = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Api-Key': ideogramApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!ideogramResponse.ok) {
        const errorText = await ideogramResponse.text();
        console.error('Ideogram V3 API error:', errorText);
        console.error('Response status:', ideogramResponse.status);
        console.error('Response headers:', Object.fromEntries(ideogramResponse.headers.entries()));
        
        // Log moderation events for analysis
        if (ideogramResponse.status === 422) {
          console.log('MODERATION_EVENT:', {
            timestamp: new Date().toISOString(),
            prompt: finalPrompt,
            user_id: userId,
            guest_id: guestId,
            error: errorText
          });
        }
        
        // Try fallback to square format if it's a resolution issue
        if (ideogramResponse.status === 400 && resolution !== '1024x1024') {
          console.log('Retrying with square format due to resolution error...');
          
          const fallbackPayload = {
            image_request: {
              prompt: finalPrompt,
              resolution: 'RESOLUTION_1024_1024',
              seed: seed
            }
          };
          
          const fallbackResponse = await fetch('https://api.ideogram.ai/generate', {
            method: 'POST',
            headers: {
              'Api-Key': ideogramApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(fallbackPayload),
          });
          
          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            console.error('Fallback also failed:', fallbackErrorText);
            
            // Parse error message for frontend
            let errorMessage = `Ideogram API error: ${ideogramResponse.status}`;
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.message) errorMessage = errorData.message;
              if (errorData.error) errorMessage = errorData.error;
            } catch {
              errorMessage = `${errorMessage} - ${errorText}`;
            }
            
            throw new Error(errorMessage);
          }
          
          // Use the fallback response
          const fallbackData = await fallbackResponse.json();
          console.log('Fallback successful:', fallbackData);
          
          if (!fallbackData.data || fallbackData.data.length === 0) {
            throw new Error('No images generated by Ideogram V3 (fallback)');
          }
          
          const fallbackImageUrl = fallbackData.data[0].url;
          return await processImageResponse(fallbackImageUrl, job, serviceRoleClient, userId, guestId);
        }
        
        // Parse error message for frontend
        let errorMessage = `Ideogram API error: ${ideogramResponse.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) errorMessage = errorData.message;
          if (errorData.error) errorMessage = errorData.error;
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const ideogramData = await ideogramResponse.json();
      console.log('Ideogram V3 response:', ideogramData);

      // Parse V3 response format
      if (!ideogramData.data || ideogramData.data.length === 0) {
        throw new Error('No images generated by Ideogram V3');
      }

      const imageUrl = ideogramData.data[0].url;
      return await processImageResponse(imageUrl, job, serviceRoleClient, userId, guestId);

    } catch (error) {
      console.error('Generation error:', error);
      
      // Update job with error
      await serviceRoleClient
        .from('gen_jobs')
        .update({
          status: 'error',
          error: error.message
        })
        .eq('id', job.id);

      return new Response(JSON.stringify({
        job_id: job.id,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Request processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to process image response
async function processImageResponse(imageUrl: string, job: any, serviceRoleClient: any, userId: string | null, guestId: string | null) {
  // Download the image
  console.log('Downloading image from:', imageUrl);
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();
  const imageBytes = new Uint8Array(imageBuffer);

  // Upload to Supabase Storage
  const storagePath = `${userId || guestId}/${job.id}.png`;
  console.log('Uploading to storage path:', storagePath);
  
  const { error: uploadError } = await serviceRoleClient.storage
    .from('gen-images')
    .upload(storagePath, imageBytes, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Create signed URL
  const { data: signedUrlData, error: signedUrlError } = await serviceRoleClient.storage
    .from('gen-images')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (signedUrlError) {
    console.error('Signed URL error:', signedUrlError);
    throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
  }

  // Update job with success
  const { error: updateError } = await serviceRoleClient
    .from('gen_jobs')
    .update({
      status: 'done',
      image_url: signedUrlData.signedUrl
    })
    .eq('id', job.id);

  if (updateError) {
    console.error('Job update error:', updateError);
  }

  console.log('Generation successful, returning signed URL');
  return new Response(JSON.stringify({
    job_id: job.id,
    image_url: signedUrlData.signedUrl
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ImagenRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  style_type?: string;
}

interface ImagenResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
}

async function generateImageWithGemini(request: ImagenRequest): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Map aspect ratio to Google Imagen format
  const aspectRatioMap: { [key: string]: string } = {
    'ASPECT_1_1': '1:1',
    'ASPECT_16_9': '16:9',
    'ASPECT_9_16': '9:16',
    'ASPECT_10_16': '10:16',
    'ASPECT_16_10': '16:10'
  };
  
  const aspectRatio = aspectRatioMap[request.aspect_ratio || 'ASPECT_1_1'] || '1:1';
  
  // Build detailed prompt
  let finalPrompt = request.prompt;
  if (request.style_type) {
    const styleMap: { [key: string]: string } = {
      'REALISTIC': 'photorealistic style',
      'DESIGN': 'modern graphic design style',
      'RENDER_3D': '3D render style',
      'ANIME': 'anime illustration style'
    };
    const stylePrefix = styleMap[request.style_type] || request.style_type.toLowerCase() + ' style';
    finalPrompt = `${stylePrefix}, ${finalPrompt}`;
  }
  
  if (request.negative_prompt) {
    finalPrompt += `. Avoid: ${request.negative_prompt}`;
  }

  console.log('Generating image with Google Generative Language Images API:', { 
    prompt: finalPrompt.substring(0, 100) + '...', 
    aspectRatio,
    style: request.style_type
  });

  // Use correct Google Images API endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/images:generate?key=${GEMINI_API_KEY}`;
  
  const payload = {
    prompt: finalPrompt,
    aspectRatio: aspectRatio,
    sampleCount: 1
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log('Google API response status:', response.status);
  console.log('Google API response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    console.error('Google Images API error:', response.status, responseText);
    
    // Detailed error handling for different status codes
    let errorMessage = `Image generation failed: ${response.status}`;
    let errorType = 'transient';
    
    try {
      const errorData = JSON.parse(responseText);
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
      }
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
    }
    
    // Categorize errors for better handling
    if (response.status === 401 || response.status === 403) {
      errorType = 'auth';
      errorMessage = 'Gemini API key is invalid or Google Generative Language API is not enabled. Please check your credentials and enable the API.';
    } else if (response.status === 404) {
      errorType = 'config';
      errorMessage = 'Gemini image generation model not found. The Generative Language API may not be available in your region or project.';
    } else if (response.status === 429) {
      errorType = 'quota';
      errorMessage = 'Gemini API quota exceeded. Please check your usage limits.';
    } else if (response.status >= 500) {
      errorType = 'server';
      errorMessage = 'Gemini API server error. Please try again.';
    }
    
    const error = new Error(errorMessage);
    (error as any).type = errorType;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse response JSON:', parseError);
    throw new Error('Invalid response from Google Generative Language API');
  }
  
  console.log('Image generation successful with Google Images API');
  
  if (!data.generatedImages || data.generatedImages.length === 0) {
    throw new Error('No images returned from Google Images API');
  }

  return data.generatedImages[0].bytesBase64Encoded;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  let jobId: string | null = null;
  
  try {
    // Create Supabase service role client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from auth header or generate guest ID
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let guestId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }
    
    if (!userId) {
      guestId = crypto.randomUUID();
    }

    // Parse request body
    const requestBody: ImagenRequest = await req.json();
    
    if (!requestBody.prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Imagen generation request:', { 
      userId, 
      guestId, 
      prompt: requestBody.prompt?.substring(0, 100) + '...',
      style: requestBody.style_type,
      aspect: requestBody.aspect_ratio
    });

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('gen_jobs')
      .insert({
        user_id: userId,
        guest_id: guestId,
        prompt: requestBody.prompt,
        negative_prompt: requestBody.negative_prompt || '',
        style: requestBody.style_type || 'REALISTIC',
        aspect: requestBody.aspect_ratio || 'ASPECT_1_1',
        status: 'running'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw new Error('Failed to create job record');
    }

    jobId = job.id;
    console.log('Created job:', jobId);

    // Generate image with Gemini/OpenAI integration
    const base64Image = await generateImageWithGemini(requestBody);
    
    // Upload image to storage
    const imageBytes = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    const fileName = `${userId || guestId}/${jobId}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('gen-images')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload image to storage');
    }

    // Create signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('gen-images')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      throw new Error('Failed to create signed URL');
    }

    // Update job with success
    await supabase
      .from('gen_jobs')
      .update({
        status: 'done',
        image_url: signedUrlData.signedUrl
      })
      .eq('id', jobId);

    console.log('Job completed successfully:', jobId);

    return new Response(
      JSON.stringify({
        job_id: jobId,
        image_url: signedUrlData.signedUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in imagen-generate function:', error);
    
    // Update job with error if we have a job ID
    if (jobId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from('gen_jobs')
          .update({
            status: 'error',
            error: error.message
          })
          .eq('id', jobId);
      } catch (updateError) {
        console.error('Failed to update job with error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
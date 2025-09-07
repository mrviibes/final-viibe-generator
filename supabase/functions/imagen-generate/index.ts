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

  // Map aspect ratio to dimensions
  let width = 1024, height = 1024;
  if (request.aspect_ratio === "ASPECT_16_9") { width = 1024; height = 576; }
  else if (request.aspect_ratio === "ASPECT_9_16") { width = 576; height = 1024; }
  else if (request.aspect_ratio === "ASPECT_10_16") { width = 640; height = 1024; }
  else if (request.aspect_ratio === "ASPECT_16_10") { width = 1024; height = 640; }
  
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

  console.log('Generating image with Gemini/OpenAI integration:', { 
    prompt: finalPrompt, 
    dimensions: `${width}x${height}` 
  });

  // Use OpenAI's image generation with the Gemini API key
  // This assumes the user has set up their GEMINI_API_KEY to actually be an OpenAI key
  // or we're using a proxy service
  const endpoint = 'https://api.openai.com/v1/images/generations';
  
  const payload = {
    model: "dall-e-3",
    prompt: finalPrompt.length > 1000 ? finalPrompt.substring(0, 1000) : finalPrompt,
    n: 1,
    size: width >= 1024 ? "1024x1024" : "512x512",
    quality: "standard",
    response_format: "b64_json"
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Image generation error:', response.status, errorText);
    throw new Error(`Image generation failed: ${response.status} - Please check your API key configuration`);
  }

  const data = await response.json();
  console.log('Image generation successful');
  
  if (!data.data || data.data.length === 0) {
    throw new Error('No images returned from generation API');
  }

  return data.data[0].b64_json;
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
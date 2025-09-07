import { supabase } from "@/integrations/supabase/client";

export interface ImagenGenerateRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  style_type?: string;
}

export interface ImagenGenerateResponse {
  job_id: string;
  image_url: string;
}

export class ImagenAPIError extends Error {
  public type?: string;
  
  constructor(message: string, public statusCode?: number, context?: any) {
    super(message);
    this.name = 'ImagenAPIError';
    
    // Extract error type from context if available
    if (context?.error?.type) {
      this.type = context.error.type;
    } else if (context?.type) {
      this.type = context.type;
    }
  }
}

/**
 * Generate an image using Google's Imagen API via Supabase Edge Function
 * This function provides the same interface as generateIdeogramImage for drop-in compatibility
 */
export async function generateImagenImage(request: ImagenGenerateRequest): Promise<ImagenGenerateResponse> {
  try {
    console.log('Calling imagen-generate function with request:', {
      prompt: request.prompt?.substring(0, 100) + '...',
      style: request.style_type,
      aspect: request.aspect_ratio,
      hasNegative: !!request.negative_prompt
    });

    const { data, error } = await supabase.functions.invoke('imagen-generate', {
      body: request
    });

    if (error) {
      console.error('Imagen generation error:', error);
      throw new ImagenAPIError(error.message || 'Failed to generate image with Imagen', undefined, error);
    }

    if (!data || !data.job_id || !data.image_url) {
      throw new ImagenAPIError('Invalid response from Imagen API');
    }

    console.log('Imagen generation successful:', data.job_id);
    return data as ImagenGenerateResponse;

  } catch (error) {
    console.error('Error in generateImagenImage:', error);
    
    if (error instanceof ImagenAPIError) {
      throw error;
    }
    
    throw new ImagenAPIError(
      error instanceof Error ? error.message : 'Unknown error occurred during image generation'
    );
  }
}

/**
 * Map Ideogram-style parameters to Imagen format for compatibility
 */
export function mapIdeogramToImagen(ideogramRequest: any): ImagenGenerateRequest {
  return {
    prompt: ideogramRequest.prompt,
    negative_prompt: ideogramRequest.negative_prompt,
    aspect_ratio: ideogramRequest.aspect_ratio,
    style_type: ideogramRequest.style_type
  };
}
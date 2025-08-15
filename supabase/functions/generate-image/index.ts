import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getImageSize(aspectRatio: string): string {
  switch (aspectRatio) {
    case '1:1':
      return '1024x1024'
    case '16:9':
      return '1792x1024'
    case '9:16':
      return '1024x1792'
    case '4:3':
      return '1024x768'
    case 'landscape':
      return '1792x1024'
    case 'portrait':
      return '1024x1792'
    case 'square':
      return '1024x1024'
    default:
      return '1024x1024'
  }
}

interface Provider {
  name: string;
  apiKey: string | null;
  baseUrl: string;
  models: string[];
  formatRequest: (prompt: string, model: string, numImages: number, size: string, image?: string) => any;
  parseResponse: (data: any) => string[];
}

async function tryProvider(provider: Provider, prompt: string, model: string, numImages: number, size: string, image?: string): Promise<string[]> {
  if (!provider.apiKey) {
    throw new Error(`${provider.name} API key not configured`);
  }

  console.log(`Trying ${provider.name} with model: ${model}`);
  
  const requestBody = provider.formatRequest(prompt, model, numImages, size, image);
  console.log(`${provider.name} request:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${provider.name} API error (${response.status}):`, errorText);
    throw new Error(`${provider.name} API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`${provider.name} response:`, data);
  
  return provider.parseResponse(data);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, model, aspectRatio, numImages, image } = await req.json()
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Generating ${numImages || 1} image(s) with prompt: "${prompt}"`)
    console.log(`Using model: ${model || 'img3'}`)

    const size = getImageSize(aspectRatio)
    const selectedModel = model || 'img3'

    // Define all providers with their configurations
    const providers: Provider[] = [
      {
        name: 'Infip',
        apiKey: Deno.env.get('INFIP_API_KEY'),
        baseUrl: 'https://api.infip.pro/v1/images/generations',
        models: ['img3', 'img4'],
        formatRequest: (prompt, model, numImages, size, image) => ({
          model,
          prompt,
          num_images: numImages,
          size
        }),
        parseResponse: (data) => {
          if (data.data && data.data.length > 0) {
            return data.data.map((item: any) => item.url);
          }
          throw new Error('No images in response');
        }
      },
      {
        name: 'TypeGPT',
        apiKey: Deno.env.get('TYPEGPT_API_KEY'),
        baseUrl: 'https://fast.typegpt.net/v1/images/generations',
        models: ['black-forest-labs/FLUX.1-kontext-pro'],
        formatRequest: (prompt, model, numImages, size, image) => {
          const request: any = {
            model,
            prompt,
            n: numImages,
            size
          };
          
          // Add image-to-image support for FLUX models
          if (image && (model.includes('FLUX') || model.includes('flux'))) {
            request.image = image;
          }
          
          return request;
        },
        parseResponse: (data) => {
          if (data.data && data.data.length > 0) {
            return data.data.map((item: any) => item.url);
          }
          throw new Error('No images in response');
        }
      },
      {
        name: 'SamuraiAPI',
        apiKey: Deno.env.get('SAMURAIAPI_KEY'),
        baseUrl: 'https://samuraiapi.in/v1/images/generations',
        models: ['provider4-gemini-2.0-flash-exp-image-generation', 'qwen-image', 'TogetherImage/black-forest-labs/FLUX.1-kontext-max'],
        formatRequest: (prompt, model, numImages, size, image) => {
          const request: any = {
            model,
            prompt,
            n: numImages,
            size
          };
          
          // Add image-to-image support for FLUX models
          if (image && (model.includes('FLUX') || model.includes('flux'))) {
            request.image = image;
          }
          
          return request;
        },
        parseResponse: (data) => {
          if (data.data && data.data.length > 0) {
            return data.data.map((item: any) => item.url);
          }
          throw new Error('No images in response');
        }
      }
    ];

    // Find the provider that supports the selected model
    let targetProvider = providers.find(p => p.models.includes(selectedModel));
    
    // If no provider found for the model, use Infip as default
    if (!targetProvider) {
      targetProvider = providers[0]; // Infip
      console.log(`Model ${selectedModel} not found, defaulting to Infip with img3`);
    }

    // Try the target provider first, then fallback to others
    const providersToTry = [targetProvider, ...providers.filter(p => p !== targetProvider)];
    
    for (const provider of providersToTry) {
      if (!provider.apiKey) {
        console.log(`Skipping ${provider.name} - API key not configured`);
        continue;
      }

      try {
        // Use the model if supported by this provider, otherwise use first available model
        const modelToUse = provider.models.includes(selectedModel) ? selectedModel : provider.models[0];
        const images = await tryProvider(provider, prompt, modelToUse, numImages || 1, size, image);
        
        console.log(`Successfully generated ${images.length} image(s) using ${provider.name}`);
        return new Response(
          JSON.stringify({ images, provider: provider.name, model: modelToUse }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (error) {
        console.error(`${provider.name} failed:`, error.message);
        // Continue to next provider
      }
    }

    // If all providers failed
    return new Response(
      JSON.stringify({ 
        error: 'All image generation providers failed',
        details: 'Please try again later'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generate-image function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

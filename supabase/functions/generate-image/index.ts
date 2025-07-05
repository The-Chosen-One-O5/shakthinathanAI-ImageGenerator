import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, model, aspectRatio, numImages } = await req.json()
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const HUGGING_FACE_ACCESS_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN')
    if (!HUGGING_FACE_ACCESS_TOKEN) {
      console.error('HUGGING_FACE_ACCESS_TOKEN not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Hugging Face API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN)

    // Choose model based on user selection
    const modelName = model === "img4" ? 'black-forest-labs/FLUX.1-dev' : 'black-forest-labs/FLUX.1-schnell'
    
    console.log(`Generating ${numImages} image(s) with prompt: "${prompt}"`)
    console.log(`Using model: ${modelName}`)

    const images = []
    
    // Generate the requested number of images
    for (let i = 0; i < numImages; i++) {
      try {
        const image = await hf.textToImage({
          inputs: prompt,
          model: modelName,
        })

        // Convert the blob to a base64 string
        const arrayBuffer = await image.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        images.push(`data:image/png;base64,${base64}`)
        
        console.log(`Generated image ${i + 1}/${numImages}`)
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error)
        // Continue with other images if one fails
      }
    }

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images were generated' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully generated ${images.length} image(s)`)

    return new Response(
      JSON.stringify({ images }),
      { 
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
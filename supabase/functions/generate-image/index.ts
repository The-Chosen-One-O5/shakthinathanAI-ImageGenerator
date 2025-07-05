import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    const INFIP_API_KEY = Deno.env.get('INFIP_API_KEY')
    if (!INFIP_API_KEY) {
      console.error('INFIP_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Infip API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Generating ${numImages || 1} image(s) with prompt: "${prompt}"`)
    console.log(`Using model: ${model || 'default'}`)

    const images = []
    
    // Generate the requested number of images
    for (let i = 0; i < (numImages || 1); i++) {
      try {
        const response = await fetch('https://api.infip.io/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${INFIP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model || 'img3',
            prompt: prompt,
            n: 1,
            size: aspectRatio === 'landscape' ? '1792x1024' : 
                  aspectRatio === 'portrait' ? '1024x1792' : '1024x1024',
            response_format: 'b64_json'
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Infip API error: ${response.status} - ${errorText}`)
          throw new Error(`Infip API error: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.data && data.data.length > 0) {
          // Infip returns b64_json format
          images.push(`data:image/png;base64,${data.data[0].b64_json}`)
          console.log(`Generated image ${i + 1}/${numImages || 1}`)
        } else {
          console.error('No image data received from Infip API')
        }
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

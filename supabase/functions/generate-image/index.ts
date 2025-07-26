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
    console.log(`Using model: ${model || 'img3'}`)

    const requestBody = {
      model: model || 'img3',
      prompt: prompt,
      num_images: numImages || 1,
      size: getImageSize(aspectRatio)
    }
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    try {
      const response = await fetch('https://api.infip.pro/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INFIP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Infip API error (${response.status}):`, errorText)
        throw new Error(`Infip API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('API Response:', data)
      
      if (data.data && data.data.length > 0) {
        const images = data.data.map((item: any) => item.url)
        console.log(`Successfully generated ${images.length} image(s)`)
        return new Response(
          JSON.stringify({ images: images }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        console.error('No images in response:', data)
        return new Response(
          JSON.stringify({ error: 'No images were generated' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } catch (error) {
      console.error('Error generating images:', error.message)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate images',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

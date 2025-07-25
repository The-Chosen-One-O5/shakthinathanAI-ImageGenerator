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
    console.log(`API Key format: ${INFIP_API_KEY.substring(0, 10)}...`)

    const images = []
    
    // Generate the requested number of images
    for (let i = 0; i < (numImages || 1); i++) {
      try {
        console.log(`Attempting to generate image ${i + 1} with size: ${getImageSize(aspectRatio)}`)
        
        // Try different authentication methods
        const requestBody = {
          model: model || 'img3',
          prompt: prompt,
          n: 1,
          size: getImageSize(aspectRatio),
          response_format: 'b64_json'
        }
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2))
        
        // First try with Bearer token
        let response = await fetch('https://api.infip.io/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${INFIP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        // If Bearer fails, try with different auth methods
        if (!response.ok) {
          console.log(`Bearer auth failed (${response.status}), trying direct API key...`)
          
          response = await fetch('https://api.infip.io/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': INFIP_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })
        }

        if (!response.ok) {
          console.log(`Direct auth failed (${response.status}), trying X-API-Key header...`)
          
          response = await fetch('https://api.infip.io/v1/images/generations', {
            method: 'POST',
            headers: {
              'X-API-Key': INFIP_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Infip API error (${response.status}):`, errorText)
          console.error('Response headers:', Object.fromEntries(response.headers.entries()))
          throw new Error(`Infip API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log('API Response structure:', Object.keys(data))
        
        if (data.data && data.data.length > 0) {
          // Infip returns b64_json format
          const imageData = data.data[0]
          console.log('Image data keys:', Object.keys(imageData))
          
          if (imageData.b64_json) {
            images.push(`data:image/png;base64,${imageData.b64_json}`)
            console.log(`Successfully generated image ${i + 1}/${numImages || 1}`)
          } else if (imageData.url) {
            // Some APIs return URL instead of base64
            images.push(imageData.url)
            console.log(`Successfully generated image ${i + 1}/${numImages || 1} (URL format)`)
          } else {
            console.error('No b64_json or url field in image data:', imageData)
          }
        } else {
          console.error('No image data received from Infip API. Full response:', data)
        }
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error.message)
        console.error('Error stack:', error.stack)
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

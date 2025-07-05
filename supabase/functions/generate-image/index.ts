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

    const RUNWARE_API_KEY = Deno.env.get('RUNWARE_API_KEY')
    if (!RUNWARE_API_KEY) {
      console.error('RUNWARE_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convert aspect ratio to width/height
    let width = 1024, height = 1024
    switch (aspectRatio) {
      case '16:9':
        width = 1024
        height = 576
        break
      case '9:16':
        width = 576
        height = 1024
        break
      case '4:3':
        width = 1024
        height = 768
        break
      default:
        width = 1024
        height = 1024
    }

    // Determine the Runware model based on user selection
    let runwareModel = "runware:100@1" // Default FLUX Schnell
    if (model === "img4") {
      runwareModel = "runware:101@1" // FLUX Dev
    }

    console.log(`Generating ${numImages} image(s) with prompt: "${prompt}"`)
    console.log(`Using model: ${runwareModel}, dimensions: ${width}x${height}`)

    // Prepare the request for Runware API
    const requestBody = [
      {
        taskType: "authentication",
        apiKey: RUNWARE_API_KEY
      },
      {
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt: prompt,
        width: width,
        height: height,
        model: runwareModel,
        numberResults: numImages,
        outputFormat: "WEBP",
        CFGScale: 1,
        scheduler: "FlowMatchEulerDiscreteScheduler",
        strength: 0.8,
        steps: 4
      }
    ]

    console.log('Sending request to Runware API:', JSON.stringify(requestBody, null, 2))

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Runware API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `API request failed: ${response.status}`,
          details: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    console.log('Runware API response:', JSON.stringify(data, null, 2))

    if (data.error || data.errors) {
      const errorMessage = data.errorMessage || data.errors?.[0]?.message || 'Unknown error from API'
      console.error('Runware API error response:', errorMessage)
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract image URLs from the response
    const images = data.data
      ?.filter((item: any) => item.taskType === 'imageInference' && item.imageURL)
      ?.map((item: any) => item.imageURL) || []

    if (images.length === 0) {
      console.error('No images generated in response:', data)
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
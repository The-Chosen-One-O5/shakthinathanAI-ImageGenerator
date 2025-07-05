# Shakthinathan AI Image Generator

This project is a small React + Vite application that integrates with Supabase and the Infip image generation API.

## Installation

Install dependencies with your preferred package manager:

```bash
npm install    # or `bun install`
```

## Development

Start the Vite dev server on port 8080:

```bash
npm run dev    # or `bun run vite dev`
```

## Environment variables

Create `supabase/.env` and add your Infip API key:

```bash
INFIP_API_KEY=<your-infip-api-key>
```

Supabase keys are stored in `src/integrations/supabase/client.ts`. Edit that file if you need to use a different Supabase project or anon key.

## Supabase functions

Install the Supabase CLI and run the function locally with:

```bash
supabase functions serve generate-image
```

Deploy the function to your Supabase project:

```bash
supabase functions deploy generate-image
```


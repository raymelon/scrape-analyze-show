# Local Instagram Comment Scraper

This script provides a free alternative to the Supabase Edge Function for users without Apify API access. It uses Apify CLI locally to scrape Instagram comments and analyze them with OpenAI.

## Prerequisites

- Node.js (v16 or higher)
- Apify CLI installed globally: `npm install -g apify-cli`
- Apify account (free tier works for local development)

## Setup

1. Install dependencies:

   ```bash
   npm install -g apify-cli # if apify-cli is not installed yet
   cd scripts
   npm install
   ```

2. Copy `env.local` to `.env` and fill in your actual values:

   ```bash
   cp env.local .env
   ```

   Then edit `.env` with your credentials:

   ```
   APIFY_TOKEN=your_apify_token
   OPENAI_API_KEY=your_openai_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ```

3. Authenticate Apify CLI (optional, token is used):
   ```bash
   apify login -t your_apify_token
   ```

## Usage

```bash
node local-scraper.js <instagram_post_url> [max_items]
```

Example:

```bash
node local-scraper.js https://www.instagram.com/p/ABC123/ 20
```

## How it works

1. Runs the `apidojo/instagram-comments-scraper` actor via Apify CLI
2. Waits for completion and fetches the dataset
3. Analyzes each comment using OpenAI GPT-4o-mini
4. Stores results in Supabase (same tables as the Edge Function)

## Notes

- This runs on your local machine, so it's free but requires manual execution
- For web app integration, results are stored in Supabase and can be viewed in the UI
- The script handles errors gracefully and won't proceed with analysis if scraping fails

#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Load environment variables
require('dotenv').config();

const ANALYSIS_PROMPT = `You are an expert text analyst. Analyze the following Instagram comment and return a structured JSON response with these exact fields:

{
  "sentiment": "positive" | "negative" | "neutral",
  "summary": "A brief 1-2 sentence summary of the comment",
  "keywords": ["array", "of", "key", "terms"],
  "category": "The primary category (e.g., product_feedback, question, complaint, praise, general_comment)",
  "confidence_score": 0.0-1.0 (your confidence in this analysis)
}

Comment to analyze: {TEXT_TO_ANALYZE}

Return ONLY the JSON object, no additional text.`;

async function main() {
  // Make main async for polling
  const postUrl = process.argv[2];
  const maxItems = parseInt(process.argv[3]) || 10;

  if (!postUrl) {
    console.error('Usage: node local-scraper.js <postUrl> [maxItems]');
    process.exit(1);
  }

  // Check required env vars
  const apifyToken = process.env.APIFY_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apifyToken || !openaiKey || !supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables. Copy env.local to .env and fill in your values.');
    console.error('Required: APIFY_TOKEN, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log('Starting Apify actor run...');

  try {
    // Run Apify actor via CLI
    const inputJson = JSON.stringify({
      startUrls: [postUrl],
      maxItems
    }, null, 2);

    // Write input to temp file for reliable parsing
    const tempFile = path.join(__dirname, 'temp-input.json');
    fs.writeFileSync(tempFile, inputJson);

    const runCommand = `apify actors call apidojo/instagram-comments-scraper -f "${tempFile}" --json`;
    console.log('Running: apify actors call apidojo/instagram-comments-scraper -f [TEMP_FILE] --json');

    const runOutput = execSync(runCommand, { encoding: 'utf8' });
    const runResult = JSON.parse(runOutput);

    // Clean up temp file
    fs.unlinkSync(tempFile);

    if (!runResult || !runResult.id) {
      throw new Error('Failed to get run ID from actor call');
    }

    const runId = runResult.id;
    console.log('Run ID:', runId);

    // Poll for completion
    let status = 'RUNNING';
    const maxPolls = 60; // 2 minutes max
    let polls = 0;

    while (status === 'RUNNING' && polls < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusCommand = `apify runs info ${runId} --json`;
      const statusOutput = execSync(statusCommand, { encoding: 'utf8' });
      const statusResult = JSON.parse(statusOutput);
      status = statusResult.status;
      polls++;
      console.log(`Run status: ${status} (poll ${polls}/${maxPolls})`);
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Actor run did not succeed. Status: ${status}`);
    }

    // Fetch dataset items
    const datasetId = runResult.defaultDatasetId;
    const datasetCommand = `apify datasets get-items ${datasetId}`;
    console.log('Fetching dataset...');

    const datasetOutput = execSync(datasetCommand, { encoding: 'utf8' });
    const comments = JSON.parse(datasetOutput);

    console.log(`Fetched ${comments.length} comments`);

    let processedCount = 0;

    // Process each comment
    for (const comment of comments) {
      if (!comment.message) continue;

      try {
        // Insert raw comment
        const { data: insertedComment, error: insertError } = await supabase
          .from("instagram_comments")
          .insert({
            source: postUrl,
            content: comment.message,
            created_at: comment.createdAt || new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          continue;
        }

        console.log(`Analyzing comment ${insertedComment.id}...`);

        // Call OpenAI for analysis
        const prompt = ANALYSIS_PROMPT.replace(
          "{TEXT_TO_ANALYZE}",
          comment.message
        );

        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [
            {
              role: "system",
              content: "You are a professional text analyst. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 1,
          max_completion_tokens: 500,
        });

        const analysisText = completion.choices[0]?.message?.content;
        console.log("Raw OpenAI response:", JSON.stringify(analysisText));  // Debug log

        if (!analysisText || analysisText.trim() === '') {
          console.error("OpenAI response is empty or undefined");
          continue;
        }

        // Parse JSON response
        let analysis;
        try {
          analysis = JSON.parse(analysisText);
        } catch (parseError) {
          console.error("JSON parse error:", parseError.message);
          console.error("Response content:", analysisText);
          continue;
        }

        // Update comment with analysis
        const { error: updateError } = await supabase
          .from("instagram_comments")
          .update({
            analysis,
            analyzed_at: new Date().toISOString(),
          })
          .eq("id", insertedComment.id);

        if (updateError) {
          console.error("Update error:", updateError);
          continue;
        }

        processedCount++;
        console.log(`Successfully analyzed comment ${insertedComment.id}`);
      } catch (commentError) {
        console.error("Error processing comment:", commentError);
      }
    }

    console.log(`Pipeline complete. Processed ${processedCount} comments.`);
  } catch (error) {
    // Clean up temp file if it exists
    const tempFile = path.join(__dirname, 'temp-input.json');
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    // Mask sensitive information in error messages
    let errorMsg = error.message;
    if (errorMsg.includes(apifyToken)) {
      errorMsg = errorMsg.replace(apifyToken, '[MASKED_TOKEN]');
    }
    console.error('Pipeline error:', errorMsg);
    process.exit(1);
  }
}

main();
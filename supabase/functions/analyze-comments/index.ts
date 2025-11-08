import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { ApifyComment, AnalysisResult } from "../../src/types/instagram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};



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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postUrl, maxItems = 10 } = await req.json();

    if (!postUrl) {
      throw new Error("postUrl is required");
    }

    // Initialize clients
    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not configured");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting Apify actor run...");

    // Run Apify actor
    const actorRunResponse = await fetch(
      "https://api.apify.com/v2/acts/apidojo~instagram-comments-scraper/runs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APIFY_TOKEN}`,
        },
        body: JSON.stringify({
          startUrls: [{ url: postUrl }],
          maxItems,
        }),
      }
    );

    if (!actorRunResponse.ok) {
      const errorText = await actorRunResponse.text();
      console.error("Apify actor run failed:", errorText);
      throw new Error(`Apify actor run failed: ${actorRunResponse.statusText}`);
    }

    const runData = await actorRunResponse.json();
    const runId = runData.data.id;
    console.log("Actor run started:", runId);

    // Poll for completion
    let runStatus = "RUNNING";
    let attempts = 0;
    const maxAttempts = 60;

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}`,
        {
          headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
        }
      );

      const statusData = await statusResponse.json();
      runStatus = statusData.data.status;
      attempts++;
      console.log(`Run status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (runStatus !== "SUCCEEDED") {
      throw new Error(`Actor run did not succeed. Status: ${runStatus}`);
    }

    // Fetch dataset items
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items`,
      {
        headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
      }
    );

    const comments: ApifyComment[] = await datasetResponse.json();
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

        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-5-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a professional text analyst. Always respond with valid JSON only.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 1,
              max_completion_tokens: 500,
            }),
          }
        );

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error("OpenAI error:", errorText);
          continue;
        }

        const openaiData = await openaiResponse.json();
        const analysisText = openaiData.choices[0]?.message?.content;

        if (!analysisText || analysisText.trim() === '') {
          console.error("OpenAI response is empty or undefined");
          continue;
        }

        // Parse JSON response
        let analysis;
        try {
          analysis = JSON.parse(analysisText);
        } catch (parseError) {
          console.error("Failed to parse OpenAI response:", analysisText);
          continue;
        }

        console.log(`Analyzing comment ${insertedComment.id}...`);

        // Call OpenAI for analysis
        const prompt = ANALYSIS_PROMPT.replace(
          "{TEXT_TO_ANALYZE}",
          comment.text
        );

        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a professional text analyst. Always respond with valid JSON only.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          }
        );

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error("OpenAI error:", errorText);
          continue;
        }

        const openaiData = await openaiResponse.json();
        const analysisText = openaiData.choices[0].message.content;

        // Parse JSON response
        let analysis: AnalysisResult;
        try {
          analysis = JSON.parse(analysisText);
        } catch (parseError) {
          console.error("Failed to parse OpenAI response:", analysisText);
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

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        totalComments: comments.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Pipeline error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        type: "scraping_failed",
        message: "Instagram comment scraping failed. No analysis performed."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

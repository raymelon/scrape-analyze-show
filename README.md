# Instagram Comment Analyzer

A production-ready full-stack application that scrapes Instagram comments, analyzes them with AI, and displays insights in a beautiful dashboard.

https://github.com/user-attachments/assets/faaae61f-9941-45fb-9719-9f25bb64a73e

## Table of Contents

- [Essential](#essential)
  - [Live Demo](#-live-demo)
  - [Overview](#-overview)
  - [Tech Stack](#-tech-stack)
  - [Features](#-features)
  - [Setup Instructions](#-setup-instructions)
  - [Deploying Changes](#-deploying-changes)
  - [Local Workflow Alternative](#-local-workflow-alternative)
  - [Environment Variables](#-environment-variables)
  - [Usage](#-usage)
- [Architecture Deep Dive](#-architecture-deep-dive)
  - [Schema Reasoning](#schema-reasoning)
  - [Workflow Explanation](#workflow-explanation)
  - [Scaling Thought](#scaling-thought)
  - [Failure Handling](#failure-handling)
  - [Bonus (Optional)](#bonus-optional)
- [Links](#-links)
- [License](#-license)
- [Contributing](#-contributing)

## Essential

## 🚀 Live Demo

[View Live Application](https://scrape-analyze-show.vercel.app/)

## 📋 Overview

This project demonstrates a real-world SaaS workflow: **Apify → Supabase → OpenAI → UI**

The application:

1. Uses Apify to scrape Instagram post comments
2. Stores raw data in Supabase PostgreSQL
3. Analyzes each comment with OpenAI's GPT-4o-mini
4. Displays results in a modern React dashboard with system health monitoring

## 🏗️ Tech Stack

- **Frontend**: React, TypeScript, TanStack Query, Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL with Row Level Security
- **APIs**:
  - Apify (apidojo/instagram-comments-scraper)
  - OpenAI (gpt-4o-mini)

## 📊 Features

- **Real-time Comment Analysis**: Scrape and analyze Instagram comments on-demand
- **AI-Powered Insights**: Sentiment detection, keyword extraction, categorization, and confidence scoring
- **System Health Dashboard**: Monitor pipeline performance, success rates, and last analysis timestamp
- **Beautiful UI**: Modern dark theme with gradient accents and responsive design
- **Production Ready**: Error handling, rate limiting awareness, and comprehensive logging

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 22+ installed
- Supabase account
- Apify account with API token
- OpenAI API key

### Local Development

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd scrape-analyze-show
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Supabase**

   - The project is already connected to Supabase (project ID: project-id)
   - Database schema is automatically created via migrations

4. **Set up Edge Function secrets**

   Navigate to your Supabase project dashboard and add these secrets:

   - `APIFY_API_TOKEN`: Your Apify API token
   - `OPENAI_API_KEY`: Your OpenAI API key

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Access the application**
   ```
   http://localhost:8080
   ```

## 🚀 Deploying Changes

### Edge Function Deployment

When you modify the Supabase Edge Function (e.g., `supabase/functions/analyze-comments/index.ts`), deploy it using the Supabase CLI:

1. **Install Supabase CLI** (if not already installed):

   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:

   ```bash
   supabase login
   ```

3. **Link to your project** (if not already linked):

   ```bash
   supabase link --project-ref project-id
   ```

4. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy analyze-comments
   ```

The function will be updated and available for use in production.

## 🏠 Local Workflow Alternative

If you're not on a paid Apify plan and want to run the comment analysis workflow locally without API costs, see the [Local Scraper Setup Guide](scripts/README.md) for instructions on using the CLI-based scraper that runs entirely on your machine.

## 🔑 Environment Variables

Edge Function secrets (configured in Supabase dashboard):

- `APIFY_API_TOKEN` - Apify API authentication token
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o-mini
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## 📖 Usage

1. Click **"Trigger Pipeline"** in the dashboard header
2. Enter an Instagram post URL (e.g., `https://www.instagram.com/p/POSTID/`)
3. Set the maximum number of comments to analyze
4. Click **"Start Analysis"**
5. Wait for the pipeline to complete (usually 30-60 seconds)
6. View analyzed comments in the dashboard with sentiment, keywords, and AI insights

## 📚 Architecture Deep Dive

### Table of Contents

- [Schema Reasoning](#schema-reasoning)
- [Workflow Explanation](#workflow-explanation)
- [Scaling Thought](#scaling-thought)
- [Failure Handling](#failure-handling)
- [Bonus (Optional)](#bonus-optional)

---

### Schema Reasoning

**Why did you design your Supabase schema this way?**

I chose a **single-table design** for simplicity and rapid development:

```sql
CREATE TABLE instagram_comments (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,           -- Instagram post URL
  content TEXT NOT NULL,          -- Comment text
  created_at TIMESTAMPTZ NOT NULL,
  analysis JSONB,                 -- Structured AI analysis
  analyzed_at TIMESTAMPTZ         -- When analysis completed
);
```

**Key decisions:**

1. **Single table vs. separate tables**: For this scale (< 100K records), a single table provides:

   - Simpler queries (no joins needed)
   - Easier maintenance
   - Faster development
   - Adequate performance with proper indexing

2. **JSONB for analysis**: Storing structured AI results in JSONB offers:

   - Flexibility for evolving analysis schema
   - Native PostgreSQL JSONB querying capabilities
   - No schema migrations when adding new analysis fields
   - Efficient storage for nested data

3. **Indexes**: Created on `created_at DESC` and `analyzed_at DESC` for efficient dashboard queries showing recent data first.

4. **Row Level Security**: Enabled with public read access, allowing the dashboard to display data without authentication while maintaining security for write operations (service role only).

**Tradeoffs considered:**

- **Pro**: Simple, fast queries. Easy to understand and maintain.
- **Con**: At scale (>1M records), JSONB queries become slower and normalization would improve performance.
- **Con**: No foreign key constraints for referential integrity (acceptable for this use case).

For this project's scope, simplicity and development speed were prioritized over premature optimization.

---

### Workflow Explanation

**Describe the end-to-end flow from Apify → Supabase → OpenAI → UI in your own words.**

The complete pipeline orchestrates four systems seamlessly:

**1. User Interaction (UI → Edge Function)**

- User enters Instagram post URL in React dashboard
- Frontend calls Supabase Edge Function `analyze-comments` with post URL and maxItems
- Edge Function runs server-side (Deno) to protect API keys

**2. Data Collection (Edge Function → Apify)**

- Edge Function calls Apify API to run `apidojo/instagram-comments-scraper` actor
- Passes Instagram post URL to the actor
- Polls Apify for run completion (every 2 seconds, max 60 attempts)
- Retrieves scraped comments from the actor's dataset

**3. Data Ingestion (Edge Function → Supabase)**

- For each scraped comment:
  - Insert raw data into `instagram_comments` table
  - Extract: source URL, comment text, timestamp
  - Generate UUID as primary key

**4. AI Analysis (Edge Function → OpenAI)**

- For each inserted comment:
  - Format structured prompt with comment text
  - Call OpenAI API (gpt-5-mini) with analysis instructions
  - Request JSON response with: sentiment, summary, keywords, category, confidence_score
  - Parse AI response

**5. Result Storage (Edge Function → Supabase)**

- Update each comment record with:
  - `analysis` (JSONB) - structured AI insights
  - `analyzed_at` (timestamp) - when analysis completed

**6. Display (Supabase → UI)**

- React dashboard queries `instagram_comments` table
- Displays cards with:
  - Original comment text
  - Source link
  - AI analysis breakdown
  - Sentiment badges
  - Confidence visualization
- System Health view aggregates metrics in real-time

**Key characteristics:**

- **Synchronous processing**: Each comment analyzed immediately after insertion
- **Error isolation**: Individual comment failures don't halt the pipeline
- **Server-side orchestration**: All sensitive operations happen in Edge Function
- **Real-time feedback**: Frontend shows loading state and completion toast

---

### Scaling Thought

**If you needed to process 100,000 records per day, what would you change first? Identify likely bottlenecks and outline your approach to handle them.**

At 100K records/day (~70 records/minute), the current synchronous architecture would fail. Here's my scaling strategy:

**Primary Bottlenecks:**

1. **OpenAI API Rate Limits** (CRITICAL)

   - Current: Synchronous calls block pipeline
   - At scale: Would hit rate limits in seconds
   - Impact: Pipeline failures, timeout errors

2. **Edge Function Timeout**

   - Current: Single function handles entire pipeline
   - At scale: Would exceed 60-second Supabase timeout
   - Impact: Incomplete processing, lost data

3. **Database Connections**
   - Current: One connection per function invocation
   - At scale: Connection pool exhaustion
   - Impact: Failed inserts/updates

**Scaling Architecture (Priority Order):**

**Phase 1: Decouple Analysis (Immediate)**

Implement a queue-based architecture:

```
User Trigger
    ↓
Edge Function: "ingest-comments"
    ├─ Call Apify
    ├─ Insert raw comments → instagram_comments
    └─ Queue each comment → Supabase table as job queue
         OR use Supabase Realtime + Postgres NOTIFY

Background Worker: "analyze-worker"
    ├─ Poll job queue (or listen to NOTIFY)
    ├─ Process N jobs in parallel (rate-limit safe)
    ├─ Call OpenAI with retry + exponential backoff
    └─ Update comment with analysis
```

**Benefits:**

- User gets immediate feedback (ingestion success)
- Analysis happens asynchronously
- Failures isolated to individual jobs
- Natural rate limit compliance

**Implementation:**

1. Create `analysis_jobs` table:

   ```sql
   CREATE TABLE analysis_jobs (
     id UUID PRIMARY KEY,
     comment_id UUID REFERENCES instagram_comments,
     status TEXT, -- 'pending', 'processing', 'complete', 'failed'
     attempts INT DEFAULT 0,
     error TEXT,
     created_at TIMESTAMPTZ,
     processed_at TIMESTAMPTZ
   );
   ```

2. New Edge Function: `analyze-worker` (triggered by cron every 30 seconds)
   - Fetches 50 pending jobs
   - Processes in parallel with rate limiting (e.g., 10 req/sec)
   - Updates job status

**Phase 2: Database Optimization**

1. **Normalize schema** (when JSONB queries slow):

   ```sql
   CREATE TABLE comments (
     id UUID PRIMARY KEY,
     source TEXT,
     content TEXT,
     created_at TIMESTAMPTZ
   );

   CREATE TABLE analyses (
     id UUID PRIMARY KEY,
     comment_id UUID REFERENCES comments,
     sentiment TEXT,
     summary TEXT,
     keywords TEXT[],
     category TEXT,
     confidence_score NUMERIC,
     analyzed_at TIMESTAMPTZ
   );

   -- Indexes for efficient queries
   CREATE INDEX idx_comments_source ON comments(source);
   CREATE INDEX idx_analyses_sentiment ON analyses(sentiment);
   CREATE INDEX idx_analyses_analyzed_at ON analyses(analyzed_at DESC);
   ```

2. **Partitioning** by date for time-series data:

   ```sql
   CREATE TABLE comments (
     ...
   ) PARTITION BY RANGE (created_at);

   CREATE TABLE comments_2024_01 PARTITION OF comments
     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
   ```

**Phase 3: API Optimization**

1. **OpenAI Batch API**:

   - Submit up to 50,000 requests in a single batch
   - 50% cost reduction
   - 24-hour processing window acceptable for analytics

2. **Response caching**:

   - Cache identical comment texts (detect with hash)
   - Reduces redundant API calls

3. **Model selection**:
   - Use `gpt-4o-mini` for speed and cost
   - Consider `gpt-4o-nano` for even faster processing if quality acceptable

**Phase 4: Infrastructure**

1. **Connection pooling**:

   ```typescript
   const supabase = createClient(url, key, {
     db: { poolSize: 20 },
   });
   ```

2. **Horizontal scaling**:

   - Deploy multiple worker instances
   - Use Supabase `SELECT ... FOR UPDATE SKIP LOCKED` for job distribution
   - Prevents job duplication

3. **Monitoring**:
   - Add Sentry/LogRocket for error tracking
   - Prometheus metrics for queue depth, processing rate
   - Alert on queue backlog > 1000 jobs

**Phase 5: Cost Optimization**

At 100K/day:

- OpenAI cost: ~$50-100/day (gpt-4o-mini)
- Supabase compute: Upgrade to Pro ($25/mo)
- Apify cost: Depends on actor pricing

**Optimization tactics:**

- Batch OpenAI requests
- Use cheaper models where appropriate
- Implement analysis caching
- Sample data (analyze subset, extrapolate insights)

**Expected Performance:**

- Phase 1: Handle 100K/day
- Phase 2: Handle 1M/day
- Phase 3+: Handle 10M/day

---

### Failure Handling

**How would you handle Apify or OpenAI API failures, rate limits, or malformed responses? Would you retry, queue, or alert — and why?**

I implement a **multi-layered strategy** combining retries, queuing, and alerting based on failure type:

**1. Apify API Failures**

**A. Rate Limits (429 responses)**

- **Strategy**: Exponential backoff + retry
- **Implementation**:

  ```typescript
  async function callApifyWithRetry(url: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(url);

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, i) * 1000;
        await sleep(waitTime);
        continue;
      }

      return response;
    }
    throw new Error("Max retries exceeded");
  }
  ```

- **Why**: Rate limits are temporary; waiting and retrying usually succeeds

**B. Network/Timeout Errors**

- **Strategy**: Retry 3 times with exponential backoff
- **Implementation**: Same as above
- **Why**: Transient network issues resolve quickly

**C. Actor Run Failures (actor crashes, invalid input)**

- **Strategy**: Log error, alert, return failure to user
- **Implementation**:
  ```typescript
  if (runStatus === "FAILED") {
    console.error("Apify actor failed:", runDetails);
    await sendAlert("Apify actor failure", runDetails);
    throw new Error("Actor run failed - check input URL");
  }
  ```
- **Why**: User input errors need immediate feedback; actor bugs need dev attention

**2. OpenAI API Failures**

**A. Rate Limits (429)**

- **Strategy**: Queue-based processing with rate limiter
- **Implementation**:

  ```typescript
  const RATE_LIMIT = 10; // requests per second
  const queue = new PQueue({ concurrency: RATE_LIMIT, interval: 1000 });

  for (const comment of comments) {
    await queue.add(async () => {
      const analysis = await callOpenAI(comment.content);
      await updateComment(comment.id, analysis);
    });
  }
  ```

- **Why**: Prevents overwhelming API; gracefully handles limits

**B. Temporary Errors (5xx, network issues)**

- **Strategy**: Retry with exponential backoff (max 5 attempts)
- **Implementation**:
  ```typescript
  async function callOpenAIWithRetry(prompt: string, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await openai.createChatCompletion({...});
        return response;
      } catch (error) {
        if (error.status >= 500 || error.code === 'ECONNRESET') {
          await sleep(Math.pow(2, i) * 1000);
          continue;
        }
        throw error; // Non-retryable error
      }
    }
  }
  ```
- **Why**: Server errors are usually transient

**C. Malformed Responses (invalid JSON)**

- **Strategy**: Log, mark job as failed, continue processing others
- **Implementation**:
  ```typescript
  try {
    const analysis = JSON.parse(openaiResponse);
    // Validate required fields
    if (!analysis.sentiment || !analysis.summary) {
      throw new Error("Missing required fields");
    }
  } catch (parseError) {
    console.error("Invalid OpenAI response:", openaiResponse);
    await supabase
      .from("analysis_jobs")
      .update({
        status: "failed",
        error: "Malformed AI response",
        attempts: attempts + 1,
      })
      .eq("id", jobId);
    continue; // Don't block other jobs
  }
  ```
- **Why**: One bad response shouldn't halt entire pipeline

**D. Content Policy Violations (400 errors)**

- **Strategy**: Skip, log, no retry
- **Implementation**:
  ```typescript
  if (error.status === 400 && error.message.includes("content_policy")) {
    console.warn("Content policy violation:", comment.id);
    await supabase
      .from("instagram_comments")
      .update({
        analysis: { error: "Content policy violation" },
      })
      .eq("id", comment.id);
    return; // Don't retry
  }
  ```
- **Why**: Policy violations won't resolve with retries

**3. Database Failures**

**Supabase Connection Errors**

- **Strategy**: Retry 3 times, then fail
- **Implementation**: Built-in Supabase client retries
- **Why**: Connection issues are usually brief

**Constraint Violations**

- **Strategy**: Skip duplicate, log, continue
- **Implementation**:
  ```typescript
  const { error } = await supabase.from("comments").insert(data);
  if (error?.code === "23505") {
    // Unique violation
    console.warn("Duplicate comment:", data.id);
    return; // Already processed
  }
  ```

**4. Job Queue System (After Scaling)**

**Dead Letter Queue (DLQ)**

- Jobs that fail 5+ times → move to DLQ
- Manual review or automated cleanup
- Implementation:
  ```typescript
  if (job.attempts > 5) {
    await supabase.from("analysis_jobs_dlq").insert(job);
    await supabase.from("analysis_jobs").delete().eq("id", job.id);
  }
  ```

**5. Monitoring & Alerting**

**Critical Alerts** (Immediate notification):

- Apify actor fails 3+ times in 10 minutes
- OpenAI error rate > 10% for 5 minutes
- Database connection failures
- Queue backlog > 5000 jobs

**Warning Alerts** (Email/Slack):

- DLQ has > 100 jobs
- Analysis success rate < 95%
- Average processing time > 60 seconds

**Implementation**:

```typescript
// Pseudocode
if (errorRate > 0.1) {
  await sendPagerDutyAlert({
    severity: "critical",
    message: "OpenAI error rate exceeds 10%",
    metrics: { errorRate, failedJobs, successRate },
  });
}
```

**Why This Approach?**

1. **Resilience**: Retries handle transient failures
2. **Isolation**: One failure doesn't cascade
3. **Observability**: Logging + alerting enable quick diagnosis
4. **User Experience**: Queue-based processing prevents timeouts
5. **Cost Efficiency**: Retry limits prevent infinite loops

**Trade-offs:**

- **Complexity**: More code to maintain
- **Latency**: Retries increase processing time
- **Cost**: Failed retries still count toward API quotas

For production, this is the right balance between reliability and complexity.

---

### Bonus (Optional)

**Add a "System Health" view or route that shows:**

- **Total number of analyzed records**
- **Timestamp of the last successful OpenAI call**

**Explain how this could be used for uptime monitoring.**

✅ **Implemented in the application!**

The System Health dashboard is accessible via the "System Health" tab and displays:

**Metrics Displayed:**

1. **Total Records**: All comments in the database
2. **Analyzed Count**: Comments successfully processed with AI
3. **Success Rate**: Percentage of comments with complete analysis
4. **Last Analysis Timestamp**: When the most recent analysis completed

**Health Status Indicator:**

- 🟢 **Healthy** (green): Last analysis < 5 minutes ago
- 🟡 **Warning** (yellow): Last analysis 5-30 minutes ago
- 🔴 **Inactive** (red): Last analysis > 30 minutes ago
- ⚪ **No Data** (gray): No analyses exist

**Uptime Monitoring Usage:**

This data enables several monitoring strategies:

**1. Synthetic Monitoring**

```bash
# Curl script to check health endpoint
curl https://your-app.com/api/health

Response:
{
  "status": "healthy",
  "total_records": 1543,
  "analyzed_count": 1540,
  "success_rate": 99.8,
  "last_analysis": "2024-11-07T01:25:33Z",
  "time_since_last": 120 # seconds
}
```

**Alert triggers:**

- `time_since_last > 1800` (30 min) → Pipeline stalled
- `success_rate < 95` → High failure rate
- `analyzed_count == 0` → OpenAI API down
- `total_records == analyzed_count` but no new for 1 hour → Apify not running

**2. Application Monitoring Integration**

With DataDog/New Relic:

```typescript
// Track as custom metrics
datadog.gauge("pipeline.success_rate", successRate);
datadog.gauge("pipeline.seconds_since_last_analysis", timeSinceLast);
datadog.increment("pipeline.records_analyzed");
```

**Alert rules:**

- `pipeline.seconds_since_last_analysis > 1800` for 5 minutes
- `pipeline.success_rate < 95` for 10 minutes

**3. Status Page**

Expose health data on public status page:

```
✅ Analysis Pipeline: Operational
   Last processed: 2 minutes ago
   Success rate (24h): 99.2%

✅ Data Collection: Operational
   Records today: 1,234
```

**4. Slack Alerts**

Webhook integration:

```typescript
if (timeSinceLast > 1800) {
  await fetch(SLACK_WEBHOOK, {
    body: JSON.stringify({
      text: "🚨 Analysis pipeline inactive for 30+ minutes",
      attachments: [
        {
          color: "danger",
          fields: [
            { title: "Last Analysis", value: lastAnalysisTime },
            { title: "Pending", value: pendingCount },
          ],
        },
      ],
    }),
  });
}
```

**5. SLA Tracking**

Calculate uptime from health data:

```typescript
// Query last 24 hours of health checks
const uptime = (healthyChecks / totalChecks) * 100;
// Target: 99.9% uptime (< 1.44 min downtime/day)
```

**Why These Metrics Matter:**

- **Total Records**: Validates data ingestion (Apify working)
- **Analyzed Count**: Confirms AI pipeline functioning (OpenAI working)
- **Success Rate**: Indicates overall system health
- **Last Analysis**: Detects pipeline stalls (most critical metric)

**Real-World Example:**

_Scenario_: At 3:47 AM, OpenAI API goes down.

1. **T+0 min**: Last successful analysis timestamp freezes
2. **T+5 min**: Status indicator turns yellow (warning)
3. **T+10 min**: PagerDuty alert fires
4. **T+15 min**: On-call engineer investigates, finds OpenAI status page reports outage
5. **T+30 min**: Status indicator red, automated Slack message to team
6. **T+45 min**: OpenAI resolves issue, pipeline auto-resumes
7. **T+47 min**: Last analysis timestamp updates, status returns to green

**Monitoring Dashboard Query:**

```sql
SELECT
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE analysis IS NOT NULL) as analyzed,
  MAX(analyzed_at) as last_analysis,
  EXTRACT(EPOCH FROM (NOW() - MAX(analyzed_at))) as seconds_since_last,
  (COUNT(*) FILTER (WHERE analysis IS NOT NULL)::float / COUNT(*)) * 100 as success_rate
FROM instagram_comments;
```

This provides ops teams with **immediate visibility** into pipeline health and enables **proactive incident response** before users notice issues.

---

## 🔗 Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/[projectid])
- [Apify Actor](https://apify.com/apidojo/instagram-comments-scraper)
- [OpenAI Platform](https://platform.openai.com/)

## 📝 License

MIT License - feel free to use this project as a template for your own SaaS applications.

## 🤝 Contributing

This is a technical challenge submission. Not accepting contributions, but feel free to fork and adapt for your needs!

---

Built with ❤️ for the technical challenge

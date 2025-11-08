-- Create instagram_comments table
CREATE TABLE IF NOT EXISTS public.instagram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_instagram_comments_created_at ON public.instagram_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_analyzed_at ON public.instagram_comments(analyzed_at DESC) WHERE analyzed_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (for displaying on dashboard)
CREATE POLICY "Allow public read access" ON public.instagram_comments
  FOR SELECT USING (true);

-- Create policy to allow insert from service role (edge function)
CREATE POLICY "Allow service role insert" ON public.instagram_comments
  FOR INSERT WITH CHECK (true);

-- Create policy to allow update from service role (edge function)
CREATE POLICY "Allow service role update" ON public.instagram_comments
  FOR UPDATE USING (true);
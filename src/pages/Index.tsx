import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { CommentCard } from "@/components/CommentCard";
import { SystemHealth } from "@/components/SystemHealth";
import { TriggerPipeline } from "@/components/TriggerPipeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, BarChart3 } from "lucide-react";

type Comment = Database["public"]["Tables"]["instagram_comments"]["Row"];

const Index = () => {
  const [activeTab, setActiveTab] = useState("comments");

  const { data: comments, isLoading, refetch } = useQuery({
    queryKey: ["instagram_comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instagram_comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Instagram Comment Analyzer
              </h1>
              <p className="text-muted-foreground mt-2">
                AI-powered sentiment analysis pipeline
              </p>
            </div>
            <TriggerPipeline onSuccess={() => refetch()} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analyzed Comments
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground text-lg">
                  No comments analyzed yet. Trigger the pipeline to get started.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="health">
            <SystemHealth comments={comments || []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

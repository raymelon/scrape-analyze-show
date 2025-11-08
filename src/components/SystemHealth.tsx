import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Database as DatabaseIcon, TrendingUp } from "lucide-react";
import { format } from "date-fns";

type Comment = Database["public"]["Tables"]["instagram_comments"]["Row"];

interface SystemHealthProps {
  comments: Comment[];
}

export const SystemHealth = ({ comments }: SystemHealthProps) => {
  const analyzedComments = comments.filter((c) => c.analysis !== null);
  const totalComments = comments.length;
  const lastAnalyzed = analyzedComments.length > 0 
    ? analyzedComments.sort((a, b) => 
        new Date(b.analyzed_at || b.created_at).getTime() - 
        new Date(a.analyzed_at || a.created_at).getTime()
      )[0]
    : null;

  const successRate = totalComments > 0 
    ? ((analyzedComments.length / totalComments) * 100).toFixed(1)
    : "0";

  const getHealthStatus = () => {
    if (analyzedComments.length === 0) return { label: "No Data", color: "bg-muted" };
    if (lastAnalyzed) {
      const timeSinceLastAnalysis = Date.now() - new Date(lastAnalyzed.analyzed_at || lastAnalyzed.created_at).getTime();
      const minutesSince = timeSinceLastAnalysis / (1000 * 60);
      
      if (minutesSince < 5) return { label: "Healthy", color: "bg-success" };
      if (minutesSince < 30) return { label: "Warning", color: "bg-warning" };
      return { label: "Inactive", color: "bg-destructive" };
    }
    return { label: "Unknown", color: "bg-muted" };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                System Status
              </CardTitle>
              <CardDescription>
                Real-time monitoring of the analysis pipeline
              </CardDescription>
            </div>
            <Badge variant="outline" className={`${healthStatus.color} text-foreground`}>
              {healthStatus.label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DatabaseIcon className="h-4 w-4" />
              Total Records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalComments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All comments in database
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analyzed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{analyzedComments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Success Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Analysis completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastAnalyzed ? (
              <>
                <div className="text-sm font-bold">
                  {format(new Date(lastAnalyzed.analyzed_at || lastAnalyzed.created_at), "MMM dd, HH:mm")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(lastAnalyzed.analyzed_at || lastAnalyzed.created_at), "yyyy")}
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-muted-foreground">N/A</div>
                <p className="text-xs text-muted-foreground mt-1">No analyses yet</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Info */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Uptime Monitoring</CardTitle>
          <CardDescription>
            How this data can be used for monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Total Records:</strong> Monitor overall data ingestion. A flatline could indicate issues with the Apify scraper.
          </p>
          <p>
            <strong className="text-foreground">Analyzed Count:</strong> Track AI processing pipeline health. Growing gap between total and analyzed indicates OpenAI API issues.
          </p>
          <p>
            <strong className="text-foreground">Success Rate:</strong> Should remain above 95%. Lower rates suggest rate limiting or API failures.
          </p>
          <p>
            <strong className="text-foreground">Last Analysis Timestamp:</strong> Alert if no new analyses in &gt;30 minutes during active periods. Indicates pipeline stall.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

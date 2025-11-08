import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, Sparkles } from "lucide-react";
import { format } from "date-fns";

type Comment = Database["public"]["Tables"]["instagram_comments"]["Row"];

interface CommentCardProps {
  comment: Comment;
}

export const CommentCard = ({ comment }: CommentCardProps) => {
  const analysis = comment.analysis as any;
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "bg-success/10 text-success border-success/20";
      case "negative":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "neutral":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Card className="bg-gradient-card border-border hover:border-primary/50 transition-all shadow-card hover:shadow-glow group">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            Comment Analysis
          </CardTitle>
          {analysis?.sentiment && (
            <Badge variant="outline" className={getSentimentColor(analysis.sentiment)}>
              {analysis.sentiment}
            </Badge>
          )}
        </div>
        
        <CardDescription className="flex items-center gap-2 text-xs">
          <Calendar className="h-3 w-3" />
          {format(new Date(comment.created_at), "MMM dd, yyyy 'at' HH:mm")}
        </CardDescription>

        {comment.source && (
          <a
            href={comment.source}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:text-accent transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View Source
          </a>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Original Content */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Original Comment
          </h4>
          <p className="text-sm text-muted-foreground line-clamp-3 bg-secondary/30 p-3 rounded-md">
            {comment.content}
          </p>
        </div>

        {/* AI Analysis */}
        {analysis && (
          <div className="space-y-3 pt-3 border-t border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              AI Analysis
            </h4>
            
            {analysis.summary && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Summary</p>
                <p className="text-sm">{analysis.summary}</p>
              </div>
            )}

            {analysis.keywords && analysis.keywords.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Keywords</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.keywords.map((keyword: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.category && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="text-xs">
                  {analysis.category}
                </Badge>
              </div>
            )}

            {analysis.confidence_score && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-accent h-full transition-all"
                      style={{ width: `${analysis.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono">
                    {Math.round(analysis.confidence_score * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

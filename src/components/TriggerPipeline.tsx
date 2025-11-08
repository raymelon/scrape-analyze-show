import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2 } from "lucide-react";

interface TriggerPipelineProps {
  onSuccess: () => void;
}

export const TriggerPipeline = ({ onSuccess }: TriggerPipelineProps) => {
  const [open, setOpen] = useState(false);
  const [postUrl, setPostUrl] = useState("");
  const [maxItems, setMaxItems] = useState("10");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTrigger = async () => {
    if (!postUrl) {
      toast({
        title: "Error",
        description: "Please enter an Instagram post URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-comments", {
        body: {
          postUrl,
          maxItems: parseInt(maxItems, 10),
        },
      });

      if (error) throw error;

      toast({
        title: "Pipeline triggered",
        description: `Successfully analyzed ${data?.processedCount || 0} comments`,
      });

      setOpen(false);
      setPostUrl("");
      onSuccess();
    } catch (error: any) {
      console.error("Pipeline error:", error);
      toast({
        title: "Pipeline failed",
        description: error.message || "Failed to trigger analysis pipeline",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:shadow-glow transition-all">
          <Play className="h-4 w-4 mr-2" />
          Trigger Pipeline
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Analyze Instagram Comments</DialogTitle>
          <DialogDescription>
            Enter an Instagram post URL to scrape and analyze comments with AI
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="postUrl">Instagram Post URL</Label>
            <Input
              id="postUrl"
              placeholder="https://www.instagram.com/p/..."
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Comments to Analyze</Label>
            <Input
              id="maxItems"
              type="number"
              placeholder="10"
              value={maxItems}
              onChange={(e) => setMaxItems(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <Button
            onClick={handleTrigger}
            disabled={loading}
            className="w-full bg-gradient-primary"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Analysis
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

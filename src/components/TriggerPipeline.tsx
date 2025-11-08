import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [hasPaidPlan, setHasPaidPlan] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [postUrlError, setPostUrlError] = useState("");
  const [maxItemsError, setMaxItemsError] = useState("");
  const [buttonError, setButtonError] = useState("");
  const { toast } = useToast();

  const handleTrigger = async () => {
    setPostUrlError("");
    setMaxItemsError("");
    setButtonError("");

    if (!postUrl.trim()) {
      setPostUrlError("Please enter an Instagram post URL");
      return;
    }

    const max = parseInt(maxItems, 10);
    if (isNaN(max) || max < 1 || max > 100) {
      setMaxItemsError("Please enter a valid number between 1 and 100");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-comments", {
        body: {
          postUrl,
          maxItems: max,
        },
      });

      if (error) throw error;

      toast({
        title: "Pipeline triggered",
        description: `Successfully analyzed ${data?.processedCount || 0} comments`,
      });

      setOpen(false);
      setPostUrl("");
      setMaxItems("10");
      onSuccess();
    } catch (error: any) {
      console.error("Pipeline error:", error);
      let description = error.message || "Failed to trigger analysis pipeline";
      description += ". You are not in paid Apify plan. Use the local pipeline instead.";
      if (error.message?.toLowerCase().includes("apify") && (error.message?.toLowerCase().includes("plan") || error.message?.toLowerCase().includes("subscription"))) {
        description = "This feature requires a paid Apify plan. Please upgrade your Apify account or use the local pipeline instead. Refer to the instructions for running locally.";
      }
      setButtonError(description);
      toast({
        title: "Pipeline failed",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
               onChange={(e) => { setPostUrl(e.target.value); setPostUrlError(""); }}
               className="bg-secondary border-border"
             />
             {postUrlError && <p className="text-sm text-destructive mt-1">{postUrlError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxItems">Max Comments to Analyze</Label>
             <Input
               id="maxItems"
               type="number"
               placeholder="10"
               value={maxItems}
               onChange={(e) => { setMaxItems(e.target.value); setMaxItemsError(""); }}
               className="bg-secondary border-border"
             />
             {maxItemsError && <p className="text-sm text-destructive mt-1">{maxItemsError}</p>}
            </div>
           <Alert variant="warning">
             <AlertDescription>
               This runs the pipeline remotely through a Supabase Edge function.<br />
               <strong>Needs a paid Apify plan to work.</strong><br /><br />
               <strong>If you prefer to use Apify Free</strong>, run the Local pipeline in your local machine instead. <strong>Refer to the README as to how, or <button onClick={() => setShowInstructions(true)} className="underline text-blue-600 hover:text-blue-800">Click here</button>.</strong>
             </AlertDescription>
           </Alert>
           <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="flex space-x-4">
             <div className="flex items-center space-x-2">
               <RadioGroupItem value="paid" id="paid" />
               <Label htmlFor="paid">I have a paid Apify plan</Label>
             </div>
             <div className="flex items-center space-x-2">
               <RadioGroupItem value="free" id="free" />
               <Label htmlFor="free">I only have Apify Free</Label>
             </div>
           </RadioGroup>
            <Button
              onClick={selectedPlan === "paid" ? handleTrigger : selectedPlan === "free" ? () => setShowInstructions(true) : undefined}
              disabled={loading || selectedPlan === ""}
              className="w-full bg-gradient-primary"
            >
              {selectedPlan === "paid" ? (
                loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                )
              ) : selectedPlan === "free" ? (
                "See instructions on running scraping pipeline locally"
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
            {buttonError && <p className="text-sm text-destructive mt-1">{buttonError}</p>}
           </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="bg-card border-border flex flex-col max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Local Pipeline Setup Instructions</DialogTitle>
            <DialogDescription>
              Follow these steps to run the comment analysis locally without a paid Apify plan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <h3 className="font-semibold">1. Download the repository from GitHub</h3>
              <p className="text-sm">Clone/Download the repository to your local machine.</p>
              <pre className="bg-secondary p-2 rounded mt-1 text-sm">git clone https://github.com/raymelon/scrape-analyze-show.git</pre>
              <pre className="bg-secondary p-2 rounded mt-1 text-sm">cd scrape-analyze-show</pre>
            </div>
            <div>
              <h3 className="font-semibold">2. Go to Scripts Folder</h3>
              <p className="text-sm">Navigate to the scripts folder, which contains the <code>local-scraper.ts</code> script.</p>
              <pre className="bg-secondary p-2 rounded mt-1 text-sm">cd scripts</pre>
            </div>
            <div>
              <h3 className="font-semibold">3. Install Dependencies</h3>
              <pre className="bg-secondary p-2 rounded mt-1 text-sm">npm install</pre>
            </div>
            <div>
              <h3 className="font-semibold">4. Build the Code</h3>
              <pre className="bg-secondary p-2 rounded mt-1 text-sm">npm run build</pre>
            </div>
            <div>
              <h3 className="font-semibold">5. Set Up Environment</h3>
              <p className="text-sm">Copy <code>env.local</code> to <code>.env</code> and fill in the following variables:</p>
              <ul className="text-sm list-disc list-inside mt-1">
                <li><code>APIFY_TOKEN</code> - Your Apify API token (get at <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">https://console.apify.com/account/integrations</a>)</li>
                <li><code>OPENAI_API_KEY</code> - Your OpenAI API key (get at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">https://platform.openai.com/api-keys</a>)</li>
                <li><code>SUPABASE_URL</code> - Your Supabase project URL (get at <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">https://supabase.com/dashboard</a>)</li>
                <li><code>SUPABASE_SERVICE_ROLE_KEY</code> - Your Supabase service role key (get at <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">https://supabase.com/dashboard</a>)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">6. Run the Local Scraper</h3>
              <pre className="bg-secondary p-2 rounded mt-1 text-sm">npm start &lt;instagram_post_url&gt; [max_items]</pre>
              <p className="text-sm mt-1">Example: <code>npm start https://www.instagram.com/p/ABC123/ 10</code></p>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-center">Need more details? Check <a href="https://github.com/raymelon/scrape-analyze-show/blob/main/scripts/README.md" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">scripts/README.md</a></p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

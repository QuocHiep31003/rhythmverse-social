import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShareDialogProps {
  resourceType: 'song' | 'playlist' | 'album';
  resourceId: string;
  title: string;
}

export const ShareDialog = ({ resourceType, resourceId, title }: ShareDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('shared_links')
        .insert({
          resource_type: resourceType,
          resource_id: resourceId,
          shared_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/share/${data.share_token}`;
      setShareLink(link);
    } catch (error) {
      console.error("Error generating share link:", error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && !shareLink) {
      generateShareLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{title}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this {resourceType} with your friends
          </p>
          {shareLink ? (
            <div className="flex gap-2">
              <Input value={shareLink} readOnly />
              <Button onClick={copyToClipboard} size="icon">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-sm">Generating share link...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
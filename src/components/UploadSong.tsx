import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const UploadSong = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    album: "",
    genre: "",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!audioFile || !formData.title || !formData.artist) {
      toast({
        title: "Missing information",
        description: "Please provide title, artist, and audio file",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload audio file
      const audioPath = `${user.id}/${Date.now()}-${audioFile.name}`;
      const { error: audioError } = await supabase.storage
        .from('songs')
        .upload(audioPath, audioFile);

      if (audioError) throw audioError;

      const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('songs')
        .getPublicUrl(audioPath);

      // Upload cover if provided
      let coverUrl = null;
      if (coverFile) {
        const coverPath = `${Date.now()}-${coverFile.name}`;
        const { error: coverError } = await supabase.storage
          .from('covers')
          .upload(coverPath, coverFile);

        if (!coverError) {
          const { data: { publicUrl } } = supabase.storage
            .from('covers')
            .getPublicUrl(coverPath);
          coverUrl = publicUrl;
        }
      }

      // Create audio element to get duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioFile);
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve);
      });
      const duration = Math.floor(audio.duration);

      // Insert song record
      const { error: dbError } = await supabase
        .from('songs')
        .insert({
          title: formData.title,
          artist: formData.artist,
          album: formData.album,
          genre: formData.genre,
          audio_url: audioUrl,
          cover_url: coverUrl,
          duration,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Song uploaded successfully",
      });

      setIsOpen(false);
      setFormData({ title: "", artist: "", album: "", genre: "" });
      setAudioFile(null);
      setCoverFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Upload Song
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload New Song</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="artist">Artist *</Label>
            <Input
              id="artist"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="album">Album</Label>
            <Input
              id="album"
              value={formData.album}
              onChange={(e) => setFormData({ ...formData, album: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="audio">Audio File *</Label>
            <Input
              id="audio"
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <Label htmlFor="cover">Cover Image</Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
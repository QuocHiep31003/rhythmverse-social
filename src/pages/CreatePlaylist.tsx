import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Music, Lock, Globe, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const CreatePlaylist = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: true,
    coverImage: null as File | null,
    songLimit: 500
  });
  const [coverPreview, setCoverPreview] = useState<string>("");

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please choose an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({ ...prev, coverImage: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Playlist name required",
        description: "Please enter a name for your playlist",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Playlist created successfully!",
        description: `"${formData.name}" has been added to your library`,
      });
      
      // Navigate to the new playlist (would use real ID from API)
      navigate("/playlist/new-playlist-id");
    } catch (error) {
      toast({
        title: "Failed to create playlist",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Create New Playlist
          </h1>
          <p className="text-muted-foreground">
            Build your perfect music collection
          </p>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Playlist Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="cover-upload">Cover Image</Label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Playlist cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Upload Cover</p>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 1000x1000px, max 5MB (JPG, PNG)
                  </p>
                </div>
              </div>
            </div>

            {/* Playlist Name */}
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name *</Label>
              <Input
                id="playlist-name"
                placeholder="My Awesome Playlist"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-background/50"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your playlist..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="bg-background/50 min-h-[100px] resize-none"
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/300 characters
              </p>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <Label>Privacy Settings</Label>
              <div className="flex items-center justify-between p-4 rounded-lg bg-background/30">
                <div className="flex items-center gap-3">
                  {formData.isPublic ? (
                    <Globe className="w-5 h-5 text-green-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-orange-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {formData.isPublic ? "Public" : "Private"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.isPublic 
                        ? "Anyone can search and view this playlist"
                        : "Only you can see this playlist"
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => handleInputChange("isPublic", checked)}
                />
              </div>
            </div>

            {/* Song Limit */}
            <div className="space-y-2">
              <Label htmlFor="song-limit">Song Limit</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="song-limit"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.songLimit}
                  onChange={(e) => handleInputChange("songLimit", parseInt(e.target.value) || 500)}
                  className="bg-background/50 w-32"
                />
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Max songs per playlist
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Set the maximum number of songs allowed in this playlist (1-1000)
              </p>
            </div>

            {/* Preview */}
            {formData.name && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-4 rounded-lg bg-background/30 border border-border/30">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      {coverPreview ? (
                        <AvatarImage src={coverPreview} alt={formData.name} />
                      ) : (
                        <AvatarFallback className="bg-primary/20">
                          {formData.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{formData.name}</h3>
                      {formData.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formData.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={formData.isPublic ? "default" : "secondary"}>
                          {formData.isPublic ? "Public" : "Private"}
                        </Badge>
                        <Badge variant="outline">
                          0/{formData.songLimit} songs
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading ? "Creating..." : "Create Playlist"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default CreatePlaylist;
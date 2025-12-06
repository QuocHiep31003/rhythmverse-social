import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { songsApi } from "@/services/api/songApi";
import { songGenreApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";

interface SongWithScore {
  song: {
    id: number;
    name: string;
    artists?: Array<{ id: number; name: string }> | string;
    duration?: string;
    releaseYear?: number;
    [key: string]: any;
  };
  songGenreId?: number;
  score?: number;
}

interface GenreSongsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genreId: number | null;
  genreName?: string;
}

export const GenreSongsDialog = ({ open, onOpenChange, genreId, genreName }: GenreSongsDialogProps) => {
  const [songs, setSongs] = useState<SongWithScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && genreId) {
      loadSongs();
    } else {
      setSongs([]);
      setEditingId(null);
    }
  }, [open, genreId]);

  const loadSongs = async () => {
    if (!genreId) return;
    try {
      setLoading(true);
      const songs = await songsApi.getSongsByGenreWithScore(genreId);
      setSongs(songs);
    } catch (error) {
      console.error("Error loading songs:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách bài hát",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (song: SongWithScore) => {
    if (song.songGenreId) {
      setEditingId(song.songGenreId);
      setEditScore(song.score?.toFixed(2) || "1.00");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditScore("");
  };

  const handleSaveScore = async (songGenreId: number) => {
    const score = parseFloat(editScore);
    if (isNaN(score) || score < 0 || score > 1) {
      toast({
        title: "Lỗi",
        description: "Score phải là số từ 0.0 đến 1.0",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await songGenreApi.update(songGenreId, score);
      toast({
        title: "Thành công",
        description: "Đã cập nhật score",
      });
      setEditingId(null);
      loadSongs();
    } catch (error) {
      console.error("Error updating score:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật score",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatArtists = (artists: Array<{ id: number; name: string }> | string | undefined): string => {
    if (!artists) return "Unknown";
    if (typeof artists === "string") return artists;
    return artists.map(a => a.name).join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Songs - {genreName || "Genre"}</DialogTitle>
          <DialogDescription>
            View and edit scores of songs in this genre
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <p className="mt-2 text-muted-foreground">Đang tải...</p>
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có bài hát nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No.</TableHead>
                  <TableHead>Song Name</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead className="w-32">Release Year</TableHead>
                  <TableHead className="w-32">Duration</TableHead>
                  <TableHead className="w-32 text-center">Score</TableHead>
                  <TableHead className="w-32 text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {songs.map((item, index) => (
                  <TableRow key={item.song.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.song.name}</TableCell>
                    <TableCell>{formatArtists(item.song.artists)}</TableCell>
                    <TableCell>{item.song.releaseYear || "—"}</TableCell>
                    <TableCell>{item.song.duration || "—"}</TableCell>
                    <TableCell className="text-center">
                      {editingId === item.songGenreId ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={editScore}
                            onChange={(e) => setEditScore(e.target.value)}
                            className="w-20 h-8 text-center"
                            disabled={saving}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => item.songGenreId && handleSaveScore(item.songGenreId)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="font-semibold">
                          {item.score?.toFixed(2) || "1.00"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!editingId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


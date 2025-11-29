import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, X } from "lucide-react";
import { uploadImage } from "@/config/cloudinary";
import { artistsApi } from "@/services/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const artistFormSchema = z.object({
  name: z.string().min(1, "Artist name cannot be empty").max(200),
  country: z.string().min(1, "Country cannot be empty").max(100),
  debutYear: z.coerce.number().min(1900, "Invalid debut year").max(new Date().getFullYear()),
  description: z.string().max(1000).optional().or(z.literal("")),
  avatar: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

type ArtistFormValues = z.infer<typeof artistFormSchema>;

interface ArtistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ArtistFormValues) => void;
  defaultValues?: Partial<ArtistFormValues> & { id?: number };
  isLoading?: boolean;
  mode: "create" | "edit";
}

export const ArtistFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
}: ArtistFormDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [showDeactivationWarning, setShowDeactivationWarning] = useState(false);
  const [deactivationWarning, setDeactivationWarning] = useState<{ message: string; affectedSongsCount: number } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<"ACTIVE" | "INACTIVE" | null>(null);

  const form = useForm<ArtistFormValues>({
    resolver: zodResolver(artistFormSchema),
    defaultValues: {
      name: "",
      country: "",
      debutYear: new Date().getFullYear(),
      description: "",
      avatar: "",
      status: "ACTIVE",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        ...defaultValues,
        status: (defaultValues.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
      });
      setPreviewUrl(defaultValues.avatar || "");
    } else if (open) {
      form.reset({
        name: "",
        country: "",
        debutYear: new Date().getFullYear(),
        description: "",
        avatar: "",
        status: "ACTIVE",
      });
      setPreviewUrl("");
    }
  }, [open, defaultValues, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setPreviewUrl(result.secure_url);
      form.setValue("avatar", result.secure_url);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl("");
    form.setValue("avatar", "");
  };

  const handleStatusChange = async (checked: boolean) => {
    const newStatus = checked ? "ACTIVE" : "INACTIVE";
    const currentStatus = form.getValues("status");
    
    // Nếu đang chuyển từ ACTIVE sang INACTIVE và đang edit mode, hiển thị cảnh báo
    if (currentStatus === "ACTIVE" && newStatus === "INACTIVE" && mode === "edit" && defaultValues?.id) {
      try {
        const warning = await artistsApi.getDeactivationWarning(defaultValues.id);
        setDeactivationWarning({
          message: warning.message || "",
          affectedSongsCount: warning.affectedSongsCount || 0,
        });
        setPendingStatusChange(newStatus);
        setShowDeactivationWarning(true);
      } catch (error) {
        console.error("Error fetching deactivation warning:", error);
        // Nếu không lấy được cảnh báo, vẫn cho phép thay đổi
        form.setValue("status", newStatus);
      }
    } else {
      form.setValue("status", newStatus);
    }
  };

  const handleConfirmDeactivation = () => {
    if (pendingStatusChange) {
      form.setValue("status", pendingStatusChange);
    }
    setShowDeactivationWarning(false);
    setPendingStatusChange(null);
    setDeactivationWarning(null);
  };

  const handleCancelDeactivation = () => {
    setShowDeactivationWarning(false);
    setPendingStatusChange(null);
    setDeactivationWarning(null);
  };

  const handleSubmit = (data: ArtistFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Add New Artist" : "Edit Artist"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Enter information to create a new artist"
              : "Update artist information"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Avatar Upload */}
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-4">
                      {previewUrl ? (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </label>
                      )}
                      <p className="text-xs text-muted-foreground">
                        * Cloudinary sẽ được cấu hình sau. Hiện tại đang dùng demo mode.
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Artist name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country *</FormLabel>
                  <FormControl>
                    <Input placeholder="Việt Nam, United States..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debutYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Debut Year *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2020" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Introduce the artist..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Switch - Chỉ hiển thị khi edit */}
            {mode === "edit" && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {field.value === "ACTIVE" ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <Switch
                          checked={field.value === "ACTIVE"}
                          onCheckedChange={handleStatusChange}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || uploading}>
                {isLoading ? "Saving..." : uploading ? "Uploading..." : mode === "create" ? "Create" : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Deactivation Warning Dialog */}
        <AlertDialog open={showDeactivationWarning} onOpenChange={setShowDeactivationWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivation Warning</AlertDialogTitle>
              <AlertDialogDescription>
                {deactivationWarning?.message || "When deactivating this artist, related songs will be affected."}
                <br />
                <br />
                <strong>Number of songs that will be affected: {deactivationWarning?.affectedSongsCount || 0}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDeactivation}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeactivation}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Xác nhận tắt
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
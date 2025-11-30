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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GENRE_ICON_OPTIONS } from "@/data/iconOptions";
import { Upload, X } from "lucide-react";
import { uploadImage } from "@/config/cloudinary";
import { genresApi } from "@/services/api";
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
import { toast } from "@/hooks/use-toast";

const genreFormSchema = z.object({
  name: z.string().min(1, "Genre name cannot be empty").max(100),
  iconKey: z.string().optional(),
  customIconUrl: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
}).refine((data) => !!(data.iconKey || data.customIconUrl), {
  message: "Please select an icon or upload a custom icon",
  path: ["iconKey"],
});

type GenreFormValues = z.infer<typeof genreFormSchema>;

interface GenreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GenreFormValues) => void;
  defaultValues?: Partial<GenreFormValues> & { iconUrl?: string; status?: string; id?: number };
  isLoading?: boolean;
  mode: "create" | "edit";
}

export const GenreFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
}: GenreFormDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [customPreview, setCustomPreview] = useState<string>("");
  const [showDeactivationWarning, setShowDeactivationWarning] = useState(false);
  const [deactivationWarning, setDeactivationWarning] = useState<{ message: string; affectedSongsCount: number } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<"ACTIVE" | "INACTIVE" | null>(null);

  const form = useForm<GenreFormValues>({
    resolver: zodResolver(genreFormSchema),
    defaultValues: {
      name: "",
      iconKey: GENRE_ICON_OPTIONS[0]?.value ?? "music",
      customIconUrl: "",
      status: "ACTIVE",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      const preset = GENRE_ICON_OPTIONS.find((opt) => opt.value === defaultValues.iconUrl);
      form.reset({
        name: defaultValues.name || "",
        iconKey: preset ? preset.value : "",
        customIconUrl: preset ? "" : defaultValues.iconUrl || "",
        status: (defaultValues.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
      });
      setCustomPreview(preset ? "" : defaultValues.iconUrl || "");
    } else if (open) {
      form.reset({
        name: "",
        iconKey: GENRE_ICON_OPTIONS[0]?.value ?? "music",
        customIconUrl: "",
        status: "ACTIVE",
      });
      setCustomPreview("");
    }
  }, [open, defaultValues, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setCustomPreview(result.secure_url);
      form.setValue("customIconUrl", result.secure_url, { shouldDirty: true, shouldValidate: true });
      form.setValue("iconKey", "", { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCustom = () => {
    setCustomPreview("");
    form.setValue("customIconUrl", "", { shouldDirty: true, shouldValidate: true });
  };

  const handleStatusChange = async (checked: boolean) => {
    const newStatus = checked ? "ACTIVE" : "INACTIVE";
    const currentStatus = form.getValues("status");
    
    // Nếu đang chuyển từ ACTIVE sang INACTIVE và đang edit mode, hiển thị cảnh báo
    if (currentStatus === "ACTIVE" && newStatus === "INACTIVE" && mode === "edit" && defaultValues?.id) {
      try {
        const warning = await genresApi.getDeactivationWarning(defaultValues.id);
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

  const handleSubmit = (data: GenreFormValues) => {
    onSubmit({
      name: data.name,
      iconUrl: data.customIconUrl || data.iconKey || "",
      status: data.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Add New Genre" : "Edit Genre"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Enter a new music genre name"
              : "Update genre name"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Pop, Rock, Jazz..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Icon Upload */}
            <FormField
              control={form.control}
              name="iconKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {GENRE_ICON_OPTIONS.map((option) => {
                        const IconComp = option.icon;
                        const isSelected = field.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              field.onChange(option.value);
                              setCustomPreview("");
                              form.setValue("customIconUrl", "", { shouldDirty: true, shouldValidate: true });
                            }}
                            className={`flex items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary hover:bg-primary/5 ${
                              isSelected ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border"
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${option.badgeClass || "bg-primary"}`}
                            >
                              <IconComp className="h-5 w-5" />
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.value}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">Hoặc upload icon riêng</p>
              <div className="flex flex-col gap-4">
                {customPreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                    <img src={customPreview} alt="Custom icon" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveCustom}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      aria-label="Remove custom icon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload icon</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">* Khuyến nghị 512x512px, tối đa 5MB (JPG, PNG, WebP)</p>
              </div>
            </div>

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
                {deactivationWarning?.message || "When deactivating this genre, related songs will be affected."}
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
                Confirm Deactivation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
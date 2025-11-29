import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { uploadImage } from "@/config/cloudinary";
import { toast } from "sonner";

// Simple dominant color extractor using canvas (already used elsewhere in app)
async function getDominantColor(url: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve) => {
    if (!url) return resolve({ r: 99, g: 102, b: 241 });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ r: 99, g: 102, b: 241 });
      const w = 32, h = 32;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 200) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (!count) return resolve({ r: 99, g: 102, b: 241 });
      resolve({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
    };
    img.onerror = () => resolve({ r: 99, g: 102, b: 241 });
  });
}
function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n));
}
function mix(a: number, b: number, t: number) {
  return Math.round(a * (1 - t) + b * t);
}
function buildGradientFromRGB(rgb: { r: number; g: number; b: number }) {
  const base = { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) };
  const to = { r: mix(base.r, 20, 0.8), g: mix(base.g, 20, 0.8), b: mix(base.b, 20, 0.8) };
  const via = { r: mix(base.r, 255, 0.15), g: mix(base.g, 255, 0.15), b: mix(base.b, 255, 0.15) };
  // Tailwind arbitrary color values
  return `from-[rgba(${base.r},${base.g},${base.b},0.9)] via-[rgba(${via.r},${via.g},${via.b},0.9)] to-[rgba(${to.r},${to.g},${to.b},0.9)]`;
}

const schema = z.object({
  title: z
    .string()
    .min(1, "Bắt buộc")
    .max(60, "Tối đa 60 ký tự"),
  subtitle: z
    .string()
    .max(120, "Tối đa 120 ký tự")
    .optional()
    .or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  ctaText: z
    .string()
    .max(24, "Tối đa 24 ký tự")
    .optional()
    .or(z.literal("")),
  ctaUrl: z
    .string()
    .max(200, "Tối đa 200 ký tự")
    .optional()
    .or(z.literal("")),
  gradient: z.string().optional().or(z.literal("")),
  badge: z
    .string()
    .max(20, "Tối đa 20 ký tự")
    .optional()
    .or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type PromotionFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PromotionFormValues) => void;
  isLoading?: boolean;
  defaultValues?: Partial<PromotionFormValues>;
  mode: "create" | "edit";
}

export const PromotionFormDialog = ({ open, onOpenChange, onSubmit, isLoading = false, defaultValues, mode }: Props) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      subtitle: "",
      imageUrl: "",
      ctaText: "",
      ctaUrl: "",
      gradient: "",
      badge: "",
      icon: "",
      active: true,
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: defaultValues?.title || "",
        subtitle: defaultValues?.subtitle || "",
        imageUrl: defaultValues?.imageUrl || "",
        ctaText: defaultValues?.ctaText || "",
        ctaUrl: (defaultValues as any)?.ctaUrl || "",
        gradient: defaultValues?.gradient || "",
        badge: defaultValues?.badge || "",
        icon: (defaultValues as any)?.icon || "",
        active: defaultValues?.active ?? true,
      });
    }
  }, [open, defaultValues, form]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      form.setValue("imageUrl", result.secure_url, { shouldDirty: true, shouldValidate: true });
      // Auto-generate gradient from image
      const rgb = await getDominantColor(result.secure_url);
      form.setValue("gradient", buildGradientFromRGB(rgb), { shouldDirty: true });
    } catch (err) {
      toast.error("Upload ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const imagePreview = form.watch("imageUrl");
  // Auto-generate gradient whenever imageUrl is manually pasted/changed
  useEffect(() => {
    (async () => {
      const url = form.getValues("imageUrl");
      if (!url) return;
      try {
        const rgb = await getDominantColor(url);
        form.setValue("gradient", buildGradientFromRGB(rgb), { shouldDirty: true });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePreview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] bg-zinc-950 border border-zinc-800 rounded-xl p-0 text-white">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800">
          <DialogTitle className="text-2xl font-bold">{mode === "create" ? "Create New Banner" : "Edit Banner"}</DialogTitle>
          <DialogDescription className="text-gray-400">Fill in the banner details. You can edit later.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-6 px-6 py-6">
            {/* Hidden field to register imageUrl with RHF */}
            <input type="hidden" {...form.register("imageUrl")} />

            {/* LEFT: COVER PREVIEW */}
            <div className="flex flex-col items-center justify-start gap-3 w-full sm:w-1/3">
              <div className="relative w-44 h-44 border-2 border-dashed border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-900">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Promotion image"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => form.setValue("imageUrl", "")}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-zinc-800 transition-colors">
                    <span className="text-xs text-gray-500">Upload cover</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">Max 5MB. Supported formats</p>
              
              
            </div>

            {/* RIGHT: FIELDS */}
            
            <div className="flex-1 space-y-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Title *</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm" placeholder="Enter banner title..." />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                      <span>Max 60 characters</span>
                      <span>{(form.watch("title") || "").length}/60</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Subtitle</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm" placeholder="Short description (optional)" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                      <span>Max 120 characters</span>
                      <span>{(form.watch("subtitle") || "").length}/120</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ctaText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">CTA Text</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm" placeholder="e.g. Listen now, Thử ngay, Nâng cấp" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                      <span>Max 24 characters</span>
                      <span>{(form.watch("ctaText") || "").length}/24</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ctaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">CTA URL (Đích đến khi click)</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm" placeholder="e.g. /premium, /discover, /music-recognition" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                      <span>URL để navigate khi click CTA button</span>
                      <span>{(form.watch("ctaUrl") || "").length}/200</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="badge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Badge</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm" placeholder="e.g. NEW / HOT / SALE / TRENDING" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                      <span>Max 20 characters</span>
                      <span>{(form.watch("badge") || "").length}/20</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Icon field removed per request */}

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-lg h-9 px-3">
                      <FormLabel className="text-sm m-0">Active</FormLabel>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Footer inside right column (like album form) */}
              <DialogFooter className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading || uploading}
                  className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800 transition-colors h-8 text-xs px-3"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || uploading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-8 text-xs px-3"
                >
                  {uploading
                    ? "Uploading..."
                    : isLoading
                    ? "Saving..."
                    : mode === "create"
                    ? "Create Banner"
                    : "Update Banner"}
                </Button>
              </DialogFooter>
            </div>

            
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PromotionFormDialog;



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
import { Upload as UploadIcon, Image as ImageIcon, X, Sparkles, Link2, Tag, Type, FileText } from "lucide-react";

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

// Helper function to check for invalid characters
const hasInvalidChars = (str: string, allowSpecial: boolean = true): boolean => {
  if (!str) return false;
  // Control characters (except newline, tab, carriage return)
  const controlChars = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/;
  if (controlChars.test(str)) return true;
  
  // If special chars not allowed, check for problematic ones
  if (!allowSpecial) {
    // Only allow alphanumeric, spaces, and common punctuation
    const invalid = /[<>{}[\]\\|`~]/;
    if (invalid.test(str)) return true;
  }
  
  return false;
};

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(60, "Title must be at most 60 characters")
    .refine((val) => !hasInvalidChars(val, false), {
      message: "Title contains invalid characters",
    })
    .refine((val) => val.length >= 1, {
      message: "Title cannot be only spaces",
    }),
  subtitle: z
    .string()
    .max(120, "Subtitle must be at most 120 characters")
    .refine((val) => !val || !hasInvalidChars(val, true), {
      message: "Subtitle contains invalid characters",
    })
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim() || ""),
  imageUrl: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"), {
      message: "Image URL must start with http://, https://, or /",
    })
    .refine((val) => !val || !hasInvalidChars(val, true), {
      message: "Image URL contains invalid characters",
    })
    .optional()
    .or(z.literal("")),
  ctaText: z
    .string()
    .max(24, "CTA text must be at most 24 characters")
    .refine((val) => !val || !hasInvalidChars(val, false), {
      message: "CTA text contains invalid characters",
    })
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim() || ""),
  ctaUrl: z
    .string()
    .max(200, "CTA URL must be at most 200 characters")
    .refine((val) => !val || val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"), {
      message: "CTA URL must start with / or be a valid URL",
    })
    .refine((val) => !val || !hasInvalidChars(val, true), {
      message: "CTA URL contains invalid characters",
    })
    .refine((val) => !val || val.length <= 200, {
      message: "CTA URL is too long (max 200 characters)",
    })
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim() || ""),
  gradient: z.string().optional().or(z.literal("")),
  badge: z
    .string()
    .max(20, "Badge must be at most 20 characters")
    .refine((val) => !val || !hasInvalidChars(val, false), {
      message: "Badge contains invalid characters",
    })
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim() || ""),
  icon: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type BannerFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BannerFormValues) => void;
  isLoading?: boolean;
  defaultValues?: Partial<BannerFormValues>;
  mode: "create" | "edit";
}

export const BannerFormDialog = ({ open, onOpenChange, onSubmit, isLoading = false, defaultValues, mode }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<BannerFormValues>({
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

  const processFile = async (file: File) => {
    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPG, PNG, or WebP)");
      return;
    }
    
    setUploading(true);
    try {
      const result = await uploadImage(file);
      form.setValue("imageUrl", result.secure_url, { shouldDirty: true, shouldValidate: true });
      // Auto-generate gradient from image
      const rgb = await getDominantColor(result.secure_url);
      form.setValue("gradient", buildGradientFromRGB(rgb), { shouldDirty: true });
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const imagePreview = form.watch("imageUrl");
  // Auto-generate gradient whenever imageUrl is manually pasted/changed
  useEffect(() => {
    (async () => {
      const url = form.getValues("imageUrl");
      if (!url || !url.startsWith("http")) return;
      try {
        const rgb = await getDominantColor(url);
        form.setValue("gradient", buildGradientFromRGB(rgb), { shouldDirty: true });
      } catch {
        // Silently fail for gradient generation
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePreview]);

  const watchedValues = form.watch();
  const bannerPreview = {
    title: watchedValues.title || "Banner Title",
    subtitle: watchedValues.subtitle || "Banner subtitle will appear here",
    imageUrl: watchedValues.imageUrl || "",
    ctaText: watchedValues.ctaText || "Click here",
    badge: watchedValues.badge || "",
    gradient: watchedValues.gradient || "from-indigo-600 via-purple-600 to-indigo-600",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-zinc-950 via-zinc-900/95 to-zinc-950 border border-zinc-800/60 rounded-2xl p-0 text-white shadow-2xl backdrop-blur-xl">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900/40 via-indigo-950/20 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-indigo-100 to-purple-100 bg-clip-text text-transparent">
                {mode === "create" ? "Create New Banner" : "Edit Banner"}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1 text-xs">
                {mode === "create" 
                  ? "Fill in the banner details. Fields marked with * are required." 
                  : "Update the banner information. Fields marked with * are required."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="relative flex flex-col lg:flex-row gap-5 px-6 py-4">
            {/* Hidden field to register imageUrl with RHF */}
            <input type="hidden" {...form.register("imageUrl")} />

            {/* LEFT: IMAGE UPLOAD */}
            <div className="flex flex-col items-center justify-start gap-3 w-full lg:w-[240px] flex-shrink-0">
              {/* Image Upload Area */}
              <div 
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative w-full aspect-[4/3] border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-zinc-900/70 via-zinc-800/50 to-zinc-900/70 transition-all duration-300 group shadow-lg ${
                  isDragging 
                    ? "border-indigo-500 scale-105 bg-indigo-950/30 shadow-indigo-500/20" 
                    : "border-zinc-700/60 hover:border-indigo-500/50"
                }`}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Banner preview"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <button
                      type="button"
                      onClick={() => form.setValue("imageUrl", "", { shouldValidate: true })}
                      className="absolute top-2 right-2 p-2 bg-red-600/95 hover:bg-red-700 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-lg hover:scale-110 backdrop-blur-sm"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <label className="absolute inset-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-zinc-800/20 transition-all duration-300 p-4">
                    {isDragging ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border-2 border-indigo-500/50 flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/20">
                          <UploadIcon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <span className="text-sm text-indigo-300 font-semibold">Drop image here</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-300">
                          <UploadIcon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <span className="text-xs text-gray-300 font-medium mb-1">Upload Image</span>
                        <span className="text-[10px] text-gray-500 text-center">Click or drag & drop</span>
                      </>
                    )}
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
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      </div>
                      <div className="text-xs text-white font-medium">Uploading...</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* File Info */}
              <div className="text-center w-full">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/60 backdrop-blur-sm rounded-lg border border-zinc-700/50">
                  <FileText className="w-3 h-3 text-indigo-400" />
                  <p className="text-[10px] text-gray-400 font-medium">Max 5MB • JPG, PNG, WebP</p>
                </div>
                {form.formState.errors.imageUrl && (
                  <p className="text-[10px] text-red-400 font-medium mt-1.5 px-2 py-1 bg-red-500/10 rounded border border-red-500/20">
                    {form.formState.errors.imageUrl.message}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: FIELDS */}
            <div className="flex-1 space-y-4 min-w-0">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => {
                  const value = field.value || "";
                  const error = form.formState.errors.title;
                  return (
                    <FormItem className="group">
                      <FormLabel className="text-xs font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center group-focus-within:scale-110 transition-transform">
                          <Type className="w-3 h-3 text-indigo-400" />
                        </div>
                        <span>Title <span className="text-red-400">*</span></span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              // Prevent invalid characters
                              if (hasInvalidChars(newValue, false)) {
                                toast.error("Invalid characters detected. Please remove special characters.");
                                return;
                              }
                              field.onChange(e);
                            }}
                            onBlur={field.onBlur}
                            className={`bg-zinc-900/70 backdrop-blur-sm border transition-all duration-300 h-9 text-sm pl-3 pr-20 rounded-lg ${
                              error 
                                ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                                : "border-zinc-700/60 hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            }`}
                            placeholder="Enter banner title..." 
                            maxLength={60}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-300 ${
                              value.length > 55 ? "text-yellow-400 bg-yellow-400/20" : 
                              value.length === 60 ? "text-red-400 bg-red-400/20" : 
                              "text-gray-500 bg-zinc-800/60"
                            }`}>
                              {value.length}/60
                            </span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] text-red-400 mt-1 px-1" />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => {
                  const value = field.value || "";
                  const error = form.formState.errors.subtitle;
                  return (
                    <FormItem className="group">
                      <FormLabel className="text-xs font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center group-focus-within:scale-110 transition-transform">
                          <FileText className="w-3 h-3 text-indigo-400" />
                        </div>
                        <span>Subtitle</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (hasInvalidChars(newValue, true)) {
                                toast.error("Invalid characters detected in subtitle.");
                                return;
                              }
                              field.onChange(e);
                            }}
                            onBlur={field.onBlur}
                            className={`bg-zinc-900/70 backdrop-blur-sm border transition-all duration-300 h-11 text-sm pl-3 pr-24 rounded-lg ${
                              error 
                                ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                                : "border-zinc-700/60 hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            }`}
                            placeholder="Short description (optional)" 
                            maxLength={120}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-300 ${
                              value.length > 110 ? "text-yellow-400 bg-yellow-400/20" : 
                              value.length === 120 ? "text-red-400 bg-red-400/20" : 
                              "text-gray-500 bg-zinc-800/60"
                            }`}>
                              {value.length}/120
                            </span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] text-red-400 mt-1 px-1" />
                    </FormItem>
                  );
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ctaText"
                  render={({ field }) => {
                    const value = field.value || "";
                    const error = form.formState.errors.ctaText;
                    return (
                      <FormItem className="group">
                        <FormLabel className="text-xs font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center group-focus-within:scale-110 transition-transform">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                          </div>
                          <span>CTA Text</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                if (hasInvalidChars(newValue, false)) {
                                  toast.error("Invalid characters in CTA text.");
                                  return;
                                }
                                field.onChange(e);
                              }}
                              onBlur={field.onBlur}
                              className={`bg-zinc-900/70 backdrop-blur-sm border transition-all duration-300 h-9 text-sm pl-3 pr-20 rounded-lg ${
                                error 
                                  ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                                  : "border-zinc-700/60 hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                              }`}
                              placeholder="e.g. Listen now" 
                              maxLength={24}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-300 ${
                                value.length > 20 ? "text-yellow-400 bg-yellow-400/20" : 
                                value.length === 24 ? "text-red-400 bg-red-400/20" : 
                                "text-gray-500 bg-zinc-800/60"
                              }`}>
                                {value.length}/24
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px] text-red-400 mt-1 px-1" />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="badge"
                  render={({ field }) => {
                    const value = field.value || "";
                    const error = form.formState.errors.badge;
                    return (
                      <FormItem className="group">
                        <FormLabel className="text-xs font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center group-focus-within:scale-110 transition-transform">
                            <Tag className="w-3 h-3 text-indigo-400" />
                          </div>
                          <span>Badge</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                if (hasInvalidChars(newValue, false)) {
                                  toast.error("Invalid characters in badge.");
                                  return;
                                }
                                field.onChange(e);
                              }}
                              onBlur={field.onBlur}
                              className={`bg-zinc-900/70 backdrop-blur-sm border transition-all duration-300 h-9 text-sm pl-3 pr-20 rounded-lg ${
                                error 
                                  ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                                  : "border-zinc-700/60 hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                              }`}
                              placeholder="e.g. NEW, HOT" 
                              maxLength={20}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-300 ${
                                value.length > 15 ? "text-yellow-400 bg-yellow-400/20" : 
                                value.length === 20 ? "text-red-400 bg-red-400/20" : 
                                "text-gray-500 bg-zinc-800/60"
                              }`}>
                                {value.length}/20
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px] text-red-400 mt-1 px-1" />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="ctaUrl"
                render={({ field }) => {
                  const value = field.value || "";
                  const error = form.formState.errors.ctaUrl;
                  return (
                    <FormItem className="group">
                      <FormLabel className="text-xs font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center group-focus-within:scale-110 transition-transform">
                          <Link2 className="w-3 h-3 text-indigo-400" />
                        </div>
                        <span>CTA URL</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (hasInvalidChars(newValue, true)) {
                                toast.error("Invalid characters in CTA URL.");
                                return;
                              }
                              field.onChange(e);
                            }}
                            onBlur={field.onBlur}
                            className={`bg-zinc-900/70 backdrop-blur-sm border transition-all duration-300 h-9 text-sm font-mono pl-3 pr-24 rounded-lg ${
                              error 
                                ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                                : "border-zinc-700/60 hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            }`}
                            placeholder="/premium, /discover" 
                            maxLength={200}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-300 ${
                              value.length > 180 ? "text-yellow-400 bg-yellow-400/20" : 
                              value.length === 200 ? "text-red-400 bg-red-400/20" : 
                              "text-gray-500 bg-zinc-800/60"
                            }`}>
                              {value.length}/200
                            </span>
                          </div>
                        </div>
                      </FormControl>
                      <div className="text-[10px] text-gray-500 mt-1 px-1">URL để navigate (bắt đầu với /)</div>
                      <FormMessage className="text-[10px] text-red-400 mt-1 px-1" />
                    </FormItem>
                  );
                }}
              />

              {/* Icon field removed per request */}

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <div className={`flex items-center justify-between bg-gradient-to-r backdrop-blur-sm border rounded-xl h-12 px-4 transition-all duration-300 ${
                      field.value
                        ? "from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border-indigo-500/40 hover:border-indigo-500/60"
                        : "from-zinc-900/60 to-zinc-800/40 border-zinc-700/60 hover:border-zinc-600/60"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          field.value 
                            ? "bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/50" 
                            : "bg-zinc-800/60 border border-zinc-700/50"
                        }`}>
                          <Sparkles className={`w-4 h-4 transition-all duration-300 ${
                            field.value ? "text-indigo-300" : "text-gray-500"
                          }`} />
                        </div>
                        <div>
                          <FormLabel className="text-xs font-semibold text-gray-200 m-0 cursor-pointer block">
                            Active Status
                          </FormLabel>
                          <p className={`text-[10px] mt-0.5 transition-colors duration-300 ${
                            field.value ? "text-indigo-300" : "text-gray-500"
                          }`}>
                            {field.value ? "✓ Active" : "○ Inactive"}
                          </p>
                        </div>
                      </div>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-600 data-[state=checked]:to-purple-600"
                      />
                    </div>
                    <FormMessage className="text-[10px] text-red-400 mt-1 px-1" />
                  </FormItem>
                )}
              />

              {/* Footer inside right column */}
              <DialogFooter className="pt-4 border-t border-zinc-800/60 flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    onOpenChange(false);
                  }}
                  disabled={isLoading || uploading}
                  className="bg-transparent border border-zinc-700/60 text-gray-300 hover:bg-zinc-800/80 hover:text-white hover:border-zinc-600 transition-all duration-300 h-9 px-6 rounded-lg font-medium text-sm order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || uploading || !form.formState.isValid}
                  className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed h-9 px-6 font-semibold text-sm shadow-lg hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 rounded-lg order-1 sm:order-2 bg-[length:200%_auto] hover:bg-[position:right_center] overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {uploading
                      ? "Uploading..."
                      : isLoading
                      ? "Saving..."
                      : mode === "create"
                      ? "Create Banner"
                      : "Update Banner"}
                    {!isLoading && !uploading && (
                      <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Button>
              </DialogFooter>
            </div>

            
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BannerFormDialog;


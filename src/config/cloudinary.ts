import { toast } from "sonner";

const CLOUD_NAME = "dhylbhwvb";
const UPLOAD_PRESET = "EchoVerse";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
}

/**
 * Upload image to Cloudinary
 * @param file - Image file to upload
 * @param onProgress - Optional progress callback
 * @returns Cloudinary upload result with secure_url
 */
export const uploadImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> => {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    toast.error("Vui lòng chọn file ảnh");
    throw new Error("Invalid file type. Only images are allowed.");
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Kích thước file không được vượt quá 5MB");
    throw new Error("File size exceeds 5MB limit");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    const uploadPromise = new Promise<CloudinaryUploadResult>((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    });

    const result = await uploadPromise;
    
    if (!result.secure_url) {
      toast.error("Không lấy được URL từ Cloudinary");
      throw new Error("No secure_url in response");
    }

    toast.success("Upload ảnh thành công!");
    return result;
  } catch (error) {
    toast.error("Lỗi khi upload ảnh");
    console.error("Cloudinary image upload error:", error);
    throw error;
  }
};

/**
 * Upload audio to Cloudinary
 * @param file - Audio file to upload
 * @param onProgress - Optional progress callback
 * @returns Cloudinary upload result with secure_url
 */
export const uploadAudio = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> => {
  // Validate file type
  const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a"];
  if (!allowedAudioTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    toast.error("Vui lòng chọn file audio (MP3, WAV, OGG, M4A)");
    throw new Error("Invalid file type. Only audio files are allowed.");
  }

  // Validate file size (max 10MB for audio)
  if (file.size > 10 * 1024 * 1024) {
    toast.error("Kích thước file không được vượt quá 10MB");
    throw new Error("File size exceeds 10MB limit");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("resource_type", "video"); // Cloudinary uses 'video' for audio files

  try {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    const uploadPromise = new Promise<CloudinaryUploadResult>((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
      xhr.send(formData);
    });

    const result = await uploadPromise;
    
    if (!result.secure_url) {
      toast.error("Không lấy được URL từ Cloudinary");
      throw new Error("No secure_url in response");
    }

    toast.success("Upload audio thành công!");
    return result;
  } catch (error) {
    toast.error("Lỗi khi upload audio");
    console.error("Cloudinary audio upload error:", error);
    throw error;
  }
};

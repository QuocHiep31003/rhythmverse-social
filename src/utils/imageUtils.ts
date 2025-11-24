/**
 * Utility functions for image manipulation
 */

/**
 * Tạo ảnh grid 2x2 từ 4 ảnh bài hát
 * @param imageUrls Array of 4 image URLs
 * @returns Promise<string> - Data URL của ảnh đã merge
 */
export async function createGridCover(imageUrls: (string | null | undefined)[]): Promise<string> {
  // Lọc bỏ null/undefined và lấy tối đa 4 ảnh
  const validUrls = imageUrls.filter((url): url is string => Boolean(url)).slice(0, 4);
  
  if (validUrls.length === 0) {
    throw new Error("No valid image URLs provided");
  }

  // Nếu chỉ có 1 ảnh, dùng luôn
  if (validUrls.length === 1) {
    return validUrls[0];
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    const size = 1000; // Kích thước ảnh output
    canvas.width = size;
    canvas.height = size;

    const gridSize = 2;
    const cellSize = size / gridSize;
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];
    const imageErrors: Error[] = [];

    // Load tất cả ảnh
    validUrls.forEach((url, index) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        images[index] = img;
        loadedCount++;
        
        // Khi đã load đủ ảnh (hoặc có lỗi), vẽ lên canvas
        if (loadedCount + imageErrors.length === validUrls.length) {
          drawGrid();
        }
      };
      
      img.onerror = (err) => {
        imageErrors.push(new Error(`Failed to load image ${index}: ${url}`));
        loadedCount++;
        
        if (loadedCount + imageErrors.length === validUrls.length) {
          if (images.length === 0) {
            reject(new Error("All images failed to load"));
            return;
          }
          drawGrid();
        }
      };
      
      img.src = url;
    });

    function drawGrid() {
      // Clear canvas
      ctx.fillStyle = "#1a1a1a"; // Dark background
      ctx.fillRect(0, 0, size, size);

      // Vẽ từng ảnh vào grid
      images.forEach((img, index) => {
        if (!img) return;
        
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const x = col * cellSize;
        const y = row * cellSize;

        // Vẽ ảnh với crop center
        const imgAspect = img.width / img.height;
        const cellAspect = 1; // cellSize / cellSize = 1 (square)
        
        let drawWidth = cellSize;
        let drawHeight = cellSize;
        let drawX = x;
        let drawY = y;

        if (imgAspect > cellAspect) {
          // Ảnh rộng hơn, crop theo chiều cao
          drawWidth = cellSize * imgAspect;
          drawX = x - (drawWidth - cellSize) / 2;
        } else {
          // Ảnh cao hơn, crop theo chiều rộng
          drawHeight = cellSize / imgAspect;
          drawY = y - (drawHeight - cellSize) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      });

      // Convert canvas thành data URL
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve(dataUrl);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to convert canvas to data URL"));
      }
    }
  });
}

/**
 * Upload data URL lên Cloudinary
 * @param dataUrl Data URL của ảnh
 * @returns Promise<string> - URL của ảnh đã upload
 */
export async function uploadDataUrlToCloudinary(dataUrl: string): Promise<string> {
  const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || "";
  
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary not configured");
  }

  // Convert data URL thành Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", blob, "playlist-cover.jpg");
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload to Cloudinary");
  }

  const data = await res.json();
  return data.secure_url || data.url;
}


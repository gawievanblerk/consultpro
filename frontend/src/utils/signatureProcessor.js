/**
 * Signature Image Processor
 *
 * Processes uploaded signature images for better contrast and clarity.
 * Uses HTML5 Canvas for client-side image processing.
 */

/**
 * Main function to process an uploaded signature image.
 * @param {File} file - The uploaded image file (PNG, JPG, JPEG)
 * @returns {Promise<string>} - Base64 encoded PNG data URL of processed signature
 */
export async function processSignatureImage(file) {
  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload PNG or JPG images only.');
  }

  // Load image
  const img = await loadImage(file);

  // Create canvas at appropriate size
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Calculate dimensions (max 800px width, maintain aspect ratio)
  const maxWidth = 800;
  const maxHeight = 400;
  let { width, height } = img;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  canvas.width = width;
  canvas.height = height;

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Get image data for processing
  let imageData = ctx.getImageData(0, 0, width, height);

  // Step 1: Convert to grayscale
  imageData = convertToGrayscale(imageData);

  // Step 2: Enhance contrast
  imageData = enhanceContrast(imageData, 1.5);

  // Step 3: Apply threshold for binary B&W conversion
  imageData = applyThreshold(imageData, 128);

  // Step 4: Remove background (make white pixels transparent, then back to white)
  imageData = cleanBackground(imageData);

  // Put processed image data back
  ctx.putImageData(imageData, 0, 0);

  // Step 5: Crop to signature bounds
  const croppedCanvas = cropToSignature(canvas);

  // Return as PNG data URL
  return croppedCanvas.toDataURL('image/png');
}

/**
 * Load an image file and return an Image element
 * @param {File} file - The image file to load
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert image data to grayscale
 * @param {ImageData} imageData - Canvas image data
 * @returns {ImageData} - Grayscale image data
 */
export function convertToGrayscale(imageData) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Use luminosity formula for accurate grayscale
    const gray = Math.round(
      data[i] * 0.299 +      // Red
      data[i + 1] * 0.587 +  // Green
      data[i + 2] * 0.114    // Blue
    );

    data[i] = gray;     // Red
    data[i + 1] = gray; // Green
    data[i + 2] = gray; // Blue
    // Alpha (data[i + 3]) stays the same
  }

  return imageData;
}

/**
 * Enhance contrast of image data
 * @param {ImageData} imageData - Canvas image data
 * @param {number} factor - Contrast factor (1.0 = no change, >1 = more contrast)
 * @returns {ImageData} - Contrast-enhanced image data
 */
export function enhanceContrast(imageData, factor) {
  const data = imageData.data;
  const intercept = 128 * (1 - factor);

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast formula: newValue = factor * (value - 128) + 128
    data[i] = clamp(factor * data[i] + intercept);
    data[i + 1] = clamp(factor * data[i + 1] + intercept);
    data[i + 2] = clamp(factor * data[i + 2] + intercept);
  }

  return imageData;
}

/**
 * Apply threshold for binary B&W conversion
 * @param {ImageData} imageData - Canvas image data
 * @param {number} threshold - Threshold value (0-255)
 * @returns {ImageData} - Binary image data
 */
export function applyThreshold(imageData, threshold) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Average of RGB (should already be grayscale)
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const value = avg < threshold ? 0 : 255;

    data[i] = value;     // Red
    data[i + 1] = value; // Green
    data[i + 2] = value; // Blue
  }

  return imageData;
}

/**
 * Clean background - ensure white background with black signature
 * @param {ImageData} imageData - Canvas image data
 * @returns {ImageData} - Cleaned image data
 */
export function cleanBackground(imageData) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // If pixel is white (or near white), ensure it's pure white
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else {
      // Otherwise, make it black (signature ink)
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
    // Ensure full opacity
    data[i + 3] = 255;
  }

  return imageData;
}

/**
 * Crop canvas to signature bounds with padding
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} padding - Padding around signature in pixels
 * @returns {HTMLCanvasElement} - Cropped canvas
 */
export function cropToSignature(canvas, padding = 20) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  // Find bounds of non-white pixels
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      // Check if pixel is not white (signature ink)
      if (data[i] < 128) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If no signature found, return original
  if (minX >= maxX || minY >= maxY) {
    return canvas;
  }

  // Add padding
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(canvas.width, maxX + padding);
  maxY = Math.min(canvas.height, maxY + padding);

  // Create cropped canvas
  const croppedWidth = maxX - minX;
  const croppedHeight = maxY - minY;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;

  const croppedCtx = croppedCanvas.getContext('2d');

  // Fill with white background
  croppedCtx.fillStyle = '#ffffff';
  croppedCtx.fillRect(0, 0, croppedWidth, croppedHeight);

  // Draw cropped portion
  croppedCtx.drawImage(
    canvas,
    minX, minY, croppedWidth, croppedHeight,
    0, 0, croppedWidth, croppedHeight
  );

  return croppedCanvas;
}

/**
 * Clamp value between 0 and 255
 * @param {number} value - Value to clamp
 * @returns {number} - Clamped value
 */
function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Preview signature without full processing (for live preview)
 * @param {File} file - The image file to preview
 * @returns {Promise<string>} - Data URL for preview
 */
export async function previewSignatureImage(file) {
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Scale to preview size
  const maxWidth = 400;
  const maxHeight = 200;
  let { width, height } = img;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/png');
}

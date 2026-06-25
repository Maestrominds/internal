/**
 * Compresses an image file on the client side using HTML5 Canvas.
 * Resizes the image to a maximum width of 1200px and saves as a JPEG at 75% quality.
 *
 * @param {File} file - The original File object
 * @returns {Promise<File>} - A Promise that resolves to the compressed File object
 */
export function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file); // fallback to original if blob creation fails
            }
            // Create a new File object with the same name as original but jpeg type
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file); // fallback to original on error
    };
    reader.onerror = () => resolve(file); // fallback to original on error
  });
}

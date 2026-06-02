const sharp = require('sharp');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

/**
 * Compresses an image buffer with Sharp (WebP, quality 75, max 1200px wide)
 * then uploads to Cloudinary and returns { secure_url, public_id }
 */
async function compressAndUpload(fileBuffer, originalName, folder = 'reports') {
  // 1. Compress with Sharp → WebP
  const compressed = await sharp(fileBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  // 2. Upload compressed buffer to Cloudinary via stream
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readable = new Readable();
    readable.push(compressed);
    readable.push(null);
    readable.pipe(uploadStream);
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
}

/**
 * Delete an image from Cloudinary by public_id
 */
async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { compressAndUpload, deleteFromCloudinary };

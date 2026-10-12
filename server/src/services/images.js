import sharp from "sharp";

/**
 * Prepare an image for the AI:
 *   - Auto-rotate using EXIF
 *   - Resize so longest side is at most 1600px
 *   - Convert to JPEG quality 80
 *
 * This cuts token count roughly in half vs sending the raw photo.
 *
 * @param {Buffer} buffer - original image bytes
 * @returns {Promise<Buffer>} - JPEG bytes
 */
export async function prepareImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

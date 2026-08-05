import { v2 as cloudinary } from "cloudinary";

// CLOUDINARY_URL env var configures the SDK automatically; this call
// just ensures https delivery URLs.
cloudinary.config({ secure: true });

/**
 * Uploads an image buffer to Cloudinary and returns the secure URL.
 * folder: "codfest/logos" | "codfest/proofs"
 */
export async function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "image", transformation: [{ quality: "auto" }] },
        (err, res) => (err || !res ? reject(err) : resolve(res))
      )
      .end(buffer);
  });
  return result.secure_url;
}

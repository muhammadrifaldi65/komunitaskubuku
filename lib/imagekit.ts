import ImageKit from "imagekit";

export const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

export async function uploadImageBase64(base64: string, fileName: string, folder = "/bookclub/posts") {
  const result = await imagekit.upload({
    file: base64,
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId };
}

export async function deleteImage(fileId: string) {
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    console.error("Failed to delete image from ImageKit:", err);
  }
}

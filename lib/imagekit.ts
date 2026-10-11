import ImageKit from "imagekit";
import { toImageKitProxyPath } from "@/lib/media-url";

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
  return { url: toImageKitProxyPath(result.url), fileId: result.fileId };
}

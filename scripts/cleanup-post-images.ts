import { prisma } from "../lib/prisma";
import { imagekit } from "../lib/imagekit";

async function main() {
  const pending = await prisma.postImage.findMany({ where: { pendingDelete: true, postId: null } });
  let failures = 0;
  for (const asset of pending) {
    try {
      await imagekit.deleteFile(asset.fileId);
      await prisma.postImage.delete({ where: { fileId: asset.fileId } });
    } catch (error) {
      failures++;
      console.error(`Gagal menghapus ${asset.fileId}:`, error);
    }
  }
  console.log(`${pending.length - failures} gambar dibersihkan; ${failures} gagal.`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

CREATE TABLE "PostImage" (
  "fileId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "postId" TEXT,
  "pendingDelete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostImage_pkey" PRIMARY KEY ("fileId")
);
CREATE UNIQUE INDEX "PostImage_postId_key" ON "PostImage"("postId");
CREATE INDEX "PostImage_ownerId_postId_idx" ON "PostImage"("ownerId", "postId");
CREATE INDEX "PostImage_pendingDelete_idx" ON "PostImage"("pendingDelete");
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

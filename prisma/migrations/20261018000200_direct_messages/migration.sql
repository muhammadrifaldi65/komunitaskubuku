CREATE TABLE "DmThread" (
 "id" TEXT NOT NULL, "firstId" TEXT NOT NULL, "secondId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DmThread_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DmThread_ordered_pair" CHECK ("firstId" COLLATE "C" < "secondId" COLLATE "C"),
 CONSTRAINT "DmThread_firstId_fkey" FOREIGN KEY ("firstId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "DmThread_secondId_fkey" FOREIGN KEY ("secondId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DmThread_firstId_secondId_key" ON "DmThread"("firstId", "secondId");
CREATE INDEX "DmThread_firstId_updatedAt_id_idx" ON "DmThread"("firstId", "updatedAt", "id");
CREATE INDEX "DmThread_secondId_updatedAt_id_idx" ON "DmThread"("secondId", "updatedAt", "id");
CREATE TABLE "DmMessage" (
 "id" TEXT NOT NULL, "threadId" TEXT NOT NULL, "senderId" TEXT NOT NULL, "content" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "readAt" TIMESTAMP(3),
 CONSTRAINT "DmMessage_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DmMessage_content_length" CHECK (char_length("content") BETWEEN 1 AND 2000),
 CONSTRAINT "DmMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DmThread"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "DmMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DmMessage_threadId_createdAt_id_idx" ON "DmMessage"("threadId", "createdAt", "id");
CREATE INDEX "DmMessage_threadId_readAt_senderId_idx" ON "DmMessage"("threadId", "readAt", "senderId");

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommentClassification" AS ENUM ('QUESTION', 'PROBLEM', 'REQUEST', 'OPINION', 'THANKS', 'SPAM', 'OTHER');

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoTitle" TEXT,
    "channelTitle" TEXT,
    "thumbnailUrl" TEXT,
    "viewCount" TEXT,
    "commentCount" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "relevantComments" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQCluster" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "representativeQuestion" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FAQCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "youtubeCommentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "classification" "CommentClassification",
    "clusterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Analysis_youtubeVideoId_idx" ON "Analysis"("youtubeVideoId");

-- CreateIndex
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt");

-- CreateIndex
CREATE INDEX "FAQCluster_analysisId_idx" ON "FAQCluster"("analysisId");

-- CreateIndex
CREATE INDEX "Comment_analysisId_idx" ON "Comment"("analysisId");

-- CreateIndex
CREATE INDEX "Comment_clusterId_idx" ON "Comment"("clusterId");

-- CreateIndex
CREATE INDEX "Comment_classification_idx" ON "Comment"("classification");

-- AddForeignKey
ALTER TABLE "FAQCluster" ADD CONSTRAINT "FAQCluster_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "FAQCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

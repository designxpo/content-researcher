-- CreateTable
CREATE TABLE "CampaignCreative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "scriptId" TEXT,
    "platform" TEXT NOT NULL,
    "adType" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "primaryText" TEXT NOT NULL,
    "description" TEXT,
    "callToAction" TEXT NOT NULL,
    "targetAudience" TEXT,
    "landingPageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScoringWeightHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viewsWeight" REAL NOT NULL,
    "erWeight" REAL NOT NULL,
    "commentWeight" REAL NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "avgAccuracy" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PipelineSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "cronExpr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "autoScript" BOOLEAN NOT NULL DEFAULT false,
    "autoHooks" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VideoAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "visualHooks" TEXT,
    "pacing" TEXT,
    "textOnScreen" TEXT,
    "transitions" TEXT,
    "bRollStyle" TEXT,
    "colorPalette" TEXT,
    "thumbnailNotes" TEXT,
    "overallScore" REAL NOT NULL DEFAULT 0,
    "rawAnalysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

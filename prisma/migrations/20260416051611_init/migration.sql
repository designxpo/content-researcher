-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "postsFound" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ScrapedPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scrapeJobId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hookText" TEXT,
    "caption" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" REAL NOT NULL DEFAULT 0,
    "postDate" DATETIME,
    "transcript" TEXT,
    "thumbnailUrl" TEXT,
    "authorName" TEXT,
    "authorHandle" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScrapedPost_scrapeJobId_fkey" FOREIGN KEY ("scrapeJobId") REFERENCES "ScrapeJob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidatedTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scrapeJobId" TEXT,
    "topicName" TEXT NOT NULL,
    "description" TEXT,
    "score" REAL NOT NULL DEFAULT 0,
    "viewsWeight" REAL NOT NULL DEFAULT 0.40,
    "erWeight" REAL NOT NULL DEFAULT 0.35,
    "commentWeight" REAL NOT NULL DEFAULT 0.25,
    "cluster" TEXT,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "avgViews" REAL NOT NULL DEFAULT 0,
    "avgER" REAL NOT NULL DEFAULT 0,
    "avgComments" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ValidatedTopicPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    CONSTRAINT "ValidatedTopicPost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ValidatedTopic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ValidatedTopicPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ScrapedPost" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "sampleScripts" TEXT NOT NULL,
    "vocabulary" TEXT,
    "sentenceLength" TEXT NOT NULL DEFAULT 'medium',
    "energy" INTEGER NOT NULL DEFAULT 5,
    "formality" TEXT NOT NULL DEFAULT 'casual',
    "humor" INTEGER NOT NULL DEFAULT 3,
    "ctas" TEXT,
    "analysisResult" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GeneratedScript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "voiceProfileId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "selectedHookId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedScript_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ValidatedTopic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedScript_voiceProfileId_fkey" FOREIGN KEY ("voiceProfileId") REFERENCES "VoiceProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedHook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "hookText" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedHook_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "GeneratedScript" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "actualViews" INTEGER NOT NULL DEFAULT 0,
    "actualER" REAL NOT NULL DEFAULT 0,
    "actualComments" INTEGER NOT NULL DEFAULT 0,
    "actualLikes" INTEGER NOT NULL DEFAULT 0,
    "postedAt" DATETIME,
    "platform" TEXT,
    "postUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PerformanceLog_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "GeneratedScript" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceLog_scriptId_key" ON "PerformanceLog"("scriptId");

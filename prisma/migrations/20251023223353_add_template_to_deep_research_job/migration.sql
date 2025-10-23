-- CreateTable
CREATE TABLE "DeepResearchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'strategy',
    "result" TEXT,
    "error" TEXT,
    "toolCalls" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DeepResearchJob_responseId_key" ON "DeepResearchJob"("responseId");

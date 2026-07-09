-- CreateEnum
CREATE TYPE "OrgNodeMemberRole" AS ENUM ('RESPONSABLE', 'EQUIPO', 'APOYO', 'EXTERNO');

-- CreateEnum
CREATE TYPE "OrgReviewNoteStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterEnum
ALTER TYPE "EdgeType" ADD VALUE 'INFORMACION';

-- AlterTable
ALTER TABLE "OrgChart" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "competencies" JSONB,
ADD COLUMN     "evaluations" JSONB,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "potentialLevel" TEXT,
ADD COLUMN     "talentNotes" TEXT,
ADD COLUMN     "trainings" JSONB;

-- CreateTable
CREATE TABLE "OrgNodeMember" (
    "id" TEXT NOT NULL,
    "orgNodeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "OrgNodeMemberRole" NOT NULL DEFAULT 'EQUIPO',
    "roleTitle" TEXT,
    "weeklyHours" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgNodeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgReviewNote" (
    "id" TEXT NOT NULL,
    "orgChartId" TEXT NOT NULL,
    "nodeId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "OrgReviewNoteStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgReviewNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgNodeMember_orgNodeId_idx" ON "OrgNodeMember"("orgNodeId");

-- CreateIndex
CREATE INDEX "OrgNodeMember_personId_idx" ON "OrgNodeMember"("personId");

-- CreateIndex
CREATE INDEX "OrgReviewNote_orgChartId_idx" ON "OrgReviewNote"("orgChartId");

-- CreateIndex
CREATE INDEX "OrgReviewNote_nodeId_idx" ON "OrgReviewNote"("nodeId");

-- CreateIndex
CREATE INDEX "OrgEdge_orgChartId_idx" ON "OrgEdge"("orgChartId");

-- CreateIndex
CREATE INDEX "OrgEdge_sourceId_idx" ON "OrgEdge"("sourceId");

-- CreateIndex
CREATE INDEX "OrgEdge_targetId_idx" ON "OrgEdge"("targetId");

-- AddForeignKey
ALTER TABLE "OrgNodeMember" ADD CONSTRAINT "OrgNodeMember_orgNodeId_fkey" FOREIGN KEY ("orgNodeId") REFERENCES "OrgNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgNodeMember" ADD CONSTRAINT "OrgNodeMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgReviewNote" ADD CONSTRAINT "OrgReviewNote_orgChartId_fkey" FOREIGN KEY ("orgChartId") REFERENCES "OrgChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgReviewNote" ADD CONSTRAINT "OrgReviewNote_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "OrgNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

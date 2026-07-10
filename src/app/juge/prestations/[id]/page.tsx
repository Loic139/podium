import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { youtubeEmbedUrl } from "@/lib/youtube";
import JudgingPanel from "./JudgingPanel";

export default async function JudgingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("JUGE");
  const { id } = await params;

  const performance = await prisma.performance.findUnique({
    where: { id },
    include: {
      registration: {
        include: {
          gymnast: { include: { club: true } },
          category: true,
          competition: true,
        },
      },
      competitionApparatus: { include: { apparatus: true, round: true } },
      scores: {
        where: { judgeId: session.id },
        include: { deductions: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!performance || !performance.videoUrl) notFound();

  // Le juge doit être assigné à cet engin
  const assignment = await prisma.judgeAssignment.findUnique({
    where: {
      competitionId_judgeId_apparatusId: {
        competitionId: performance.registration.competitionId,
        judgeId: session.id,
        apparatusId: performance.competitionApparatus.apparatusId,
      },
    },
  });
  if (!assignment) redirect("/juge");

  // Déductions applicables à cet engin (ou globales)
  const deductionTypes = await prisma.deductionType.findMany({
    where: {
      active: true,
      OR: [
        { apparatus: { none: {} } },
        { apparatus: { some: { apparatusId: performance.competitionApparatus.apparatusId } } },
      ],
    },
    orderBy: { name: "asc" },
  });

  const locked = Boolean(performance.competitionApparatus.round?.validatedAt);
  const embed1 = youtubeEmbedUrl(performance.videoUrl);
  const embed2 = youtubeEmbedUrl(performance.videoUrl2);

  return (
    <div>
      <Link href="/juge" className="text-sm text-indigo-600 hover:underline">
        ← Prestations à juger
      </Link>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 mb-5">
        <h1 className="page-title">
          {performance.registration.gymnast.firstName}{" "}
          {performance.registration.gymnast.lastName}
        </h1>
        <span className="badge-indigo">{performance.competitionApparatus.apparatus.name}</span>
        <span className="badge-gray">{performance.registration.category.code}</span>
        <span className="text-sm text-slate-500">
          {performance.registration.gymnast.club.name} · {performance.registration.competition.name}
        </span>
      </div>

      <JudgingPanel
        performanceId={performance.id}
        embedUrl1={embed1!}
        embedUrl2={embed2}
        locked={locked}
        twoAttempts={performance.competitionApparatus.apparatus.twoAttempts}
        deductionTypes={deductionTypes.map((d) => ({
          id: d.id,
          name: d.name,
          value: Number(d.value),
          maxValue: d.maxValue ? Number(d.maxValue) : null,
        }))}
        existing={performance.scores.map((s) => ({
          attempt: s.attempt,
          value: Number(s.value),
          entryMode: s.entryMode,
          comment: s.comment,
          deductions: s.deductions.map((sd) => ({
            deductionTypeId: sd.deductionTypeId,
            value: Number(sd.value),
          })),
        }))}
      />
    </div>
  );
}

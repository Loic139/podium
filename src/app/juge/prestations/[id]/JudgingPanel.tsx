"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveScore, type ScoreState } from "@/lib/actions/juge";

type DeductionType = {
  id: string;
  name: string;
  value: number;
  maxValue: number | null;
};

type AppliedDeduction = {
  deductionTypeId: string | null;
  value: number;
  label: string;
};

export type ExistingScore = {
  attempt: number;
  value: number;
  entryMode: "DIRECT" | "DEDUCTIONS";
  comment: string | null;
  deductions: { deductionTypeId: string | null; value: number }[];
};

export default function JudgingPanel({
  performanceId,
  embedUrl1,
  embedUrl2,
  locked,
  twoAttempts,
  deductionTypes,
  existing,
}: {
  performanceId: string;
  embedUrl1: string;
  embedUrl2: string | null;
  locked: boolean;
  twoAttempts: boolean;
  deductionTypes: DeductionType[];
  existing: ExistingScore[];
}) {
  const [activeAttempt, setActiveAttempt] = useState(1);
  const router = useRouter();
  const iframe1 = useRef<HTMLIFrameElement>(null);
  const iframe2 = useRef<HTMLIFrameElement>(null);

  // Après une sauvegarde : passage restant du même gymnaste, sinon gymnaste
  // suivant, sinon retour à la liste. Court délai pour voir la confirmation.
  const handleSaved = useCallback(
    (state: ScoreState) => {
      if (state.nextAttempt) {
        setActiveAttempt(state.nextAttempt);
        return;
      }
      const t = setTimeout(() => {
        if (state.nextPerformanceId) {
          router.push(`/juge/prestations/${state.nextPerformanceId}`);
        } else if (state.nextPerformanceId === null) {
          router.push("/juge");
        }
      }, 700);
      return () => clearTimeout(t);
    },
    [router]
  );

  // Contrôle du player YouTube via l'API iframe (vitesse de lecture)
  const setPlaybackRate = (rate: number) => {
    for (const ref of [iframe1, iframe2]) {
      ref.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackRate", args: [rate] }),
        "*"
      );
    }
  };

  const attempts = twoAttempts ? [1, 2] : [1];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Vidéos */}
      <div className="lg:col-span-3 space-y-3">
        <div className="card overflow-hidden">
          {twoAttempts && (
            <div className="px-4 pt-3 text-sm font-medium text-slate-600">Saut 1</div>
          )}
          <iframe
            ref={iframe1}
            src={embedUrl1}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={twoAttempts ? "Vidéo du saut 1" : "Vidéo de la prestation"}
          />
        </div>
        {embedUrl2 && (
          <div className="card overflow-hidden">
            <div className="px-4 pt-3 text-sm font-medium text-slate-600">Saut 2</div>
            <iframe
              ref={iframe2}
              src={embedUrl2}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Vidéo du saut 2"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Vitesse :</span>
          {[0.25, 0.5, 1].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPlaybackRate(rate)}
              className="btn-secondary btn-sm"
            >
              {rate === 1 ? "Normale" : `${rate}×`}
            </button>
          ))}
        </div>
      </div>

      {/* Notation */}
      <div className="lg:col-span-2 space-y-4">
        {twoAttempts && (
          <div className="card-pad py-3">
            <div className="flex gap-2">
              {attempts.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setActiveAttempt(a)}
                  className={
                    activeAttempt === a
                      ? "btn bg-slate-900 text-white flex-1"
                      : "btn-secondary flex-1"
                  }
                >
                  Saut {a}
                  {existing.some((e) => e.attempt === a) && " ✓"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Note finale de l’engin = moyenne des deux sauts.
            </p>
          </div>
        )}

        {attempts.map((attempt) => (
          <div key={attempt} className={attempt === activeAttempt ? "" : "hidden"}>
            <ScoringBlock
              performanceId={performanceId}
              attempt={attempt}
              attemptLabel={twoAttempts ? `Saut ${attempt}` : null}
              active={attempt === activeAttempt}
              locked={locked}
              deductionTypes={deductionTypes}
              existing={existing.find((e) => e.attempt === attempt) ?? null}
              onSaved={handleSaved}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoringBlock({
  performanceId,
  attempt,
  attemptLabel,
  active,
  locked,
  deductionTypes,
  existing,
  onSaved,
}: {
  performanceId: string;
  attempt: number;
  attemptLabel: string | null;
  active: boolean;
  locked: boolean;
  deductionTypes: DeductionType[];
  existing: ExistingScore | null;
  onSaved: (state: ScoreState) => void;
}) {
  const [state, action, pending] = useActionState<ScoreState, FormData>(saveScore, {});

  useEffect(() => {
    if (state.success) onSaved(state);
  }, [state, onSaved]);
  const [mode, setMode] = useState<"DEDUCTIONS" | "DIRECT">(existing?.entryMode ?? "DEDUCTIONS");
  const [deductions, setDeductions] = useState<AppliedDeduction[]>(
    (existing?.deductions ?? []).map((d) => {
      const type = deductionTypes.find((t) => t.id === d.deductionTypeId);
      return {
        deductionTypeId: d.deductionTypeId,
        value: d.value,
        label: type?.name ?? `Déduction −${d.value.toFixed(1)}`,
      };
    })
  );
  const [directValue, setDirectValue] = useState(
    existing && existing.entryMode === "DIRECT" ? existing.value.toFixed(1) : ""
  );
  const [comment, setComment] = useState(existing?.comment ?? "");

  const totalDeduction = deductions.reduce((s, d) => s + d.value, 0);
  const computedScore = Math.max(0, Math.round((10 - totalDeduction) * 10) / 10);

  const addDeduction = useCallback(
    (value: number, deductionTypeId: string | null = null, label?: string) => {
      if (locked) return;
      const v = Math.round(value * 10) / 10;
      setDeductions((prev) => [
        ...prev,
        { deductionTypeId, value: v, label: label ?? `−${v.toFixed(1)}` },
      ]);
    },
    [locked]
  );

  const undoLast = useCallback(() => {
    setDeductions((prev) => prev.slice(0, -1));
  }, []);

  // Raccourcis clavier : 1 = −0.1, 2 = −0.2, 3 = −0.3, 0 = annuler la dernière.
  // Actif uniquement pour le passage affiché.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (mode !== "DEDUCTIONS" || locked) return;
      if (e.key === "1") addDeduction(0.1);
      else if (e.key === "2") addDeduction(0.2);
      else if (e.key === "3") addDeduction(0.3);
      else if (e.key === "0") undoLast();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, mode, locked, addDeduction, undoLast]);

  return (
    <div className="card-pad">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {attemptLabel && (
            <span className="badge-indigo">{attemptLabel}</span>
          )}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMode("DEDUCTIONS")}
              className={mode === "DEDUCTIONS" ? "btn btn-sm bg-slate-900 text-white" : "btn-secondary btn-sm"}
            >
              Déductions
            </button>
            <button
              type="button"
              onClick={() => setMode("DIRECT")}
              className={mode === "DIRECT" ? "btn btn-sm bg-slate-900 text-white" : "btn-secondary btn-sm"}
            >
              Note directe
            </button>
          </div>
        </div>
        {locked && <span className="badge-red">Verrouillé</span>}
      </div>

      {/* Note courante */}
      <div className="text-center mb-4">
        <div className="text-5xl font-bold tabular-nums text-slate-900">
          {mode === "DEDUCTIONS" ? computedScore.toFixed(1) : directValue || "–"}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {mode === "DEDUCTIONS"
            ? `Note de départ 10 − ${totalDeduction.toFixed(1)} de déductions`
            : "Note saisie directement"}
        </div>
      </div>

      {mode === "DEDUCTIONS" ? (
        <>
          {/* Déductions rapides (raccourcis 1/2/3, 0 pour annuler) */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[0.1, 0.2, 0.3].map((v, i) => (
              <button
                key={v}
                type="button"
                disabled={locked}
                onClick={() => addDeduction(v)}
                className="btn-secondary py-3 font-semibold tabular-nums"
                title={`Raccourci clavier : ${i + 1}`}
              >
                −{v.toFixed(1)}
                <span className="block text-[10px] text-slate-400 font-normal">
                  touche {i + 1}
                </span>
              </button>
            ))}
            <button
              type="button"
              disabled={locked || deductions.length === 0}
              onClick={undoLast}
              className="btn-secondary py-3"
              title="Raccourci clavier : 0"
            >
              ↩︎
              <span className="block text-[10px] text-slate-400 font-normal">
                touche 0
              </span>
            </button>
          </div>

          {/* Déductions typées */}
          <div className="space-y-1 mb-3 max-h-52 overflow-y-auto">
            {deductionTypes.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => addDeduction(t.value, t.id, t.name)}
                  className="btn-secondary btn-sm flex-1 justify-between"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="tabular-nums text-slate-500">
                    −{t.value.toFixed(1)}
                    {t.maxValue && ` à −${t.maxValue.toFixed(1)}`}
                  </span>
                </button>
                {t.maxValue && (
                  <>
                    {Array.from(
                      { length: Math.round((t.maxValue - t.value) * 10) },
                      (_, i) => Math.round((t.value + (i + 1) * 0.1) * 10) / 10
                    ).map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={locked}
                        onClick={() => addDeduction(v, t.id, t.name)}
                        className="btn-secondary btn-sm tabular-nums"
                      >
                        −{v.toFixed(1)}
                      </button>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Liste des déductions appliquées */}
          {deductions.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm">
              {deductions.map((d, i) => (
                <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                  <span className="truncate">{d.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-red-600">−{d.value.toFixed(1)}</span>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        setDeductions((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Supprimer cette déduction"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="mb-3">
          <label className="label">Note (0 à 10, au dixième)</label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={directValue}
            onChange={(e) => setDirectValue(e.target.value)}
            disabled={locked}
            className="input text-center text-lg font-semibold"
          />
        </div>
      )}

      {/* Commentaire interne */}
      <div className="mb-4">
        <label className="label">
          Commentaire interne{" "}
          <span className="text-xs text-slate-400 font-normal">(jamais public)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={locked}
          rows={2}
          className="input"
        />
      </div>

      {/* Sauvegarde */}
      <form action={action}>
        <input type="hidden" name="performanceId" value={performanceId} />
        <input type="hidden" name="attempt" value={attempt} />
        <input type="hidden" name="entryMode" value={mode} />
        <input type="hidden" name="value" value={directValue} />
        <input
          type="hidden"
          name="deductions"
          value={JSON.stringify(
            deductions.map((d) => ({
              deductionTypeId: d.deductionTypeId,
              value: d.value,
            }))
          )}
        />
        <input type="hidden" name="comment" value={comment} />
        {state.error && <p className="text-sm text-red-600 mb-2">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600 mb-2">{state.success}</p>}
        <button
          disabled={locked || pending || (mode === "DIRECT" && directValue === "")}
          className="btn-primary w-full"
        >
          {pending
            ? "Enregistrement…"
            : existing
              ? `Mettre à jour la note${attemptLabel ? ` du ${attemptLabel.toLowerCase()}` : ""}`
              : `Enregistrer la note${attemptLabel ? ` du ${attemptLabel.toLowerCase()}` : ""}`}
        </button>
      </form>
      {existing && !locked && (
        <p className="text-xs text-slate-400 mt-2 text-center">
          Modifiable tant que les résultats ne sont pas validés.
        </p>
      )}
    </div>
  );
}

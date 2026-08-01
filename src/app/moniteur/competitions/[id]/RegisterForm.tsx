"use client";

import { useActionState, useState } from "react";
import { registerGymnast, type ActionState } from "@/lib/actions/moniteur";

type GymnastOption = {
  id: string;
  firstName: string;
  lastName: string;
  categoryCode: string;
};

export default function RegisterForm({
  competitionId,
  gymnasts,
  ineligibleCount,
}: {
  competitionId: string;
  /** Uniquement les gymnastes éligibles (sexe + catégorie du concours) */
  gymnasts: GymnastOption[];
  ineligibleCount: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    registerGymnast,
    {}
  );
  const [gymnastId, setGymnastId] = useState(gymnasts[0]?.id ?? "");
  const selected = gymnasts.find((g) => g.id === gymnastId);

  return (
    <div className="space-y-3">
      {gymnasts.length === 0 ? (
        <p className="text-sm text-slate-400">
          Aucun gymnaste éligible à inscrire.
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="competitionId" value={competitionId} />
          <div>
            <label className="label">Gymnaste</label>
            <select
              name="gymnastId"
              className="input"
              required
              value={gymnastId}
              onChange={(e) => setGymnastId(e.target.value)}
            >
              {gymnasts.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.lastName} {g.firstName} — {g.categoryCode}
                </option>
              ))}
            </select>
            {selected && (
              <p className="text-xs text-slate-400 mt-1">
                Sera inscrit·e en catégorie <strong>{selected.categoryCode}</strong>{" "}
                (sa catégorie actuelle).
              </p>
            )}
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
          <button disabled={pending} className="btn-primary w-full">
            {pending ? "Inscription…" : "Inscrire"}
          </button>
        </form>
      )}
      {ineligibleCount > 0 && (
        <p className="text-xs text-amber-600">
          {ineligibleCount} gymnaste{ineligibleCount > 1 ? "s" : ""} de votre club{" "}
          {ineligibleCount > 1 ? "ne sont pas éligibles" : "n’est pas éligible"} à ce
          concours (sexe ou catégorie hors programme, ou non classé).
        </p>
      )}
    </div>
  );
}

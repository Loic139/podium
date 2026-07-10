"use client";

import { useActionState } from "react";
import { registerGymnast, type ActionState } from "@/lib/actions/moniteur";

export default function RegisterForm({
  competitionId,
  gymnasts,
  categories,
}: {
  competitionId: string;
  gymnasts: { id: string; firstName: string; lastName: string }[];
  categories: { id: string; code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    registerGymnast,
    {}
  );

  if (gymnasts.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Tous vos gymnastes sont déjà inscrits.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div>
        <label className="label">Gymnaste</label>
        <select name="gymnastId" className="input" required>
          {gymnasts.map((g) => (
            <option key={g.id} value={g.id}>
              {g.lastName} {g.firstName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Catégorie pour cette compétition</label>
        <select name="categoryId" className="input" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Inscription…" : "Inscrire"}
      </button>
    </form>
  );
}

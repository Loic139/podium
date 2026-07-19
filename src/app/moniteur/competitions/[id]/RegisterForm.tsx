"use client";

import { useActionState, useState } from "react";
import { registerGymnast, type ActionState } from "@/lib/actions/moniteur";

type GymnastOption = {
  id: string;
  firstName: string;
  lastName: string;
  /** Catégorie actuelle du gymnaste — présélectionnée si offerte ici */
  categoryId: string | null;
};

export default function RegisterForm({
  competitionId,
  gymnasts,
  categories,
}: {
  competitionId: string;
  gymnasts: GymnastOption[];
  categories: { id: string; code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    registerGymnast,
    {}
  );

  const defaultCategoryFor = (gymnastId: string) => {
    const g = gymnasts.find((x) => x.id === gymnastId);
    return g?.categoryId && categories.some((c) => c.id === g.categoryId)
      ? g.categoryId
      : categories[0]?.id ?? "";
  };

  const [gymnastId, setGymnastId] = useState(gymnasts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(
    gymnasts[0] ? defaultCategoryFor(gymnasts[0].id) : ""
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
        <select
          name="gymnastId"
          className="input"
          required
          value={gymnastId}
          onChange={(e) => {
            setGymnastId(e.target.value);
            setCategoryId(defaultCategoryFor(e.target.value));
          }}
        >
          {gymnasts.map((g) => (
            <option key={g.id} value={g.id}>
              {g.lastName} {g.firstName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Catégorie pour cette compétition</label>
        <select
          name="categoryId"
          className="input"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">
          Présélectionnée d’après la catégorie du gymnaste.
        </p>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Inscription…" : "Inscrire"}
      </button>
    </form>
  );
}

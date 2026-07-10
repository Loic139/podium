"use client";

import { useActionState } from "react";
import { submitVideo, type ActionState } from "@/lib/actions/moniteur";

export default function VideoForm({
  registrationId,
  competitionApparatusId,
  twoAttempts,
  currentUrl,
  currentUrl2,
}: {
  registrationId: string;
  competitionApparatusId: string;
  twoAttempts: boolean;
  currentUrl: string | null;
  currentUrl2: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    submitVideo,
    {}
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="competitionApparatusId" value={competitionApparatusId} />
      {twoAttempts ? (
        <>
          <div>
            <label className="text-xs text-slate-500">Saut 1</label>
            <input
              name="videoUrl"
              type="url"
              required
              defaultValue={currentUrl ?? ""}
              placeholder="https://www.youtube.com/watch?v=…"
              className="input"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Saut 2</label>
            <input
              name="videoUrl2"
              type="url"
              required
              defaultValue={currentUrl2 ?? ""}
              placeholder="https://www.youtube.com/watch?v=…"
              className="input"
            />
          </div>
        </>
      ) : (
        <input
          name="videoUrl"
          type="url"
          required
          defaultValue={currentUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=…"
          className="input"
        />
      )}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-600">{state.success}</p>}
      <button disabled={pending} className="btn-secondary btn-sm">
        {pending ? "Envoi…" : currentUrl ? "Modifier" : "Soumettre"}
      </button>
    </form>
  );
}

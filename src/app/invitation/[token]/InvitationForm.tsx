"use client";

import { useActionState } from "react";
import { acceptInvitation, type AuthState } from "@/lib/actions/auth";

export default function InvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    acceptInvitation,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Activation…" : "Activer mon compte"}
      </button>
    </form>
  );
}

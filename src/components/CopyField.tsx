"use client";

import { useState } from "react";

/** Champ en lecture seule avec bouton de copie — pour les liens d'invitation. */
export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Contexte non sécurisé ou permission refusée : sélectionne le champ
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.target.select()}
        className="input py-1 text-xs font-mono w-48"
      />
      <button type="button" onClick={copy} className="btn-secondary btn-sm shrink-0">
        {copied ? "Copié ✓" : "Copier"}
      </button>
    </span>
  );
}

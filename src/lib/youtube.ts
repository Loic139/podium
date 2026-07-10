/** Extrait l'identifiant d'une URL YouTube (watch, youtu.be, shorts, embed). */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function youtubeThumbnail(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

/** URL d'intégration avec l'API JS activée (contrôle vitesse/lecture). */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0` : null;
}

export function isValidYoutubeUrl(url: string): boolean {
  return youtubeId(url) !== null;
}

/**
 * Versão 2.33: os emotes da roda. Versão 2.41: são gestos do personagem (a mão dele faz o joinha,
 * o joinha para baixo, o dedo do meio, o aceno, as palmas; na risada ele ri), por pouco tempo, e
 * somem. Para não poluir: só um por cadeira de cada vez (o novo troca o anterior), um intervalo
 * mínimo entre dois de quem manda, e os bots só reagem no fim da rodada, de vez em quando.
 */

export const EMOTES = Object.freeze([
  Object.freeze({ id: 'joinha', label: 'Joinha' }),
  Object.freeze({ id: 'negativo', label: 'Joinha para baixo' }),
  Object.freeze({ id: 'dedo', label: 'Dedo do meio' }),
  Object.freeze({ id: 'aceno', label: 'Aceno' }),
  Object.freeze({ id: 'palmas', label: 'Palmas' }),
  Object.freeze({ id: 'risada', label: 'Risada' }),
]);

export const EMOTE_IDS = Object.freeze(EMOTES.map((e) => e.id));

/** O humor do rosto enquanto faz cada gesto (os humores que os retratos já têm). */
export const EMOTE_MOOD = Object.freeze({ joinha: 'smug', negativo: 'thinking', dedo: 'smug', aceno: 'idle', palmas: 'smug', risada: 'smug' });

/** Quanto tempo o emote fica na tela (o CSS usa o mesmo) e o intervalo mínimo entre dois. */
export const EMOTE_MS = 2600;
export const EMOTE_COOLDOWN_MS = 2900;

export const isEmote = (id) => EMOTE_IDS.includes(id);

/** O emote novo de `seat` (troca o anterior dela). `feed`: { [cadeira]: { id, key } }. */
export function pushEmote(feed, seat, id, key) {
  if (!isEmote(id) || typeof seat !== 'string') return feed;
  return { ...feed, [seat]: { id, key } };
}

/** Já pode mandar outro? (`last`: quando mandou o anterior) */
export const emoteReady = (last, now) => last == null || now - last >= EMOTE_COOLDOWN_MS;

/**
 * Os bots reagem ao fim da rodada (no máximo dois, e nem sempre): quem venceu faz joinha, bate
 * palmas ou ri; quem tomou dano faz o joinha para baixo (e, raramente, mostra o dedo).
 * `result`: o resultado da rodada (tableEngine).
 */
export function botReactions(result, seats, random = Math.random) {
  if (!result) return [];
  const bots = new Set(seats.filter((s) => s.bot).map((s) => s.id));
  const out = [];
  for (const id of result.winners ?? []) if (bots.has(id) && random() < 0.5) out.push({ seat: id, emote: ['joinha', 'palmas', 'risada'][Math.floor(random() * 3)] ?? 'joinha' });
  for (const id of Object.keys(result.damage ?? {})) if (bots.has(id) && random() < 0.3) out.push({ seat: id, emote: random() < 0.8 ? 'negativo' : 'dedo' });
  return out.slice(0, 2);
}

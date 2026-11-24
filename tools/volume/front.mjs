// O busto de frente de um personagem: a cabeça + o corpo + o objeto dele (ou o gesto), a luz e a
// passagem para pixel art.
import { M, acc, reset } from './kit.mjs';
import { faceOf, makeHead } from './head.mjs';
import { makeFrontBody } from './body.mjs';
import { norm } from './sdf.mjs';
import { rampsOf } from './cast.mjs';
import { PROPS, propRamps } from './props.mjs';

export const FW = 176;
export const FH = 168;
export const RAIL = 136;

/** `gesture`: { arms: [{ s, elbow, wrist, hand }], keepProp } (os braços do emote). */
export function frontCfg(P, mood = 'idle', gesture = null) {
  const head = makeHead(P);
  const prop = PROPS[P.key];
  const poses = {};
  const held = new Set((prop?.arms ?? []).map((a) => a.s));
  if (prop?.arms) for (const a of prop.arms) poses[a.s] = a;
  if (gesture) for (const a of gesture.arms) poses[a.s] = a;
  const showProp = prop && !(gesture && gesture.arms.some((a) => held.has(a.s)));
  const body = makeFrontBody(P, poses);
  const F = faceOf(P, mood);
  if (mood === 'talk' || mood === 'hurt' || mood === 'laugh') F.open = mood === 'hurt' ? [5.4, 2.6] : mood === 'laugh' ? [5.6, 2.8] : [4.4, 1.8];
  const scene = (x, y, z) => {
    reset();
    head.scene(x, y, z, false, F);
    body.scene(x, y, z);
    if (showProp) prop.scene(x, y, z);
    return acc.D;
  };
  return {
    W: FW,
    H: FH,
    scene,
    mat: () => acc.MAT,
    origin: (sx, sy) => [sx, sy, 95],
    dir: [0, 0, -1],
    maxT: 175,
    key: norm(-0.42, -0.6, 0.68),
    fill: norm(0.8, -0.15, 0.55),
    back: norm(0.62, -0.35, -0.7),
    w: { key: 1, fill: 0.2, back: 0.45, amb: 0.12 },
    steps: [0.11, 0.23, 0.39, 0.6, 0.86],
    smooth: 1.05,
    specMats: new Set([M.SKIN, M.EYE, M.HATB, M.NAIL, M.LIP, M.BUTTON, M.GOLD, M.SILVER, M.GLASSF, M.LENS, M.TIE, M.EARRING, M.P1, M.P3, M.P5, M.TEETH]),
    ramps: { ...rampsOf(P), ...propRamps(P.key) },
    edge: new Set([M.TOP, M.SHIRT, M.SKIN, M.CHEST, M.HAT, M.HAIR, M.BEARD, M.APRON, M.TOPB, M.SCARF, M.P1, M.P2, M.GOLD, M.SILVER]),
    soft: new Set([`${M.SKIN}-${M.CHEST}`, `${M.CHEST}-${M.SKIN}`, `${M.SKIN}-${M.LIP}`, `${M.LIP}-${M.SKIN}`, `${M.SKIN}-${M.EYE}`, `${M.SKIN}-${M.BROW}`, `${M.SKIN}-${M.NAIL}`, `${M.HAT}-${M.HATB}`, `${M.SKIN}-${M.BEARD}`, `${M.SKIN}-${M.STACHE}`]),
    litEdge: (x) => x < FW * 0.55,
    creaseMin: P.youth ? { [M.SKIN]: 1.4 } : undefined,
    head,
    body,
    F,
    showProp,
  };
}

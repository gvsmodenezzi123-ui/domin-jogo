// O elenco: a ficha de cada personagem (art/portraitSpecs.js) virando os parâmetros do modelo em
// volume e as rampas de cor de cada material. Ajustes à mão de cada um ficam em TWEAKS.
import { M, hex, ramp, toHex } from './kit.mjs';

const mixHex = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));

const HAT_BASE = { fedora: 41, panama: 41, cap: 47, police: 45.5, beanie: 50.5, helmet: 44.6, safari: 45, straw: 41, wide: 40, flatcap: 45.6, turban: 49.5, hood: 30 };

/** Ajustes de cada um (o que a ficha não diz). */
const AGE = {
  young: ['serginho', 'nelsinho', 'marquinhos', 'carlinhos', 'paulinho', 'soro', 'sofia', 'juvenal', 'valtinhoRenegado', 'cida'],
  old: ['tioZe', 'neide', 'arlindo', 'voJuca', 'odete', 'comendador', 'seuTiao', 'geraldo', 'bigode', 'zeca', 'genesio'],
};
const SMILE = { tonho: 0.8, serginho: 1, cida: 1.1, genesio: 0.9, bigode: 0.9, valtinho: 0.6, marquinhos: 0.7, voJuca: 0.6, neide: 0.6, odete: 0.4, soro: 0.8, sofia: 0.5, comendador: 0.5, arlindo: 0.6, baiano: 0.3, nelsinho: -0.4, geraldo: -0.6, juvenal: -0.2, valdir: -0.4 };

export const TWEAKS = {
  tioZe: { brow: 'tio', bags: 2.1 },
  neide: { hairLine: 2 },
  odete: { hairLine: 2 },
  bigode: { stache: 'gold' },
  comendador: { bags: 1.4 },
  donoDaNoite: { ear: 0.95 },
  sofia: { hairLine: 6 },
  soro: { hairLine: 6 },
  marquinhos: { ear: 1.05 },
};

export function paramsOf(key, spec) {
  const eyes = spec.eyes ?? 'plain';
  const P = {
    key,
    fem: Boolean(spec.fem),
    broad: Boolean(spec.broad),
    jaw: spec.jaw ?? 'square',
    nose: spec.nose === 'big' ? 'big' : spec.nose === 'hook' ? 'hook' : spec.fem ? 'fem' : 'mid',
    brow: spec.browShape ?? 'plain',
    thickBrows: Boolean(spec.thickBrows),
    lid: { tired: -2.3, sleepy: -0.4, narrow: 0, lashes: -3.4 }[eyes] ?? -3,
    lowLid: eyes === 'narrow' ? 2.6 : 3.6,
    bags: eyes === 'tired' ? 2.1 : eyes === 'sleepy' ? 1.5 : spec.wrinkles ? 1.7 : 0,
    lashes: eyes === 'lashes',
    eyes,
    hairStyle: spec.hair?.style ?? 'short',
    hat: spec.hat ? { ...spec.hat } : null,
    stache: spec.facial?.mustache ?? null,
    beard: spec.facial?.beard ?? null,
    stubble: Boolean(spec.facial?.stubble),
    glasses: spec.glasses ?? null,
    earrings: spec.earrings ?? null,
    smokes: spec.smokes ?? null,
    outfit: { ...(spec.outfit ?? { type: 'shirt', color: '#5a5a5a' }) },
    wrinkles: Boolean(spec.wrinkles),
    scar: Boolean(spec.scar),
    goldTooth: Boolean(spec.goldTooth),
    redEyes: Boolean(spec.redEyes),
    glow: spec.glow ?? null,
    rim: spec.rim ?? null,
    neon: spec.neon ?? null,
    blush: spec.blush ?? null,
    spec,
  };
  if (P.hat) P.hatBase = HAT_BASE[P.hat.type] ?? 99;
  if (P.hat && (P.hat.type === 'goggles' || P.hat.type === 'headband' || P.hat.type === 'crown')) P.hatBase = 0;
  if (P.stache === true) P.stache = 'big';
  if (P.outfit.type === 'shirt' && P.outfit.buttons) P.outfit.closed = true;
  // o cigarro: de frente no canto esquerdo da boca, de perfil para a frente
  P.cigFront = { a: [99.2, 94.4, 26.6], b: [111.6, 98.2, 32.8], c: [113.6, 98.8, 33.8], e: [114.2, 99, 34.1] };
  P.cigSide = { a: [83.2, 96.2, 25.4], b: [83.8, 100.4, 40.6], c: [83.9, 100.9, 42.6], e: [84, 101.1, 43.4] };
  P.age = AGE.young.includes(key) ? 'young' : AGE.old.includes(key) ? 'old' : 'adult';
  if (P.age === 'young') P.bags = Math.min(P.bags, 0.8);
  if (P.fem && P.age === 'young') {
    P.youth = true;
    P.bags = 0;
  }
  P.smile = SMILE[key] ?? 0;
  if (P.fem && P.brow === 'plain') P.brow = 'soft';
  Object.assign(P, TWEAKS[key] ?? {});
  return P;
}

/** As rampas de cada material deste personagem. */
export function rampsOf(P) {
  const s = P.spec;
  const o = P.outfit;
  const R = {};
  const skin = s.skin ?? '#d8a070';
  R[M.SKIN] = ramp(skin, 'skin');
  R[M.CHEST] = R[M.SKIN];
  R[M.SKIN2] = ramp(mixHex(skin, '#000000', 0.15), 'skin');
  R[M.LIP] = ramp(s.lip ?? mixHex(skin, '#a03a3a', 0.32), 'skin');
  R[M.EYE] = P.redEyes ? ramp('#2a0a0a', 'cloth') : [hex('#4a3c3e'), hex('#7a6664'), hex('#a89490'), hex('#ccbab4'), hex('#e2d6d0'), hex('#f2ebe6'), hex('#ffffff')];
  R[M.IRIS] = ramp(s.iris ?? '#5a3420', 'cloth');
  const hairC = s.hair?.color ?? s.facial?.color ?? '#2a1a10';
  R[M.HAIR] = ramp(hairC, 'hair');
  const facialC = s.facial?.color ?? hairC;
  R[M.STACHE] = P.stache === 'gold' ? ramp(facialC, 'metal') : ramp(facialC, 'hair');
  R[M.BEARD] = R[M.STACHE];
  R[M.BROW] = ramp(mixHex(facialC === '#e8e8e8' || facialC === '#f0f0f0' ? facialC : hairC, '#000000', 0.25), 'hair');
  const hatC = s.hat?.color ?? '#5a3a22';
  R[M.HAT] = ramp(hatC, s.hat?.type === 'straw' ? 'cloth' : 'cloth');
  R[M.HATB] = ramp(s.hat?.band ?? s.hat?.visor ?? mixHex(hatC, '#000000', 0.45), 'cloth');
  R[M.HATC] = ramp(s.hat?.emblem ?? '#ffffff', 'cloth');
  R[M.TOP] = ramp(o.color ?? '#5a5a5a', 'cloth');
  R[M.TOPB] = ramp(o.accent ?? o.collar ?? mixHex(o.color ?? '#5a5a5a', '#ffffff', 0.25), 'cloth');
  R[M.SHIRT] = ramp(o.shirt ?? '#f0f0f0', 'cloth');
  R[M.COLLAR] = ramp(o.type === 'cardigan' && o.jabot ? '#f4ece0' : o.collar ?? mixHex(o.color ?? '#5a5a5a', '#ffffff', 0.25), 'cloth');
  R[M.BUTTON] = ramp(o.type === 'uniform' && o.accent ? o.accent : '#b8ac9c', 'cloth');
  R[M.TIE] = ramp(o.tie ?? o.bow ?? '#a01a2a', 'cloth');
  R[M.APRON] = ramp(o.accent ?? '#f0f0f0', 'cloth');
  R[M.BOA] = ramp(o.boa ?? '#ff9ad8', 'cloth');
  R[M.SCARF] = ramp(o.scarf ?? '#c42a22', 'cloth');
  R[M.GOLD] = ramp('#e6c34a', 'metal');
  R[M.SILVER] = ramp('#eeeef4', 'cloth');
  R[M.GLASSF] = ramp(s.glasses?.color ?? '#3a3a3a', s.glasses?.type === 'gold' || s.glasses?.type === 'monocle' ? 'metal' : 'cloth');
  R[M.LENS] = ramp(P.hat?.type === 'goggles' ? '#6a9ac8' : '#a8c8d8', 'cloth');
  R[M.EARRING] = R[M.GOLD];
  R[M.CIG] = [hex('#6a645c'), hex('#9a948a'), hex('#c4beb2'), hex('#e2ddd2'), hex('#f2eee6'), hex('#faf8f2'), hex('#ffffff')];
  R[M.ASH] = [hex('#2a2626'), hex('#4a4444'), hex('#6a6262'), hex('#8a8282'), hex('#a8a0a0'), hex('#c0b8b8'), hex('#d8d0d0')];
  R[M.EMBER] = [hex('#6a1a0a'), hex('#a02a0a'), hex('#d8460e'), hex('#ff7a1a'), hex('#ffb040'), hex('#ffe08a'), hex('#fff6d0')];
  R[M.NAIL] = ramp(mixHex(skin, '#ffd8d0', 0.45), 'skin');
  R[M.TEETH] = [hex('#3a2a2a'), hex('#6a5a54'), hex('#9a8c80'), hex('#c8bcae'), hex('#e6ddd0'), hex('#f4eee4'), hex('#ffffff')];
  R[M.P4] = ramp('#7a4a24', 'cloth'); // o charuto
  R[M.P5] = ramp(s.hat?.type === 'turban' ? '#c83ad8' : s.hat?.type === 'crown' ? '#d02a3a' : '#f4f0e0', 'cloth');
  R[M.PACK] = ramp('#c03e28', 'cloth');
  return R;
}

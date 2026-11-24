// Os emotes em volume: os braços e as mãos de cada gesto (joinha, negativo, dedo, aceno, palmas,
// calma, risada), de frente (o busto) e de lado (sentado), quadro a quadro.
import { handFrame } from './hands.mjs';

// o rosto de cada gesto (como o antigo GESTURE_FACE): [humor, boca aberta]
export const GESTURE_FACE = { joinha: 'smug', negativo: 'smug', dedo: 'smug', aceno: 'idle', palmas: 'smug', calma: 'idle', risada: 'laugh' };
// quantos quadros diferentes cada gesto tem
// (versão 2.46: o joinha e o negativo bombeiam, o dedo treme, o aceno abana e a risada sacode)
export const GESTURE_N = { joinha: 2, negativo: 2, dedo: 2, aceno: 3, palmas: 3, calma: 4, risada: 2 };

const ELBOW = (s) => [88 + s * 62, 160, 22];
const K = 1.32;
const one = (s, wrist, fwd, palm, pose, k = K, elbow = ELBOW(s)) => ({ s, elbow, wrist, hand: { frame: handFrame(wrist, fwd, palm), pose, k, mirror: s > 0 } });

/** Os braços do gesto `id` no quadro `f`, de frente (s = 1: o braço à direita da tela). */
export function frontGesture(id, f = 0) {
  switch (id) {
    case 'joinha': {
      const dy = [0, 6][f % 2];
      return { arms: [one(1, [150, 108 + dy, 26], [-0.85, -0.35, 0.3], [0, 0, -1], 'thumbsUp', K, [162, 160, 8])] };
    }
    case 'dedo': {
      const d = [0, 1][f % 2];
      return { arms: [one(1, [142 + d * 3, 112 - d, 28 + d * 2], [-0.05 + d * 0.16, -1, 0.1], [0, 0, -1], 'middle', K, [156, 162, 12])] };
    }
    case 'negativo': {
      const dy = [0, 6][f % 2];
      return { arms: [one(1, [150, 110 + dy, 28], [-0.85, 0.2, 0.3], [0, 0, 1], 'thumbsUp', K, [162, 160, 8])] };
    }
    case 'aceno': {
      // a mão abanando: no meio, para um lado e para o outro
      const t = [0, -1, 1][f % 3];
      return { arms: [one(1, [148 + t * 3, 104 + Math.abs(t), 22], [0.12 + t * 0.45, -1, 0.05], [0, 0, 1], 'wave', K, [160, 158, 14])] };
    }
    case 'palmas': {
      const gap = [9, 5, 0][f % 3];
      return {
        arms: [one(1, [95 + gap, 152, 30], [-0.22, -1, 0.2], [-1, 0, -0.15], 'open', 1.2, [118, 190, 18]), one(-1, [81 - gap, 152, 30], [0.22, -1, 0.2], [1, 0, -0.15], 'open', 1.2, [58, 190, 18])],
      };
    }
    case 'calma': {
      const dy = [0, 2, 5, 2][f % 4];
      return {
        arms: [one(1, [136, 116 + dy, 28], [0.45, -0.85, 0.25], [0.1, 0.5, 1], 'open', 1.22, [148, 166, 22]), one(-1, [40, 116 + dy, 28], [-0.45, -0.85, 0.25], [-0.1, 0.5, 1], 'open', 1.22, [28, 166, 22])],
      };
    }
    case 'risada': {
      const dy = [0, 3][f % 2];
      return { arms: [one(1, [114, 140 + dy, 20], [-0.7, -0.6, 0.15], [0.1, 0, -1], 'chest', 1.22, [140, 170 + dy, 10])] };
    }
    default:
      return null;
  }
}

/** De lado (sentado, olhando para a direita): o braço de cá erguido; nas palmas a mão de lá também. */
export function sideGesture(id, f = 0) {
  const K2 = 1.12;
  const H = (wrist, fwd, palm, pose, mirror = false, k = K2) => ({ frame: handFrame(wrist, fwd, palm), pose, k, mirror });
  const arm = (elbow, wrist, hands) => ({ elbow, wrist, hands });
  switch (id) {
    case 'joinha': {
      const dy = [0, 6][f % 2];
      return arm([54, 176, 4], [56, 140 + dy, 30], [H([56, 140 + dy, 30], [0, -0.3, 1], [1, 0, 0], 'thumbsUp')]);
    }
    case 'dedo': {
      const d = [0, 1][f % 2];
      return arm([54, 176, 4], [56, 140 - d, 30 + d * 3], [H([56, 140 - d, 30 + d * 3], [0, -1, 0.25 + d * 0.2], [0, -0.2, -1], 'middle')]);
    }
    case 'negativo': {
      const dy = [0, 6][f % 2];
      return arm([54, 176, 4], [56, 142 + dy, 32], [H([56, 142 + dy, 32], [0, 0.3, 1], [-1, 0, 0], 'thumbsUp')]);
    }
    case 'aceno': {
      // de lado, a mão abana para a frente e volta (sem tapar a boca)
      const z = [26, 26.6, 28.4][f % 3];
      const tilt = [0.2, -0.04, 0.62][f % 3];
      return arm([54, 168, 8], [56, 124 + (f % 3 ? 1 : 0), z], [H([56, 124 + (f % 3 ? 1 : 0), z], [0, -1, tilt], [-1, 0, 0.2], 'wave')]);
    }
    case 'palmas': {
      const gap = [8, 4, 0][f % 3];
      return arm([54, 176, 14], [60, 160, 40], [H([60, 160, 40 - gap], [0.15, -1, 0.45], [0.2, 0, 1], 'open'), H([80, 160, 52 + gap], [-0.15, -1, 0.35], [-0.2, 0, -1], 'open', true)]);
    }
    case 'calma': {
      const dy = [0, 2, 5, 2][f % 4];
      return arm([54, 178, 12], [58, 156 + dy, 42], [H([58, 156 + dy, 42], [0, -0.55, 1], [-0.2, 0.8, 0.4], 'open')]);
    }
    case 'risada': {
      const dy = [0, 3][f % 2];
      return arm([52, 182 + dy, -6], [64, 170 + dy, 16], [H([64, 170 + dy, 16], [0.25, -0.8, 0.5], [0.15, 0.1, -1], 'chest')]);
    }
    default:
      return null;
  }
}

// Quem desenha a abertura: escolhe a cena pelo tempo, faz as passagens entre elas e aplica o
// acabamento. `render(t)` é puro: o mesmo t dá o mesmo quadro (no jogo roda com o relógio;
// no vídeo de divulgação, quadro a quadro).
import { BAR_LEN, SPEECH, SPEECH_AT, SPEECH_CHAR, buildBar } from './bar.js';
import { DOOR_LEN, buildDoor } from './door.js';
import { LOGO_HIT, LOGO_LEN, buildLogo } from './logo.js';
import { SLAM_DARK, SLAM_HIT, SLAM_LEN, buildSlam } from './slam.js';
import { DESIGN_H, DESIGN_W, fill, grain } from './stage.js';
import { STREET_END, buildStreet } from './street.js';

/** Linha do tempo da cena (s, depois da tela preta): [começo, fim] de cada tomada. */
const DOOR_AT = STREET_END - 0.13;
const BAR_AT = DOOR_AT + DOOR_LEN - 0.02;
const SLAM_AT = BAR_AT + BAR_LEN;
const LOGO_AT = SLAM_AT + SLAM_LEN + 0.22;
export const SHOTS = {
  street: [0, STREET_END],
  door: [DOOR_AT, DOOR_AT + DOOR_LEN],
  bar: [BAR_AT, SLAM_AT],
  slam: [SLAM_AT, SLAM_AT + SLAM_LEN],
  logo: [LOGO_AT, LOGO_AT + LOGO_LEN],
};
export const SCENE_SECONDS = LOGO_AT + LOGO_LEN;

/** Os momentos que o som precisa acertar (s, na cena). */
export const BEATS = {
  thunder: 0.08,
  neonOn: 0.52,
  coinUp: 1.0,
  coinCatch: 1.62,
  curtain: DOOR_AT + 0.28,
  inside: BAR_AT,
  speech: BAR_AT + SPEECH_AT,
  speechChar: SPEECH_CHAR,
  speechText: SPEECH,
  raise: BAR_AT + 2.42,
  slam: SLAM_AT + SLAM_HIT,
  dark: SLAM_AT + SLAM_DARK,
  lampOn: LOGO_AT + 0.04,
  logo: LOGO_AT + LOGO_HIT,
  end: SCENE_SECONDS,
};

export function createIntroRenderer(canvas, sprites, { reduced = false } = {}) {
  const out = canvas.getContext('2d', { alpha: false });
  const street = buildStreet(sprites);
  const door = buildDoor(sprites);
  const bar = buildBar(sprites);
  const slam = buildSlam(sprites);
  const logo = buildLogo(sprites);

  const frameInfo = (t) => {
    const W = canvas.width;
    const H = canvas.height;
    return { out, W, H, s: Math.min(W / DESIGN_W, H / DESIGN_H), t, reduced };
  };
  const inShot = (T, [a, b]) => T >= a && T < b;
  let buffer = null;
  const bufferFor = (F) => {
    if (!buffer || buffer.width !== F.W || buffer.height !== F.H) {
      buffer = document.createElement('canvas');
      buffer.width = F.W;
      buffer.height = F.H;
    }
    return buffer;
  };

  /** `target`: onde a tela inicial tem a lâmpada e o logo (para o último quadro casar). */
  const render = (T, { target = null, hold = false } = {}) => {
    const F = frameInfo(T);
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.globalAlpha = 1;
    out.globalCompositeOperation = 'source-over';
    out.imageSmoothingEnabled = false;
    out.fillStyle = '#000';
    out.fillRect(0, 0, F.W, F.H);
    if (inShot(T, SHOTS.street)) street.draw({ ...F, t: T - SHOTS.street[0] });
    if (inShot(T, SHOTS.door)) {
      // a porta entra por cima da rua num corte rápido (a rua já está colada na porta)
      const k = Math.min(1, (T - SHOTS.door[0]) / 0.12);
      if (k < 1) {
        const buf = bufferFor(F);
        const bg = buf.getContext('2d');
        bg.setTransform(1, 0, 0, 1, 0, 0);
        bg.globalAlpha = 1;
        bg.globalCompositeOperation = 'source-over';
        bg.imageSmoothingEnabled = false;
        door.draw({ ...F, out: bg, t: T - SHOTS.door[0] });
        out.globalAlpha = k;
        out.drawImage(buf, 0, 0);
        out.globalAlpha = 1;
      } else door.draw({ ...F, t: T - SHOTS.door[0] });
    }
    if (inShot(T, SHOTS.bar)) bar.draw({ ...F, t: T - SHOTS.bar[0] });
    if (inShot(T, SHOTS.slam)) slam.draw({ ...F, t: T - SHOTS.slam[0] });
    if (T >= SHOTS.logo[0]) logo.draw({ ...F, t: Math.min(T - SHOTS.logo[0], hold ? 99 : LOGO_LEN) }, target);
    grain(out, F, T, 0.06);
    // dentro da tela preta (antes da cena) e entre o apagão e a lâmpada: preto
    if (T < 0) fill(out, F, '#000', 1);
  };

  return { render, logoLayout: (W, H, target) => logo.layout(W, H, target) };
}

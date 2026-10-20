import PixelSprite from './PixelSprite.jsx';
import {
  COIN,
  COIN_PALETTE,
  EYE,
  EYE_PALETTE,
  HEART_BROKEN,
  HEART_FULL,
  HEART_PALETTE,
  LAMP,
  LAMP_PALETTE,
  MENU_ICON,
  SPEAKER_OFF,
  SPEAKER_ON,
  SPEAKER_PALETTE,
} from './sprites.js';

/**
 * Ícones de interface num tamanho em px. Ponto único de troca: o resto do
 * jogo pede `<CoinGlyph size={12} />` e não sabe de que arte ele vem.
 */
const sprite = (rows, palette, size, className) => (
  <PixelSprite rows={rows} palette={palette} pixel={size / Math.max(rows.length, rows[0].length)} className={className} />
);

export function CoinGlyph({ size = 14, className = '' }) {
  return sprite(COIN, COIN_PALETTE, size, className);
}

export function HeartGlyph({ size = 14, broken = false, className = '' }) {
  return sprite(broken ? HEART_BROKEN : HEART_FULL, HEART_PALETTE, size, className);
}

export function SpeakerGlyph({ size = 18, muted = false, className = '' }) {
  return sprite(muted ? SPEAKER_OFF : SPEAKER_ON, SPEAKER_PALETTE, size, className);
}

export function MenuGlyph({ size = 18, className = '' }) {
  return sprite(MENU_ICON, SPEAKER_PALETTE, size, className);
}

export function LampGlyph({ size = 40, className = '' }) {
  return sprite(LAMP, LAMP_PALETTE, size, className);
}

export function EyeGlyph({ size = 14, className = '' }) {
  return sprite(EYE, EYE_PALETTE, size, className);
}

import PixelSprite from './PixelSprite.jsx';
import { COIN, COIN_PALETTE } from './sprites.js';

export default function CoinCount({ value, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 font-pixel text-[10px] text-brass-300 ${className}`}>
      <PixelSprite rows={COIN} palette={COIN_PALETTE} pixel={2} />
      <span aria-label={`${value} moedas`}>${value}</span>
    </span>
  );
}

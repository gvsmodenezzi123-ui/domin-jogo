import { CoinGlyph } from './UiGlyphs.jsx';

export default function CoinCount({ value, className = '', target, size = 14 }) {
  return (
    <span data-coin-target={target} className={`inline-flex items-center gap-1 font-pixel text-[10px] text-brass-300 ${className}`}>
      <CoinGlyph size={size} />
      <span aria-label={`${value} moedas`}>${value}</span>
    </span>
  );
}

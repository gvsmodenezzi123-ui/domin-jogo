// Contêiner de Card com Relevo Mecânico: borda na cor da raridade, chanfro
// embaixo e afunda quando o polegar aperta (loja, Livro de Boteco, menus).
//
// AJUSTE: aceita as raridades do jogo (comum, raro, lendario, mitico), um tom
// neutro para o que não tem raridade, a tag (`as`, ex.: 'li') e os outros
// atributos (toque longo, estilo, aria).

const RARITY_ALIASES = { comum: 'common', raro: 'rare', lendario: 'legendary', mitico: 'mythic' };

export const RetroCard = ({ children, rarity = 'common', className = '', as: Tag = 'div', ...rest }) => {
  const borderColors = {
    common: 'border-emerald-600 bg-zinc-900 shadow-[0_4px_0_#064e3b]',
    rare: 'border-sky-500 bg-zinc-900 shadow-[0_4px_0_#0369a1]',
    legendary: 'border-purple-500 bg-zinc-900 shadow-[0_4px_0_#581c87]',
    mythic: 'border-amber-400 bg-zinc-950 shadow-[0_4px_0_#78350f]',
    neutral: 'border-zinc-600 bg-zinc-900 shadow-[0_4px_0_#27272a]',
  };
  const tone = borderColors[RARITY_ALIASES[rarity] ?? rarity] ?? borderColors.neutral;

  return (
    <Tag className={`border-2 rounded-lg p-2.5 transition-transform active:translate-y-1 active:shadow-none ${tone} ${className}`} {...rest}>
      {children}
    </Tag>
  );
};

export default RetroCard;

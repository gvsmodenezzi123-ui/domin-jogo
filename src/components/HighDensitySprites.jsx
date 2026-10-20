// src/components/HighDensitySprites.jsx
// Sprites vetoriais de alta densidade (40x40) com sombreamento em camadas.
//
// Ajustes em relação ao código original (marcados com "AJUSTE"):
//   - className={className} (com aspas, o tamanho nunca era aplicado);
//   - sem `import React` (o JSX novo não precisa e o lint acusa variável sem uso);
//   - o Tio Zé ganhou os 4 humores que o jogo usa (idle, thinking, smug, hurt);
//   - os mapas que ligam os ids de data/ a cada desenho ficam em artRegistry.js.

// Renderizador com crispEdges para manter a estética pixel art nítida e sem borrão
const PixelSvg = ({ viewBox = '0 0 40 40', className = '', children }) => (
  <svg viewBox={viewBox} className={`${className} inline-block select-none`} style={{ shapeRendering: 'crispEdges' }} aria-hidden="true">
    {children}
  </svg>
);

/** Olhos do Tio Zé por humor (pupilas, brilho e pálpebras). */
function TioZeEyes({ mood }) {
  if (mood === 'hurt') {
    // AJUSTE: olhos em X de dor
    return (
      <>
        <rect x="13" y="19" width="1" height="1" fill="#111" />
        <rect x="14" y="20" width="1" height="1" fill="#111" />
        <rect x="15" y="21" width="1" height="1" fill="#111" />
        <rect x="15" y="19" width="1" height="1" fill="#111" />
        <rect x="13" y="21" width="1" height="1" fill="#111" />
        <rect x="24" y="19" width="1" height="1" fill="#111" />
        <rect x="25" y="20" width="1" height="1" fill="#111" />
        <rect x="26" y="21" width="1" height="1" fill="#111" />
        <rect x="26" y="19" width="1" height="1" fill="#111" />
        <rect x="24" y="21" width="1" height="1" fill="#111" />
      </>
    );
  }
  // pensando: olha para cima; debochado: pálpebra caída
  const y = mood === 'thinking' ? 18 : 19;
  return (
    <>
      <rect x="13" y={y} width="3" height="3" fill="#111" /> {/* Pupila esq */}
      <rect x="14" y={y} width="1" height="1" fill="#fff" /> {/* Brilho esq */}
      <rect x="24" y={y} width="3" height="3" fill="#111" /> {/* Pupila dir */}
      <rect x="25" y={y} width="1" height="1" fill="#fff" /> {/* Brilho dir */}
      {mood === 'smug' && (
        <>
          <rect x="13" y="19" width="3" height="1" fill="#a46d42" />
          <rect x="24" y="19" width="3" height="1" fill="#a46d42" />
        </>
      )}
    </>
  );
}

/** Boca por humor; falando, abre e fecha a cada letra. */
function TioZeMouth({ mood, isSpeaking }) {
  if (mood === 'hurt') {
    // AJUSTE: careta de dor com um fio de sangue
    return (
      <>
        <rect x="15" y="27" width="9" height="3" fill="#220b0b" />
        <rect x="16" y="27" width="2" height="1" fill="#efe3c2" />
        <rect x="21" y="30" width="1" height="2" fill="#c8261d" />
      </>
    );
  }
  if (isSpeaking) return <rect x="16" y="27" width="8" height="4" fill="#220b0b" />;
  if (mood === 'smug') {
    // AJUSTE: sorriso torto com o dente de ouro
    return (
      <>
        <rect x="16" y="28" width="8" height="2" fill="#442111" />
        <rect x="15" y="27" width="2" height="1" fill="#442111" />
        <rect x="18" y="28" width="1" height="1" fill="#d9a441" />
      </>
    );
  }
  return <rect x="16" y="28" width="8" height="2" fill="#442111" />;
}

// 1. TIO ZÉ (40x40) - Detalhes: Quepe com costura, olhos expressivos, cigarro aceso com brasa viva, rugas e barba por fazer
export const TioZeAvatar = ({ className = 'w-12 h-12', isSpeaking = false, mood = 'idle' }) => (
  <PixelSvg className={className} viewBox="0 0 40 40">
    {/* Fundo de sombra da silhueta */}
    <rect x="6" y="4" width="28" height="34" fill="#090a0f" />

    {/* Quepe de Malandro / Boina */}
    <rect x="8" y="6" width="24" height="8" fill="#3f271a" />
    <rect x="6" y="10" width="28" height="4" fill="#5c3a26" />
    <rect x="6" y="13" width="28" height="2" fill="#24140b" />
    <rect x="10" y="8" width="20" height="2" fill="#784c32" /> {/* Luz do quepe */}

    {/* Rosto / Tom de Pele com Sombreamento Triplo */}
    <rect x="10" y="14" width="20" height="18" fill="#d49b6a" />
    <rect x="10" y="14" width="2" height="18" fill="#a46d42" /> {/* Sombra esquerda */}
    <rect x="28" y="14" width="2" height="18" fill="#754b2a" /> {/* Sombra direita oclusão */}

    {/* Olhos e Rugas */}
    <rect x="11" y={mood === 'thinking' ? 15 : 16} width="6" height="2" fill="#54371f" /> {/* Sobrancelha esq */}
    <rect x="23" y={mood === 'smug' ? 15 : 16} width="6" height="2" fill="#54371f" /> {/* Sobrancelha dir */}
    <TioZeEyes mood={mood} />
    <rect x="12" y="23" width="16" height="1" fill="#9b683e" /> {/* Linha de expressão */}

    {/* Nariz com Profundidade */}
    <rect x="18" y="20" width="4" height="4" fill="#b87e4f" />
    <rect x="18" y="24" width="4" height="1" fill="#663e1e" />

    {/* Barba cerrada / Sombra de 5 horas */}
    <rect x="12" y="25" width="16" height="7" fill="#8f5d37" opacity="0.6" />

    {/* Boca / Animação Vocal */}
    <TioZeMouth mood={mood} isSpeaking={isSpeaking} />

    {/* Cigarro de Palha Aceso e Brasa (AJUSTE: ferido, o cigarro cai da boca) */}
    {mood !== 'hurt' && (
      <>
        <rect x="22" y="27" width="12" height="3" fill="#f4ece1" />
        <rect x="22" y="29" width="12" height="1" fill="#a39687" /> {/* Sombra do cigarro */}
        <rect x="34" y="27" width="3" height="3" fill="#ea580c" /> {/* Brasa Laranja */}
        <rect x="36" y="28" width="1" height="1" fill="#fef08a" /> {/* Ponto Amarelo Incandescente */}
      </>
    )}

    {/* Colarinho de Camisa e Casaco */}
    <rect x="8" y="32" width="24" height="8" fill="#1c1917" />
    <rect x="15" y="32" width="10" height="5" fill="#e7e5e4" />
    <rect x="18" y="32" width="4" height="6" fill="#78350f" /> {/* Gravata gasta */}
  </PixelSvg>
);


// 2. TALISMÃ: CANECA DE CHOPP TRINCADA (40x40)
export const CanecaChoppIcon = ({ className = 'w-10 h-10' }) => (
  <PixelSvg className={className} viewBox="0 0 40 40">
    {/* Vidro da Caneca com Brilho e Reflexo */}
    <rect x="10" y="14" width="16" height="20" fill="#0284c7" opacity="0.8" />
    <rect x="12" y="16" width="3" height="16" fill="#e0f2fe" opacity="0.7" /> {/* Reflexo especular */}
    <rect x="8" y="13" width="20" height="22" fill="none" stroke="#0f172a" strokeWidth="2" />

    {/* Asa da Caneca */}
    <path d="M26 18 H32 V28 H26" fill="none" stroke="#0f172a" strokeWidth="3" />
    <path d="M26 20 H30 V26 H26" fill="none" stroke="#38bdf8" strokeWidth="1" />

    {/* Chopp Dourado / Cerveja */}
    <rect x="11" y="20" width="14" height="13" fill="#f59e0b" />
    <rect x="11" y="20" width="14" height="4" fill="#fbbf24" />
    {/* Bolhas subindo */}
    <rect x="14" y="26" width="1" height="1" fill="#fef3c7" />
    <rect x="19" y="24" width="1" height="1" fill="#fef3c7" />
    <rect x="16" y="30" width="1" height="1" fill="#fef3c7" />

    {/* Colarinho de Espuma Transbordando em Pixel Art */}
    <rect x="8" y="10" width="20" height="6" fill="#f8fafc" />
    <rect x="6" y="12" width="4" height="5" fill="#f8fafc" /> {/* Espuma escorrendo esq */}
    <rect x="22" y="13" width="4" height="6" fill="#f8fafc" /> {/* Espuma escorrendo dir */}
    <rect x="10" y="9" width="16" height="2" fill="#e2e8f0" /> {/* Sombra de topo */}

    {/* Trincado de Vidro no Meio */}
    <path d="M15 18 L18 22 L16 26" stroke="#0f172a" strokeWidth="1" fill="none" />
  </PixelSvg>
);

// 3. TALISMÃ: DADO VICIADO DE BOTECO (40x40)
export const DadoViciadoIcon = ({ className = 'w-10 h-10' }) => (
  <PixelSvg className={className} viewBox="0 0 40 40">
    {/* Sombra de Chão */}
    <ellipse cx="20" cy="34" rx="14" ry="3" fill="#000" opacity="0.5" />

    {/* Face Superior do Dado (Iluminada) */}
    <polygon points="20,6 32,13 20,20 8,13" fill="#fef3c7" stroke="#1c1917" strokeWidth="1.5" />
    {/* Pips Superior (Número 3) */}
    <circle cx="20" cy="13" r="1.5" fill="#dc2626" />
    <circle cx="15" cy="10" r="1.2" fill="#1c1917" />
    <circle cx="25" cy="16" r="1.2" fill="#1c1917" />

    {/* Face Esquerda (Meia-Sombra) */}
    <polygon points="8,13 20,20 20,32 8,25" fill="#d97706" stroke="#1c1917" strokeWidth="1.5" />
    {/* Pips Esquerda (Número 6) */}
    <circle cx="12" cy="18" r="1.2" fill="#1c1917" />
    <circle cx="16" cy="20" r="1.2" fill="#1c1917" />
    <circle cx="12" cy="23" r="1.2" fill="#1c1917" />
    <circle cx="16" cy="25" r="1.2" fill="#1c1917" />
    <circle cx="12" cy="28" r="1.2" fill="#1c1917" />
    <circle cx="16" cy="30" r="1.2" fill="#1c1917" />

    {/* Face Direita (Sombra Forte) */}
    <polygon points="20,20 32,13 32,25 20,32" fill="#92400e" stroke="#1c1917" strokeWidth="1.5" />
    {/* Pips Direita (Número 5) */}
    <circle cx="24" cy="18" r="1.2" fill="#1c1917" />
    <circle cx="28" cy="16" r="1.2" fill="#1c1917" />
    <circle cx="26" cy="24" r="1.2" fill="#1c1917" />
    <circle cx="24" cy="29" r="1.2" fill="#1c1917" />
    <circle cx="28" cy="27" r="1.2" fill="#1c1917" />

    {/* Fumaça Mística / Malandragem saindo do topo */}
    <path d="M18 6 Q16 2 20 0 Q24 2 21 5" fill="none" stroke="#a8a29e" strokeWidth="1" strokeDasharray="1,1" />
  </PixelSvg>
);

// 4. TALISMÃ: OLHO DE VIDRO ENCANTADO (40x40)
export const OlhoVidroIcon = ({ className = 'w-10 h-10' }) => (
  <PixelSvg className={className} viewBox="0 0 40 40">
    {/* Frasco / Anel de Suporte */}
    <rect x="6" y="6" width="28" height="28" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
    <circle cx="20" cy="20" r="11" fill="#f4f4f5" stroke="#09090b" strokeWidth="2" />

    {/* Veias Vermelhas no Esclera */}
    <path d="M11 16 Q14 18 13 22" stroke="#ef4444" strokeWidth="0.8" fill="none" />
    <path d="M28 15 Q26 19 29 23" stroke="#ef4444" strokeWidth="0.8" fill="none" />

    {/* Íris Mística Azul/Ciano com Gradiente */}
    <circle cx="20" cy="20" r="6" fill="#0284c7" />
    <circle cx="20" cy="20" r="4" fill="#38bdf8" />
    {/* Pupila em Fenda Arcana */}
    <ellipse cx="20" cy="20" rx="1.5" ry="4" fill="#09090b" />
    {/* Brilho Vitrificado / Specular */}
    <circle cx="18" cy="17" r="1.8" fill="#ffffff" />
  </PixelSvg>
);

// src/components/art/RivalsRegion1.jsx
// Retratos de alta densidade (40x40) dos rivais da Região 1 — "Boteco da Esquina".
//
// Mesmo enquadramento do TioZeAvatar (HighDensitySprites.jsx): busto de frente, cabeça
// em y 4–32, roupa nas linhas 32–40 e silhueta escura atrás da cabeça. Sombreamento
// triplo à mão (luz da lâmpada vinda de cima/esquerda, tom base, sombra/oclusão).
// Cada retrato tem os 4 humores do jogo (idle, thinking, smug, hurt) e abre a boca
// quando `isSpeaking` (menos quando está ferido).

import { PixelSvg } from './PixelSvg.jsx';

// ---------------------------------------------------------------------------
// 1. TONHO DO GÁS — "Entrega em 10 Minutos" (cobalto)
// ---------------------------------------------------------------------------

/** Olhos arregalados e sobrancelhas do Tonho por humor. */
function TonhoEyes({ mood }) {
  if (mood === 'thinking') {
    return (
      <>
      {/* Sobrancelhas */}
      <rect x="23" y="15" width="5" height="1" fill="#3e2716" />
      <rect x="23" y="16" width="2" height="1" fill="#3e2716" />
      <rect x="13" y="17" width="4" height="1" fill="#3e2716" />
      <rect x="11" y="18" width="4" height="1" fill="#3e2716" />
      {/* Olhos */}
      <rect x="12" y="19" width="2" height="3" fill="#efe6cf" />
      <rect x="24" y="19" width="2" height="3" fill="#efe6cf" />
      <rect x="14" y="21" width="2" height="1" fill="#efe6cf" />
      <rect x="26" y="21" width="2" height="1" fill="#efe6cf" />
      <rect x="12" y="22" width="4" height="1" fill="#a96d47" />
      <rect x="24" y="22" width="4" height="1" fill="#a96d47" />
      <rect x="15" y="19" width="1" height="2" fill="#120c08" />
      <rect x="27" y="19" width="1" height="2" fill="#120c08" />
      <rect x="14" y="20" width="1" height="1" fill="#120c08" />
      <rect x="26" y="20" width="1" height="1" fill="#120c08" />
      <rect x="14" y="19" width="1" height="1" fill="#ffffff" />
      <rect x="26" y="19" width="1" height="1" fill="#ffffff" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Sobrancelhas */}
      <rect x="26" y="16" width="2" height="2" fill="#3e2716" />
      <rect x="12" y="17" width="3" height="2" fill="#3e2716" />
      <rect x="23" y="17" width="3" height="1" fill="#3e2716" />
      <rect x="15" y="18" width="2" height="1" fill="#3e2716" />
      {/* Olhos */}
      <rect x="12" y="19" width="4" height="1" fill="#a96d47" />
      <rect x="24" y="19" width="4" height="1" fill="#a96d47" />
      <rect x="12" y="22" width="4" height="1" fill="#a96d47" />
      <rect x="24" y="22" width="4" height="1" fill="#a96d47" />
      <rect x="12" y="20" width="4" height="1" fill="#21140a" />
      <rect x="24" y="20" width="4" height="1" fill="#21140a" />
      <rect x="12" y="21" width="1" height="1" fill="#efe6cf" />
      <rect x="15" y="21" width="1" height="1" fill="#efe6cf" />
      <rect x="24" y="21" width="1" height="1" fill="#efe6cf" />
      <rect x="27" y="21" width="1" height="1" fill="#efe6cf" />
      <rect x="13" y="21" width="2" height="1" fill="#120c08" />
      <rect x="25" y="21" width="2" height="1" fill="#120c08" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Sobrancelhas */}
      <rect x="11" y="17" width="3" height="1" fill="#3e2716" />
      <rect x="26" y="17" width="3" height="1" fill="#3e2716" />
      <rect x="14" y="18" width="3" height="1" fill="#3e2716" />
      <rect x="23" y="18" width="3" height="1" fill="#3e2716" />
      {/* Olhos */}
      <rect x="12" y="19" width="1" height="1" fill="#120c08" />
      <rect x="14" y="19" width="1" height="1" fill="#120c08" />
      <rect x="25" y="19" width="1" height="1" fill="#120c08" />
      <rect x="27" y="19" width="1" height="1" fill="#120c08" />
      <rect x="13" y="20" width="1" height="1" fill="#120c08" />
      <rect x="26" y="20" width="1" height="1" fill="#120c08" />
      <rect x="12" y="21" width="1" height="1" fill="#120c08" />
      <rect x="14" y="21" width="1" height="1" fill="#120c08" />
      <rect x="25" y="21" width="1" height="1" fill="#120c08" />
      <rect x="27" y="21" width="1" height="1" fill="#120c08" />
      </>
    );
  }
  return (
    <>
      {/* Sobrancelhas */}
      <rect x="13" y="17" width="4" height="1" fill="#3e2716" />
      <rect x="23" y="17" width="4" height="1" fill="#3e2716" />
      <rect x="11" y="18" width="4" height="1" fill="#3e2716" />
      <rect x="25" y="18" width="4" height="1" fill="#3e2716" />
      {/* Olhos */}
      <rect x="12" y="19" width="4" height="1" fill="#efe6cf" />
      <rect x="24" y="19" width="4" height="1" fill="#efe6cf" />
      <rect x="12" y="20" width="1" height="2" fill="#efe6cf" />
      <rect x="15" y="20" width="1" height="2" fill="#efe6cf" />
      <rect x="24" y="20" width="1" height="2" fill="#efe6cf" />
      <rect x="27" y="20" width="1" height="2" fill="#efe6cf" />
      <rect x="12" y="22" width="4" height="1" fill="#a96d47" />
      <rect x="24" y="22" width="4" height="1" fill="#a96d47" />
      <rect x="14" y="20" width="1" height="2" fill="#120c08" />
      <rect x="26" y="20" width="1" height="2" fill="#120c08" />
      <rect x="13" y="21" width="1" height="1" fill="#120c08" />
      <rect x="25" y="21" width="1" height="1" fill="#120c08" />
      <rect x="13" y="20" width="1" height="1" fill="#ffffff" />
      <rect x="25" y="20" width="1" height="1" fill="#ffffff" />
    </>
  );
}

/** Boca do Tonho (debaixo do bigode); falando, abre. */
function TonhoMouth({ mood, speaking }) {
  if (speaking) {
    return (
      <>
      {/* Boca */}
      <rect x="16" y="28" width="8" height="2" fill="#2a0d08" />
      <rect x="16" y="30" width="2" height="1" fill="#2a0d08" />
      <rect x="22" y="30" width="2" height="1" fill="#2a0d08" />
      <rect x="18" y="30" width="4" height="1" fill="#b8473c" />
      </>
    );
  }
  if (mood === 'thinking') {
    return (
      <>
      {/* Boca */}
      <rect x="19" y="28" width="3" height="1" fill="#2a0d08" />
      <rect x="19" y="29" width="3" height="1" fill="#e6ae82" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Boca */}
      <rect x="24" y="27" width="1" height="1" fill="#2a0d08" />
      <rect x="21" y="28" width="3" height="1" fill="#2a0d08" />
      <rect x="17" y="29" width="4" height="1" fill="#2a0d08" />
      <rect x="18" y="30" width="3" height="1" fill="#a96d47" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Boca */}
      <rect x="16" y="28" width="1" height="2" fill="#2a0d08" />
      <rect x="23" y="28" width="1" height="2" fill="#2a0d08" />
      <rect x="17" y="29" width="6" height="1" fill="#2a0d08" />
      <rect x="17" y="28" width="2" height="1" fill="#efe6cf" />
      <rect x="20" y="28" width="1" height="1" fill="#efe6cf" />
      <rect x="22" y="28" width="1" height="1" fill="#efe6cf" />
      <rect x="19" y="28" width="1" height="1" fill="#21140a" />
      <rect x="21" y="28" width="1" height="1" fill="#21140a" />
      </>
    );
  }
  return (
    <>
      {/* Boca */}
      <rect x="17" y="28" width="6" height="1" fill="#2a0d08" />
      <rect x="18" y="29" width="4" height="1" fill="#e6ae82" />
    </>
  );
}

/** Suor do Tonho: sempre afobado, encharcado quando ferido. */
function TonhoExtras({ mood }) {
  if (mood === 'smug') {
    return (
      <>
      {/* Gotas de suor */}
      <rect x="27" y="16" width="1" height="2" fill="#f4fcff" />
      <rect x="28" y="17" width="1" height="1" fill="#a9d9ec" />
      <rect x="27" y="18" width="1" height="1" fill="#a9d9ec" />
      <rect x="28" y="18" width="1" height="1" fill="#5b95b0" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Gotas de suor */}
      <rect x="5" y="6" width="1" height="2" fill="#f4fcff" />
      <rect x="32" y="13" width="1" height="2" fill="#f4fcff" />
      <rect x="27" y="16" width="1" height="2" fill="#f4fcff" />
      <rect x="11" y="26" width="1" height="2" fill="#f4fcff" />
      <rect x="6" y="7" width="1" height="1" fill="#a9d9ec" />
      <rect x="5" y="8" width="1" height="1" fill="#a9d9ec" />
      <rect x="33" y="14" width="1" height="1" fill="#a9d9ec" />
      <rect x="32" y="15" width="1" height="1" fill="#a9d9ec" />
      <rect x="28" y="17" width="1" height="1" fill="#a9d9ec" />
      <rect x="27" y="18" width="1" height="1" fill="#a9d9ec" />
      <rect x="12" y="27" width="1" height="1" fill="#a9d9ec" />
      <rect x="11" y="28" width="1" height="1" fill="#a9d9ec" />
      <rect x="6" y="8" width="1" height="1" fill="#5b95b0" />
      <rect x="33" y="15" width="1" height="1" fill="#5b95b0" />
      <rect x="28" y="18" width="1" height="1" fill="#5b95b0" />
      <rect x="12" y="28" width="1" height="1" fill="#5b95b0" />
      </>
    );
  }
  return (
    <>
      {/* Gotas de suor */}
      <rect x="32" y="14" width="1" height="2" fill="#f4fcff" />
      <rect x="27" y="16" width="1" height="2" fill="#f4fcff" />
      <rect x="33" y="15" width="1" height="1" fill="#a9d9ec" />
      <rect x="32" y="16" width="1" height="1" fill="#a9d9ec" />
      <rect x="28" y="17" width="1" height="1" fill="#a9d9ec" />
      <rect x="27" y="18" width="1" height="1" fill="#a9d9ec" />
      <rect x="33" y="16" width="1" height="1" fill="#5b95b0" />
      <rect x="28" y="18" width="1" height="1" fill="#5b95b0" />
    </>
  );
}

/** Tonho do Gás: boné azul com chama, bigode farto, suor e o botijão P13 no ombro. */
export function TonhoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  const speaking = isSpeaking && mood !== 'hurt';
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Fundo de sombra da silhueta */}
      <rect x="6" y="4" width="13" height="1" fill="#090a0f" />
      <rect x="21" y="4" width="13" height="1" fill="#090a0f" />
      <rect x="6" y="5" width="8" height="1" fill="#090a0f" />
      <rect x="26" y="5" width="8" height="1" fill="#090a0f" />
      <rect x="6" y="6" width="6" height="1" fill="#090a0f" />
      <rect x="28" y="6" width="6" height="1" fill="#090a0f" />
      <rect x="6" y="7" width="4" height="1" fill="#090a0f" />
      <rect x="30" y="7" width="4" height="6" fill="#090a0f" />
      <rect x="9" y="8" width="1" height="1" fill="#090a0f" />
      <rect x="31" y="13" width="3" height="1" fill="#090a0f" />
      <rect x="32" y="14" width="2" height="20" fill="#090a0f" />
      <rect x="31" y="15" width="1" height="4" fill="#090a0f" />
      <rect x="30" y="16" width="1" height="3" fill="#090a0f" />
      <rect x="30" y="24" width="2" height="9" fill="#090a0f" />
      <rect x="10" y="30" width="1" height="3" fill="#090a0f" />
      <rect x="29" y="30" width="1" height="3" fill="#090a0f" />
      <rect x="11" y="31" width="4" height="1" fill="#090a0f" />
      <rect x="25" y="31" width="4" height="1" fill="#090a0f" />
      {/* Botijão de gás no ombro */}
      <rect x="3" y="9" width="6" height="1" fill="#7c868f" />
      <rect x="3" y="10" width="1" height="3" fill="#7c868f" />
      <rect x="8" y="10" width="1" height="3" fill="#7c868f" />
      <rect x="4" y="12" width="4" height="1" fill="#7c868f" />
      <rect x="1" y="15" width="1" height="9" fill="#7c868f" />
      <rect x="5" y="15" width="4" height="1" fill="#7c868f" />
      <rect x="3" y="16" width="3" height="8" fill="#7c868f" />
      <rect x="1" y="26" width="1" height="10" fill="#7c868f" />
      <rect x="3" y="26" width="3" height="10" fill="#7c868f" />
      <rect x="9" y="9" width="1" height="4" fill="#555e67" />
      <rect x="0" y="16" width="1" height="8" fill="#555e67" />
      <rect x="6" y="16" width="2" height="8" fill="#555e67" />
      <rect x="0" y="26" width="1" height="10" fill="#555e67" />
      <rect x="6" y="26" width="2" height="8" fill="#555e67" />
      <rect x="4" y="10" width="4" height="1" fill="#30363d" />
      <rect x="4" y="11" width="1" height="1" fill="#30363d" />
      <rect x="7" y="11" width="1" height="1" fill="#30363d" />
      <rect x="2" y="13" width="7" height="1" fill="#30363d" />
      <rect x="8" y="16" width="2" height="3" fill="#30363d" />
      <rect x="0" y="24" width="10" height="1" fill="#30363d" />
      <rect x="8" y="25" width="2" height="8" fill="#30363d" />
      <rect x="3" y="8" width="6" height="1" fill="#a9b2ba" />
      <rect x="2" y="9" width="1" height="4" fill="#a9b2ba" />
      <rect x="2" y="14" width="1" height="2" fill="#a9b2ba" />
      <rect x="6" y="14" width="2" height="1" fill="#a9b2ba" />
      <rect x="3" y="15" width="2" height="1" fill="#a9b2ba" />
      <rect x="0" y="25" width="2" height="1" fill="#a9b2ba" />
      <rect x="3" y="25" width="5" height="1" fill="#a9b2ba" />
      <rect x="2" y="26" width="1" height="10" fill="#a9b2ba" />
      <rect x="3" y="14" width="3" height="1" fill="#dde3e7" />
      <rect x="2" y="16" width="1" height="8" fill="#dde3e7" />
      <rect x="2" y="25" width="1" height="1" fill="#dde3e7" />
      <rect x="5" y="11" width="2" height="1" fill="#c8261d" />
      {/* Boné azul do uniforme */}
      <rect x="19" y="4" width="2" height="1" fill="#1f3f7a" />
      <rect x="24" y="6" width="4" height="1" fill="#1f3f7a" />
      <rect x="16" y="7" width="1" height="6" fill="#1f3f7a" />
      <rect x="23" y="7" width="1" height="6" fill="#1f3f7a" />
      <rect x="25" y="7" width="3" height="6" fill="#1f3f7a" />
      <rect x="10" y="8" width="1" height="5" fill="#1f3f7a" />
      <rect x="11" y="12" width="5" height="1" fill="#1f3f7a" />
      <rect x="17" y="12" width="6" height="1" fill="#1f3f7a" />
      <rect x="24" y="12" width="1" height="1" fill="#1f3f7a" />
      <rect x="28" y="12" width="2" height="1" fill="#1f3f7a" />
      <rect x="14" y="5" width="5" height="1" fill="#4774c2" />
      <rect x="11" y="7" width="1" height="5" fill="#4774c2" />
      <rect x="15" y="7" width="1" height="5" fill="#4774c2" />
      <rect x="12" y="9" width="3" height="3" fill="#4774c2" />
      <rect x="19" y="5" width="7" height="1" fill="#2f5aa6" />
      <rect x="22" y="6" width="2" height="1" fill="#2f5aa6" />
      <rect x="10" y="7" width="1" height="1" fill="#2f5aa6" />
      <rect x="24" y="7" width="1" height="5" fill="#2f5aa6" />
      <rect x="17" y="11" width="1" height="1" fill="#2f5aa6" />
      <rect x="22" y="11" width="1" height="1" fill="#2f5aa6" />
      <rect x="12" y="6" width="6" height="1" fill="#6f9be0" />
      <rect x="12" y="7" width="3" height="2" fill="#6f9be0" />
      <rect x="28" y="7" width="2" height="5" fill="#12264c" />
      {/* Emblema de chama */}
      <rect x="18" y="6" width="2" height="1" fill="#12264c" />
      <rect x="21" y="6" width="1" height="2" fill="#12264c" />
      <rect x="17" y="7" width="2" height="2" fill="#12264c" />
      <rect x="22" y="7" width="1" height="4" fill="#12264c" />
      <rect x="17" y="9" width="1" height="2" fill="#12264c" />
      <rect x="18" y="10" width="1" height="2" fill="#12264c" />
      <rect x="21" y="10" width="1" height="2" fill="#12264c" />
      <rect x="19" y="11" width="2" height="1" fill="#12264c" />
      <rect x="20" y="6" width="1" height="4" fill="#ffd34d" />
      <rect x="19" y="9" width="1" height="1" fill="#ffd34d" />
      <rect x="19" y="7" width="1" height="2" fill="#ff7a1f" />
      <rect x="21" y="8" width="1" height="2" fill="#ff7a1f" />
      <rect x="18" y="9" width="1" height="1" fill="#ff7a1f" />
      <rect x="19" y="10" width="2" height="1" fill="#b8400e" />
      {/* Pala do boné */}
      <rect x="9" y="15" width="22" height="1" fill="#12264c" />
      <rect x="26" y="13" width="5" height="1" fill="#2f5aa6" />
      <rect x="11" y="14" width="16" height="1" fill="#2f5aa6" />
      <rect x="9" y="13" width="1" height="2" fill="#4774c2" />
      <rect x="19" y="13" width="7" height="1" fill="#4774c2" />
      <rect x="8" y="14" width="1" height="1" fill="#4774c2" />
      <rect x="10" y="14" width="1" height="1" fill="#4774c2" />
      <rect x="10" y="13" width="9" height="1" fill="#6f9be0" />
      <rect x="27" y="14" width="5" height="1" fill="#1f3f7a" />
      {/* Rosto com sombreamento triplo */}
      <rect x="11" y="17" width="6" height="1" fill="#d29a70" />
      <rect x="14" y="18" width="12" height="1" fill="#d29a70" />
      <rect x="14" y="19" width="5" height="2" fill="#d29a70" />
      <rect x="21" y="19" width="5" height="2" fill="#d29a70" />
      <rect x="14" y="21" width="4" height="3" fill="#d29a70" />
      <rect x="23" y="21" width="3" height="3" fill="#d29a70" />
      <rect x="22" y="23" width="1" height="1" fill="#d29a70" />
      <rect x="14" y="24" width="1" height="1" fill="#d29a70" />
      <rect x="25" y="24" width="1" height="1" fill="#d29a70" />
      <rect x="11" y="26" width="1" height="3" fill="#d29a70" />
      <rect x="15" y="28" width="10" height="1" fill="#d29a70" />
      <rect x="14" y="29" width="4" height="1" fill="#d29a70" />
      <rect x="22" y="29" width="2" height="1" fill="#d29a70" />
      <rect x="11" y="30" width="1" height="1" fill="#d29a70" />
      <rect x="16" y="30" width="1" height="1" fill="#d29a70" />
      <rect x="10" y="16" width="20" height="1" fill="#754629" />
      <rect x="28" y="17" width="2" height="13" fill="#754629" />
      <rect x="28" y="30" width="1" height="1" fill="#754629" />
      <rect x="10" y="17" width="1" height="13" fill="#a96d47" />
      <rect x="17" y="17" width="11" height="1" fill="#a96d47" />
      <rect x="26" y="18" width="2" height="5" fill="#a96d47" />
      <rect x="27" y="25" width="1" height="1" fill="#a96d47" />
      <rect x="11" y="29" width="1" height="1" fill="#a96d47" />
      <rect x="24" y="29" width="2" height="2" fill="#a96d47" />
      <rect x="12" y="30" width="4" height="1" fill="#a96d47" />
      <rect x="23" y="30" width="1" height="1" fill="#a96d47" />
      <rect x="26" y="30" width="2" height="1" fill="#a96d47" />
      <rect x="11" y="18" width="1" height="5" fill="#e6ae82" />
      <rect x="13" y="18" width="1" height="5" fill="#e6ae82" />
      <rect x="12" y="21" width="1" height="2" fill="#e6ae82" />
      <rect x="11" y="25" width="2" height="1" fill="#e6ae82" />
      <rect x="18" y="29" width="4" height="2" fill="#e6ae82" />
      <rect x="17" y="30" width="1" height="1" fill="#e6ae82" />
      <rect x="22" y="30" width="1" height="1" fill="#e6ae82" />
      <rect x="12" y="18" width="1" height="3" fill="#f4c6a0" />
      {/* Bochechas e orelhas vermelhas */}
      <rect x="9" y="20" width="1" height="3" fill="#d9705a" />
      <rect x="30" y="20" width="1" height="3" fill="#d9705a" />
      <rect x="11" y="23" width="3" height="2" fill="#d9705a" />
      <rect x="26" y="23" width="2" height="2" fill="#d9705a" />
      <rect x="30" y="19" width="2" height="1" fill="#a96d47" />
      <rect x="31" y="20" width="1" height="3" fill="#a96d47" />
      <rect x="8" y="23" width="2" height="1" fill="#a96d47" />
      <rect x="8" y="19" width="2" height="1" fill="#e6ae82" />
      <rect x="8" y="20" width="1" height="3" fill="#e6ae82" />
      <rect x="30" y="23" width="2" height="1" fill="#754629" />
      {/* Nariz de batata */}
      <rect x="21" y="21" width="2" height="2" fill="#a96d47" />
      <rect x="19" y="23" width="2" height="1" fill="#a96d47" />
      <rect x="20" y="19" width="1" height="2" fill="#e6ae82" />
      <rect x="19" y="20" width="1" height="1" fill="#e6ae82" />
      <rect x="18" y="21" width="1" height="1" fill="#e6ae82" />
      <rect x="20" y="21" width="1" height="2" fill="#cf6a52" />
      <rect x="18" y="22" width="2" height="1" fill="#cf6a52" />
      <rect x="19" y="19" width="1" height="1" fill="#f4c6a0" />
      <rect x="19" y="21" width="1" height="1" fill="#f4c6a0" />
      <rect x="18" y="23" width="1" height="1" fill="#754629" />
      <rect x="21" y="23" width="1" height="1" fill="#754629" />
      {/* Bigode farto de pontas caídas */}
      <rect x="17" y="24" width="8" height="3" fill="#3e2716" />
      <rect x="15" y="25" width="2" height="2" fill="#3e2716" />
      <rect x="25" y="25" width="2" height="4" fill="#3e2716" />
      <rect x="13" y="26" width="2" height="2" fill="#3e2716" />
      <rect x="12" y="27" width="1" height="3" fill="#3e2716" />
      <rect x="15" y="27" width="1" height="1" fill="#3e2716" />
      <rect x="19" y="27" width="2" height="1" fill="#3e2716" />
      <rect x="24" y="27" width="1" height="1" fill="#3e2716" />
      <rect x="13" y="28" width="1" height="1" fill="#3e2716" />
      <rect x="27" y="26" width="1" height="4" fill="#21140a" />
      <rect x="16" y="27" width="3" height="1" fill="#21140a" />
      <rect x="21" y="27" width="3" height="1" fill="#21140a" />
      <rect x="14" y="28" width="1" height="1" fill="#21140a" />
      <rect x="13" y="29" width="1" height="1" fill="#21140a" />
      <rect x="26" y="29" width="1" height="1" fill="#21140a" />
      <rect x="15" y="24" width="2" height="1" fill="#6e4729" />
      <rect x="13" y="25" width="2" height="1" fill="#6e4729" />
      <rect x="12" y="26" width="1" height="1" fill="#6e4729" />
      {/* Pescoço */}
      <rect x="15" y="31" width="10" height="1" fill="#754629" />
      {/* Camisa azul de uniforme com gola */}
      <rect x="11" y="32" width="2" height="1" fill="#3a66a8" />
      <rect x="27" y="32" width="2" height="1" fill="#3a66a8" />
      <rect x="8" y="33" width="1" height="1" fill="#3a66a8" />
      <rect x="26" y="33" width="2" height="3" fill="#3a66a8" />
      <rect x="31" y="33" width="1" height="1" fill="#3a66a8" />
      <rect x="6" y="34" width="1" height="2" fill="#3a66a8" />
      <rect x="14" y="34" width="1" height="6" fill="#3a66a8" />
      <rect x="25" y="34" width="1" height="2" fill="#3a66a8" />
      <rect x="15" y="35" width="1" height="5" fill="#3a66a8" />
      <rect x="24" y="35" width="1" height="1" fill="#3a66a8" />
      <rect x="7" y="36" width="7" height="1" fill="#3a66a8" />
      <rect x="16" y="36" width="1" height="4" fill="#3a66a8" />
      <rect x="23" y="36" width="1" height="4" fill="#3a66a8" />
      <rect x="7" y="37" width="5" height="3" fill="#3a66a8" />
      <rect x="13" y="37" width="1" height="3" fill="#3a66a8" />
      <rect x="17" y="37" width="2" height="3" fill="#3a66a8" />
      <rect x="21" y="37" width="2" height="3" fill="#3a66a8" />
      <rect x="28" y="33" width="3" height="3" fill="#284b80" />
      <rect x="31" y="34" width="2" height="6" fill="#284b80" />
      <rect x="6" y="36" width="1" height="4" fill="#284b80" />
      <rect x="29" y="36" width="2" height="4" fill="#284b80" />
      <rect x="12" y="37" width="1" height="3" fill="#284b80" />
      <rect x="9" y="33" width="5" height="3" fill="#5482c2" />
      <rect x="7" y="34" width="2" height="2" fill="#5482c2" />
      <rect x="33" y="34" width="1" height="6" fill="#16305a" />
      {/* Gola e botões */}
      <rect x="13" y="32" width="1" height="1" fill="#7aa3da" />
      <rect x="17" y="32" width="1" height="4" fill="#7aa3da" />
      <rect x="22" y="32" width="5" height="1" fill="#7aa3da" />
      <rect x="14" y="33" width="3" height="1" fill="#7aa3da" />
      <rect x="22" y="33" width="4" height="1" fill="#7aa3da" />
      <rect x="15" y="34" width="2" height="1" fill="#7aa3da" />
      <rect x="22" y="34" width="3" height="1" fill="#7aa3da" />
      <rect x="16" y="35" width="1" height="1" fill="#7aa3da" />
      <rect x="22" y="35" width="2" height="1" fill="#7aa3da" />
      <rect x="18" y="33" width="1" height="4" fill="#16305a" />
      <rect x="21" y="33" width="1" height="4" fill="#16305a" />
      <rect x="19" y="34" width="1" height="6" fill="#16305a" />
      <rect x="17" y="36" width="1" height="1" fill="#16305a" />
      <rect x="22" y="36" width="1" height="1" fill="#16305a" />
      <rect x="14" y="32" width="3" height="1" fill="#d8dee6" />
      <rect x="20" y="35" width="1" height="1" fill="#d8dee6" />
      <rect x="20" y="38" width="1" height="1" fill="#d8dee6" />
      <rect x="18" y="32" width="4" height="1" fill="#a96d47" />
      <rect x="20" y="34" width="1" height="1" fill="#284b80" />
      <rect x="20" y="36" width="1" height="2" fill="#284b80" />
      <rect x="20" y="39" width="1" height="1" fill="#284b80" />
      <rect x="19" y="33" width="2" height="1" fill="#754629" />
      {/* Bolso com a chama */}
      <rect x="24" y="37" width="2" height="1" fill="#284b80" />
      <rect x="27" y="37" width="2" height="1" fill="#284b80" />
      <rect x="24" y="38" width="1" height="2" fill="#284b80" />
      <rect x="28" y="38" width="1" height="2" fill="#284b80" />
      <rect x="25" y="39" width="1" height="1" fill="#284b80" />
      <rect x="27" y="39" width="1" height="1" fill="#284b80" />
      <rect x="24" y="36" width="5" height="1" fill="#16305a" />
      <rect x="26" y="37" width="1" height="1" fill="#ff7a1f" />
      <rect x="25" y="38" width="1" height="1" fill="#ff7a1f" />
      <rect x="27" y="38" width="1" height="1" fill="#ff7a1f" />
      <rect x="26" y="38" width="1" height="1" fill="#ffd34d" />
      <rect x="26" y="39" width="1" height="1" fill="#b8400e" />
      <TonhoEyes mood={mood} />
      <TonhoMouth mood={mood} speaking={speaking} />
      <TonhoExtras mood={mood} />
    </PixelSvg>
  );
}

// ---------------------------------------------------------------------------
// 2. BAIANO DA SINUCA — "O Rei do Giz" (oliva)
// ---------------------------------------------------------------------------

/** Olhos e sobrancelhas do Baiano por humor. */
function BaianoEyes({ mood }) {
  if (mood === 'thinking') {
    return (
      <>
      {/* Sobrancelhas */}
      <rect x="23" y="15" width="4" height="1" fill="#120c09" />
      <rect x="27" y="16" width="1" height="1" fill="#120c09" />
      <rect x="13" y="17" width="4" height="1" fill="#120c09" />
      {/* Olhos */}
      <rect x="13" y="18" width="2" height="2" fill="#e8ddc4" />
      <rect x="23" y="18" width="2" height="2" fill="#e8ddc4" />
      <rect x="15" y="19" width="2" height="1" fill="#e8ddc4" />
      <rect x="25" y="19" width="2" height="1" fill="#e8ddc4" />
      <rect x="13" y="20" width="4" height="1" fill="#55311b" />
      <rect x="23" y="20" width="4" height="1" fill="#55311b" />
      <rect x="15" y="18" width="2" height="1" fill="#0d0705" />
      <rect x="25" y="18" width="2" height="1" fill="#0d0705" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Sobrancelhas */}
      <rect x="23" y="16" width="4" height="1" fill="#120c09" />
      <rect x="12" y="17" width="5" height="1" fill="#120c09" />
      <rect x="27" y="17" width="1" height="1" fill="#120c09" />
      {/* Olhos */}
      <rect x="13" y="18" width="4" height="1" fill="#120c09" />
      <rect x="23" y="18" width="4" height="1" fill="#120c09" />
      <rect x="13" y="20" width="4" height="1" fill="#55311b" />
      <rect x="23" y="20" width="4" height="1" fill="#55311b" />
      <rect x="13" y="19" width="1" height="1" fill="#e8ddc4" />
      <rect x="16" y="19" width="1" height="1" fill="#e8ddc4" />
      <rect x="23" y="19" width="1" height="1" fill="#e8ddc4" />
      <rect x="26" y="19" width="1" height="1" fill="#e8ddc4" />
      <rect x="14" y="19" width="2" height="1" fill="#0d0705" />
      <rect x="24" y="19" width="2" height="1" fill="#0d0705" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Sobrancelhas */}
      <rect x="13" y="16" width="2" height="1" fill="#120c09" />
      <rect x="25" y="16" width="2" height="1" fill="#120c09" />
      <rect x="15" y="17" width="2" height="1" fill="#120c09" />
      <rect x="23" y="17" width="2" height="1" fill="#120c09" />
      {/* Olhos */}
      <rect x="13" y="18" width="2" height="1" fill="#0d0705" />
      <rect x="25" y="18" width="2" height="1" fill="#0d0705" />
      <rect x="15" y="19" width="2" height="1" fill="#0d0705" />
      <rect x="23" y="19" width="2" height="1" fill="#0d0705" />
      <rect x="13" y="20" width="2" height="1" fill="#0d0705" />
      <rect x="25" y="20" width="2" height="1" fill="#0d0705" />
      </>
    );
  }
  return (
    <>
      {/* Sobrancelhas */}
      <rect x="13" y="16" width="4" height="1" fill="#120c09" />
      <rect x="23" y="16" width="4" height="1" fill="#120c09" />
      <rect x="12" y="17" width="1" height="1" fill="#120c09" />
      <rect x="27" y="17" width="1" height="1" fill="#120c09" />
      {/* Olhos */}
      <rect x="13" y="18" width="1" height="2" fill="#e8ddc4" />
      <rect x="16" y="18" width="1" height="2" fill="#e8ddc4" />
      <rect x="23" y="18" width="1" height="2" fill="#e8ddc4" />
      <rect x="26" y="18" width="1" height="2" fill="#e8ddc4" />
      <rect x="13" y="20" width="4" height="1" fill="#55311b" />
      <rect x="23" y="20" width="4" height="1" fill="#55311b" />
      <rect x="15" y="18" width="1" height="2" fill="#0d0705" />
      <rect x="25" y="18" width="1" height="2" fill="#0d0705" />
      <rect x="14" y="19" width="1" height="1" fill="#0d0705" />
      <rect x="24" y="19" width="1" height="1" fill="#0d0705" />
      <rect x="14" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="24" y="18" width="1" height="1" fill="#ffffff" />
    </>
  );
}

/** Sorriso do Baiano; falando, abre. */
function BaianoMouth({ mood, speaking }) {
  if (speaking) {
    return (
      <>
      {/* Boca */}
      <rect x="15" y="25" width="1" height="1" fill="#1c0905" />
      <rect x="24" y="25" width="1" height="1" fill="#1c0905" />
      <rect x="16" y="26" width="8" height="1" fill="#1c0905" />
      <rect x="16" y="27" width="2" height="1" fill="#1c0905" />
      <rect x="22" y="27" width="2" height="1" fill="#1c0905" />
      <rect x="16" y="25" width="8" height="1" fill="#f2ecd9" />
      <rect x="17" y="28" width="6" height="1" fill="#8c4a34" />
      <rect x="18" y="27" width="4" height="1" fill="#a8423a" />
      </>
    );
  }
  if (mood === 'thinking') {
    return (
      <>
      {/* Boca */}
      <rect x="17" y="26" width="6" height="1" fill="#5e2c1e" />
      <rect x="18" y="27" width="4" height="1" fill="#8c4a34" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Boca */}
      <rect x="25" y="24" width="1" height="1" fill="#1c0905" />
      <rect x="24" y="25" width="1" height="1" fill="#1c0905" />
      <rect x="19" y="26" width="5" height="1" fill="#1c0905" />
      <rect x="17" y="27" width="6" height="1" fill="#8c4a34" />
      <rect x="19" y="25" width="5" height="1" fill="#f2ecd9" />
      <rect x="15" y="26" width="4" height="1" fill="#5e2c1e" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Boca */}
      <rect x="15" y="25" width="1" height="3" fill="#1c0905" />
      <rect x="18" y="25" width="1" height="2" fill="#1c0905" />
      <rect x="21" y="25" width="1" height="2" fill="#1c0905" />
      <rect x="24" y="25" width="1" height="3" fill="#1c0905" />
      <rect x="16" y="26" width="2" height="1" fill="#1c0905" />
      <rect x="19" y="26" width="2" height="1" fill="#1c0905" />
      <rect x="22" y="26" width="2" height="1" fill="#1c0905" />
      <rect x="16" y="27" width="1" height="1" fill="#1c0905" />
      <rect x="23" y="27" width="1" height="1" fill="#1c0905" />
      <rect x="16" y="25" width="2" height="1" fill="#f2ecd9" />
      <rect x="19" y="25" width="2" height="1" fill="#f2ecd9" />
      <rect x="22" y="25" width="2" height="1" fill="#f2ecd9" />
      <rect x="17" y="27" width="6" height="1" fill="#f2ecd9" />
      </>
    );
  }
  return (
    <>
      {/* Boca */}
      <rect x="14" y="25" width="1" height="1" fill="#1c0905" />
      <rect x="25" y="25" width="1" height="1" fill="#1c0905" />
      <rect x="16" y="26" width="8" height="1" fill="#1c0905" />
      <rect x="15" y="25" width="10" height="1" fill="#f2ecd9" />
      <rect x="16" y="27" width="8" height="1" fill="#8c4a34" />
      <rect x="15" y="26" width="1" height="1" fill="#5e2c1e" />
      <rect x="24" y="26" width="1" height="1" fill="#5e2c1e" />
    </>
  );
}

/** Suor do Baiano quando leva o golpe. */
function BaianoExtras({ mood }) {
  if (mood === 'hurt') {
    return (
      <>
      {/* Suor de dor */}
      <rect x="10" y="14" width="1" height="2" fill="#f4fcff" />
      <rect x="11" y="15" width="1" height="1" fill="#a9d9ec" />
      <rect x="10" y="16" width="1" height="1" fill="#a9d9ec" />
      <rect x="11" y="16" width="1" height="1" fill="#5b95b0" />
      </>
    );
  }
  return null;
}

/** Baiano da Sinuca: panamá, sorrisão, cavanhaque, camisa oliva aberta, corrente e taco com giz azul. */
export function BaianoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  const speaking = isSpeaking && mood !== 'hurt';
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Fundo de sombra da silhueta */}
      <rect x="6" y="4" width="8" height="1" fill="#090a0f" />
      <rect x="26" y="4" width="8" height="1" fill="#090a0f" />
      <rect x="6" y="5" width="7" height="6" fill="#090a0f" />
      <rect x="27" y="5" width="7" height="6" fill="#090a0f" />
      <rect x="6" y="11" width="2" height="1" fill="#090a0f" />
      <rect x="32" y="11" width="2" height="1" fill="#090a0f" />
      <rect x="6" y="14" width="5" height="3" fill="#090a0f" />
      <rect x="29" y="14" width="5" height="3" fill="#090a0f" />
      <rect x="6" y="17" width="3" height="16" fill="#090a0f" />
      <rect x="31" y="17" width="3" height="1" fill="#090a0f" />
      <rect x="31" y="18" width="2" height="8" fill="#090a0f" />
      <rect x="9" y="22" width="2" height="10" fill="#090a0f" />
      <rect x="29" y="22" width="2" height="6" fill="#090a0f" />
      <rect x="31" y="26" width="1" height="2" fill="#090a0f" />
      <rect x="11" y="28" width="1" height="4" fill="#090a0f" />
      <rect x="28" y="28" width="2" height="1" fill="#090a0f" />
      <rect x="12" y="29" width="1" height="3" fill="#090a0f" />
      <rect x="27" y="29" width="2" height="3" fill="#090a0f" />
      <rect x="13" y="30" width="1" height="2" fill="#090a0f" />
      <rect x="26" y="30" width="1" height="2" fill="#090a0f" />
      <rect x="14" y="31" width="2" height="1" fill="#090a0f" />
      <rect x="24" y="31" width="2" height="1" fill="#090a0f" />
      <rect x="9" y="32" width="1" height="1" fill="#090a0f" />
      <rect x="6" y="33" width="1" height="1" fill="#090a0f" />
      {/* Taco de sinuca com giz azul */}
      <rect x="36" y="4" width="1" height="6" fill="#c9a467" />
      <rect x="35" y="10" width="1" height="8" fill="#c9a467" />
      <rect x="34" y="18" width="1" height="8" fill="#c9a467" />
      <rect x="33" y="26" width="1" height="2" fill="#c9a467" />
      <rect x="35" y="4" width="1" height="6" fill="#efd9a6" />
      <rect x="34" y="10" width="1" height="2" fill="#efd9a6" />
      <rect x="34" y="14" width="1" height="4" fill="#efd9a6" />
      <rect x="33" y="18" width="1" height="8" fill="#efd9a6" />
      <rect x="32" y="26" width="1" height="2" fill="#efd9a6" />
      <rect x="35" y="20" width="1" height="6" fill="#8a6636" />
      <rect x="34" y="26" width="1" height="3" fill="#8a6636" />
      <rect x="35" y="2" width="2" height="1" fill="#f4f1e8" />
      <rect x="35" y="3" width="1" height="1" fill="#f4f1e8" />
      <rect x="36" y="0" width="1" height="1" fill="#5aa8ff" />
      <rect x="35" y="1" width="1" height="1" fill="#5aa8ff" />
      <rect x="35" y="0" width="1" height="1" fill="#b9dcff" />
      <rect x="36" y="1" width="1" height="1" fill="#2f74c8" />
      <rect x="36" y="3" width="1" height="1" fill="#d9c08a" />
      {/* Chapéu panamá */}
      <rect x="21" y="3" width="4" height="1" fill="#c0ac76" />
      <rect x="18" y="4" width="1" height="5" fill="#c0ac76" />
      <rect x="21" y="4" width="2" height="2" fill="#c0ac76" />
      <rect x="25" y="4" width="1" height="1" fill="#c0ac76" />
      <rect x="13" y="5" width="1" height="1" fill="#c0ac76" />
      <rect x="17" y="5" width="1" height="2" fill="#c0ac76" />
      <rect x="21" y="6" width="1" height="2" fill="#c0ac76" />
      <rect x="22" y="7" width="1" height="2" fill="#c0ac76" />
      <rect x="17" y="8" width="1" height="1" fill="#c0ac76" />
      <rect x="19" y="8" width="2" height="1" fill="#c0ac76" />
      <rect x="19" y="4" width="1" height="4" fill="#8f7c4d" />
      <rect x="23" y="4" width="2" height="5" fill="#8f7c4d" />
      <rect x="25" y="5" width="1" height="4" fill="#8f7c4d" />
      <rect x="13" y="6" width="1" height="3" fill="#8f7c4d" />
      <rect x="22" y="6" width="1" height="1" fill="#8f7c4d" />
      <rect x="17" y="7" width="1" height="1" fill="#8f7c4d" />
      <rect x="21" y="8" width="1" height="1" fill="#8f7c4d" />
      <rect x="17" y="3" width="2" height="1" fill="#ddcc98" />
      <rect x="20" y="4" width="1" height="4" fill="#ddcc98" />
      <rect x="16" y="5" width="1" height="4" fill="#ddcc98" />
      <rect x="14" y="7" width="2" height="2" fill="#ddcc98" />
      <rect x="15" y="3" width="2" height="2" fill="#f3e9c6" />
      <rect x="14" y="4" width="1" height="3" fill="#f3e9c6" />
      <rect x="17" y="4" width="1" height="1" fill="#f3e9c6" />
      <rect x="15" y="5" width="1" height="2" fill="#f3e9c6" />
      <rect x="26" y="5" width="1" height="4" fill="#4f4226" />
      {/* Fita do chapéu */}
      <rect x="19" y="9" width="8" height="2" fill="#22150e" />
      <rect x="13" y="10" width="6" height="1" fill="#22150e" />
      <rect x="13" y="9" width="6" height="1" fill="#4a3122" />
      {/* Aba larga */}
      <rect x="9" y="12" width="19" height="1" fill="#c0ac76" />
      <rect x="17" y="13" width="11" height="1" fill="#c0ac76" />
      <rect x="16" y="11" width="16" height="1" fill="#ddcc98" />
      <rect x="5" y="12" width="4" height="1" fill="#ddcc98" />
      <rect x="12" y="13" width="5" height="1" fill="#ddcc98" />
      <rect x="28" y="12" width="7" height="1" fill="#8f7c4d" />
      <rect x="4" y="13" width="5" height="1" fill="#8f7c4d" />
      <rect x="9" y="13" width="3" height="1" fill="#4f4226" />
      <rect x="28" y="13" width="7" height="1" fill="#4f4226" />
      <rect x="4" y="14" width="2" height="1" fill="#4f4226" />
      <rect x="8" y="11" width="8" height="1" fill="#f3e9c6" />
      {/* Rosto (pele negra, sombreamento triplo) */}
      <rect x="13" y="15" width="4" height="1" fill="#744628" />
      <rect x="17" y="16" width="8" height="1" fill="#744628" />
      <rect x="15" y="17" width="4" height="4" fill="#744628" />
      <rect x="21" y="17" width="4" height="3" fill="#744628" />
      <rect x="11" y="20" width="1" height="8" fill="#744628" />
      <rect x="21" y="20" width="3" height="1" fill="#744628" />
      <rect x="15" y="21" width="2" height="3" fill="#744628" />
      <rect x="23" y="21" width="2" height="3" fill="#744628" />
      <rect x="17" y="23" width="1" height="1" fill="#744628" />
      <rect x="22" y="23" width="1" height="1" fill="#744628" />
      <rect x="15" y="24" width="1" height="7" fill="#744628" />
      <rect x="24" y="24" width="1" height="4" fill="#744628" />
      <rect x="16" y="25" width="8" height="4" fill="#744628" />
      <rect x="12" y="27" width="3" height="1" fill="#744628" />
      <rect x="14" y="28" width="1" height="3" fill="#744628" />
      <rect x="16" y="29" width="2" height="1" fill="#744628" />
      <rect x="22" y="29" width="1" height="1" fill="#744628" />
      <rect x="16" y="30" width="1" height="1" fill="#744628" />
      <rect x="17" y="15" width="10" height="1" fill="#55311b" />
      <rect x="25" y="16" width="2" height="4" fill="#55311b" />
      <rect x="26" y="21" width="1" height="8" fill="#55311b" />
      <rect x="25" y="22" width="1" height="8" fill="#55311b" />
      <rect x="12" y="28" width="2" height="1" fill="#55311b" />
      <rect x="24" y="28" width="1" height="3" fill="#55311b" />
      <rect x="13" y="29" width="1" height="1" fill="#55311b" />
      <rect x="23" y="29" width="1" height="2" fill="#55311b" />
      <rect x="13" y="14" width="14" height="1" fill="#3a1f10" />
      <rect x="27" y="20" width="2" height="8" fill="#3a1f10" />
      <rect x="27" y="28" width="1" height="1" fill="#3a1f10" />
      <rect x="26" y="29" width="1" height="1" fill="#3a1f10" />
      <rect x="25" y="30" width="1" height="1" fill="#3a1f10" />
      <rect x="13" y="16" width="4" height="1" fill="#94603b" />
      <rect x="13" y="17" width="2" height="3" fill="#94603b" />
      <rect x="12" y="20" width="1" height="7" fill="#94603b" />
      <rect x="13" y="23" width="2" height="4" fill="#94603b" />
      <rect x="13" y="20" width="2" height="3" fill="#b5814f" />
      {/* Costeletas */}
      <rect x="11" y="14" width="2" height="5" fill="#120c09" />
      <rect x="27" y="14" width="2" height="6" fill="#120c09" />
      <rect x="11" y="19" width="1" height="1" fill="#120c09" />
      <rect x="12" y="19" width="1" height="1" fill="#3a2a20" />
      {/* Orelhas */}
      <rect x="29" y="17" width="2" height="1" fill="#55311b" />
      <rect x="10" y="18" width="1" height="3" fill="#55311b" />
      <rect x="30" y="18" width="1" height="4" fill="#55311b" />
      <rect x="29" y="21" width="1" height="1" fill="#55311b" />
      <rect x="9" y="17" width="2" height="1" fill="#94603b" />
      <rect x="9" y="18" width="1" height="4" fill="#94603b" />
      <rect x="10" y="21" width="1" height="1" fill="#94603b" />
      <rect x="29" y="18" width="1" height="3" fill="#3a1f10" />
      {/* Nariz largo */}
      <rect x="20" y="17" width="1" height="4" fill="#55311b" />
      <rect x="21" y="21" width="2" height="1" fill="#55311b" />
      <rect x="21" y="22" width="1" height="2" fill="#55311b" />
      <rect x="18" y="23" width="3" height="1" fill="#55311b" />
      <rect x="19" y="17" width="1" height="1" fill="#94603b" />
      <rect x="19" y="19" width="1" height="2" fill="#94603b" />
      <rect x="18" y="22" width="1" height="1" fill="#94603b" />
      <rect x="17" y="21" width="1" height="1" fill="#744628" />
      <rect x="20" y="21" width="1" height="2" fill="#744628" />
      <rect x="19" y="22" width="1" height="1" fill="#744628" />
      <rect x="19" y="18" width="1" height="1" fill="#b5814f" />
      <rect x="18" y="21" width="2" height="1" fill="#b5814f" />
      <rect x="17" y="22" width="1" height="1" fill="#3a1f10" />
      <rect x="22" y="22" width="1" height="1" fill="#3a1f10" />
      {/* Giz azul no rosto */}
      <rect x="24" y="20" width="2" height="1" fill="#5aa8ff" />
      <rect x="26" y="20" width="1" height="1" fill="#2f74c8" />
      <rect x="25" y="21" width="1" height="1" fill="#2f74c8" />
      {/* Bigodinho e cavanhaque */}
      <rect x="18" y="24" width="6" height="1" fill="#120c09" />
      <rect x="19" y="29" width="3" height="3" fill="#120c09" />
      <rect x="18" y="30" width="1" height="2" fill="#120c09" />
      <rect x="22" y="30" width="1" height="2" fill="#120c09" />
      <rect x="16" y="24" width="2" height="1" fill="#3a2a20" />
      <rect x="18" y="29" width="1" height="1" fill="#3a2a20" />
      <rect x="17" y="30" width="1" height="2" fill="#3a2a20" />
      {/* Pescoço */}
      <rect x="16" y="31" width="1" height="1" fill="#55311b" />
      <rect x="23" y="31" width="1" height="1" fill="#55311b" />
      {/* Camisa oliva aberta */}
      <rect x="10" y="32" width="1" height="1" fill="#5a5f2a" />
      <rect x="5" y="34" width="1" height="2" fill="#5a5f2a" />
      <rect x="27" y="34" width="1" height="6" fill="#5a5f2a" />
      <rect x="13" y="35" width="1" height="5" fill="#5a5f2a" />
      <rect x="26" y="35" width="1" height="5" fill="#5a5f2a" />
      <rect x="6" y="36" width="7" height="1" fill="#5a5f2a" />
      <rect x="14" y="36" width="1" height="4" fill="#5a5f2a" />
      <rect x="22" y="36" width="1" height="4" fill="#5a5f2a" />
      <rect x="6" y="37" width="5" height="3" fill="#5a5f2a" />
      <rect x="12" y="37" width="1" height="3" fill="#5a5f2a" />
      <rect x="15" y="37" width="1" height="3" fill="#5a5f2a" />
      <rect x="18" y="37" width="1" height="3" fill="#5a5f2a" />
      <rect x="21" y="37" width="1" height="3" fill="#5a5f2a" />
      <rect x="25" y="37" width="1" height="3" fill="#5a5f2a" />
      <rect x="16" y="38" width="1" height="2" fill="#5a5f2a" />
      <rect x="19" y="38" width="2" height="2" fill="#5a5f2a" />
      <rect x="24" y="38" width="1" height="2" fill="#5a5f2a" />
      <rect x="17" y="39" width="1" height="1" fill="#5a5f2a" />
      <rect x="23" y="39" width="1" height="1" fill="#5a5f2a" />
      <rect x="28" y="33" width="1" height="7" fill="#454a1f" />
      <rect x="5" y="36" width="1" height="4" fill="#454a1f" />
      <rect x="29" y="36" width="5" height="4" fill="#454a1f" />
      <rect x="11" y="37" width="1" height="3" fill="#454a1f" />
      <rect x="7" y="33" width="1" height="3" fill="#747a3a" />
      <rect x="11" y="33" width="1" height="3" fill="#747a3a" />
      <rect x="6" y="34" width="1" height="2" fill="#747a3a" />
      <rect x="8" y="34" width="3" height="2" fill="#747a3a" />
      <rect x="12" y="34" width="1" height="2" fill="#747a3a" />
      <rect x="34" y="36" width="1" height="4" fill="#2b2f13" />
      <rect x="8" y="33" width="3" height="1" fill="#8f9550" />
      {/* Peito à mostra */}
      <rect x="15" y="33" width="1" height="1" fill="#744628" />
      <rect x="19" y="33" width="3" height="2" fill="#744628" />
      <rect x="24" y="33" width="1" height="1" fill="#744628" />
      <rect x="16" y="34" width="1" height="1" fill="#744628" />
      <rect x="23" y="34" width="1" height="1" fill="#744628" />
      <rect x="17" y="35" width="1" height="1" fill="#744628" />
      <rect x="19" y="35" width="2" height="1" fill="#744628" />
      <rect x="22" y="35" width="1" height="1" fill="#744628" />
      <rect x="18" y="36" width="1" height="1" fill="#744628" />
      <rect x="21" y="36" width="1" height="1" fill="#744628" />
      <rect x="15" y="32" width="10" height="1" fill="#55311b" />
      <rect x="22" y="33" width="1" height="1" fill="#55311b" />
      <rect x="17" y="33" width="2" height="1" fill="#94603b" />
      <rect x="18" y="34" width="1" height="1" fill="#94603b" />
      {/* Gola larga aberta */}
      <rect x="11" y="32" width="4" height="1" fill="#8f9550" />
      <rect x="12" y="33" width="3" height="1" fill="#8f9550" />
      <rect x="13" y="34" width="3" height="1" fill="#8f9550" />
      <rect x="14" y="35" width="3" height="1" fill="#8f9550" />
      <rect x="15" y="36" width="2" height="1" fill="#8f9550" />
      <rect x="16" y="37" width="1" height="1" fill="#8f9550" />
      <rect x="25" y="32" width="4" height="1" fill="#747a3a" />
      <rect x="25" y="33" width="3" height="1" fill="#747a3a" />
      <rect x="24" y="34" width="3" height="1" fill="#747a3a" />
      <rect x="23" y="35" width="3" height="1" fill="#747a3a" />
      <rect x="24" y="36" width="2" height="1" fill="#747a3a" />
      <rect x="24" y="37" width="1" height="1" fill="#747a3a" />
      <rect x="17" y="36" width="1" height="3" fill="#2b2f13" />
      <rect x="23" y="36" width="1" height="3" fill="#2b2f13" />
      {/* Corrente fina de ouro */}
      <rect x="16" y="33" width="1" height="1" fill="#e8b84a" />
      <rect x="17" y="34" width="1" height="1" fill="#e8b84a" />
      <rect x="18" y="35" width="1" height="1" fill="#e8b84a" />
      <rect x="20" y="36" width="1" height="1" fill="#e8b84a" />
      <rect x="19" y="37" width="1" height="1" fill="#e8b84a" />
      <rect x="23" y="33" width="1" height="1" fill="#9c7024" />
      <rect x="22" y="34" width="1" height="1" fill="#9c7024" />
      <rect x="21" y="35" width="1" height="1" fill="#9c7024" />
      <rect x="20" y="37" width="1" height="1" fill="#9c7024" />
      <rect x="19" y="36" width="1" height="1" fill="#ffe9a3" />
      {/* Mão no taco, dedos com giz */}
      <rect x="30" y="31" width="4" height="1" fill="#3a1f10" />
      <rect x="30" y="33" width="4" height="1" fill="#3a1f10" />
      <rect x="29" y="35" width="6" height="1" fill="#3a1f10" />
      <rect x="29" y="29" width="1" height="6" fill="#55311b" />
      <rect x="34" y="29" width="1" height="6" fill="#55311b" />
      <rect x="32" y="29" width="2" height="1" fill="#744628" />
      <rect x="30" y="30" width="1" height="1" fill="#744628" />
      <rect x="32" y="30" width="1" height="1" fill="#744628" />
      <rect x="30" y="32" width="2" height="1" fill="#744628" />
      <rect x="33" y="32" width="1" height="1" fill="#744628" />
      <rect x="30" y="34" width="4" height="1" fill="#744628" />
      <rect x="30" y="28" width="2" height="1" fill="#5aa8ff" />
      <rect x="31" y="30" width="1" height="1" fill="#5aa8ff" />
      <rect x="32" y="28" width="2" height="1" fill="#94603b" />
      <rect x="30" y="29" width="2" height="1" fill="#b5814f" />
      <rect x="33" y="30" width="1" height="1" fill="#2f74c8" />
      <rect x="32" y="32" width="1" height="1" fill="#2f74c8" />
      <BaianoEyes mood={mood} />
      <BaianoMouth mood={mood} speaking={speaking} />
      <BaianoExtras mood={mood} />
    </PixelSvg>
  );
}

// ---------------------------------------------------------------------------
// 3. VALDIR BORRACHEIRO — "Calibra na Marra" (cinza asfalto)
// ---------------------------------------------------------------------------

/** Olhos miúdos e sobrancelhas franzidas do Valdir por humor. */
function ValdirEyes({ mood }) {
  if (mood === 'thinking') {
    return (
      <>
      {/* Sobrancelhas grossas */}
      <rect x="22" y="14" width="7" height="2" fill="#24170e" />
      <rect x="11" y="15" width="2" height="2" fill="#24170e" />
      <rect x="14" y="15" width="1" height="2" fill="#24170e" />
      <rect x="15" y="16" width="3" height="1" fill="#24170e" />
      <rect x="28" y="16" width="1" height="1" fill="#24170e" />
      <rect x="16" y="17" width="2" height="1" fill="#24170e" />
      <rect x="13" y="15" width="1" height="1" fill="#e2b387" />
      <rect x="13" y="16" width="1" height="1" fill="#b8845a" />
      {/* Olhos miúdos */}
      <rect x="14" y="18" width="2" height="2" fill="#e6dcc4" />
      <rect x="26" y="18" width="2" height="2" fill="#e6dcc4" />
      <rect x="12" y="19" width="2" height="1" fill="#e6dcc4" />
      <rect x="24" y="19" width="2" height="1" fill="#e6dcc4" />
      <rect x="12" y="17" width="4" height="1" fill="#5c3921" />
      <rect x="24" y="17" width="4" height="1" fill="#5c3921" />
      <rect x="12" y="20" width="4" height="1" fill="#8a5a38" />
      <rect x="24" y="20" width="4" height="1" fill="#8a5a38" />
      <rect x="12" y="18" width="2" height="1" fill="#0f0a07" />
      <rect x="24" y="18" width="2" height="1" fill="#0f0a07" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Sobrancelhas grossas */}
      <rect x="22" y="15" width="7" height="2" fill="#24170e" />
      <rect x="11" y="16" width="7" height="1" fill="#24170e" />
      <rect x="11" y="17" width="1" height="1" fill="#24170e" />
      <rect x="16" y="17" width="2" height="1" fill="#24170e" />
      <rect x="13" y="15" width="1" height="1" fill="#e2b387" />
      {/* Olhos miúdos */}
      <rect x="12" y="18" width="4" height="1" fill="#8a5a38" />
      <rect x="24" y="18" width="4" height="1" fill="#8a5a38" />
      <rect x="12" y="20" width="4" height="1" fill="#8a5a38" />
      <rect x="24" y="20" width="4" height="1" fill="#8a5a38" />
      <rect x="12" y="17" width="4" height="1" fill="#5c3921" />
      <rect x="24" y="17" width="4" height="1" fill="#5c3921" />
      <rect x="12" y="19" width="1" height="1" fill="#e6dcc4" />
      <rect x="15" y="19" width="1" height="1" fill="#e6dcc4" />
      <rect x="24" y="19" width="1" height="1" fill="#e6dcc4" />
      <rect x="27" y="19" width="1" height="1" fill="#e6dcc4" />
      <rect x="13" y="19" width="2" height="1" fill="#0f0a07" />
      <rect x="25" y="19" width="2" height="1" fill="#0f0a07" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Sobrancelhas grossas */}
      <rect x="14" y="15" width="3" height="2" fill="#24170e" />
      <rect x="23" y="15" width="3" height="2" fill="#24170e" />
      <rect x="11" y="16" width="3" height="2" fill="#24170e" />
      <rect x="26" y="16" width="3" height="2" fill="#24170e" />
      <rect x="13" y="15" width="1" height="1" fill="#e2b387" />
      {/* Olhos miúdos */}
      <rect x="12" y="18" width="1" height="1" fill="#0f0a07" />
      <rect x="14" y="18" width="1" height="1" fill="#0f0a07" />
      <rect x="24" y="18" width="1" height="1" fill="#0f0a07" />
      <rect x="26" y="18" width="1" height="1" fill="#0f0a07" />
      <rect x="13" y="19" width="1" height="1" fill="#0f0a07" />
      <rect x="25" y="19" width="1" height="1" fill="#0f0a07" />
      <rect x="12" y="20" width="1" height="1" fill="#0f0a07" />
      <rect x="14" y="20" width="1" height="1" fill="#0f0a07" />
      <rect x="24" y="20" width="1" height="1" fill="#0f0a07" />
      <rect x="26" y="20" width="1" height="1" fill="#0f0a07" />
      </>
    );
  }
  return (
    <>
      {/* Sobrancelhas grossas */}
      <rect x="11" y="15" width="2" height="2" fill="#24170e" />
      <rect x="14" y="15" width="1" height="2" fill="#24170e" />
      <rect x="25" y="15" width="4" height="2" fill="#24170e" />
      <rect x="15" y="16" width="3" height="1" fill="#24170e" />
      <rect x="22" y="16" width="3" height="1" fill="#24170e" />
      <rect x="16" y="17" width="2" height="1" fill="#24170e" />
      <rect x="22" y="17" width="2" height="1" fill="#24170e" />
      <rect x="13" y="15" width="1" height="1" fill="#e2b387" />
      <rect x="13" y="16" width="1" height="1" fill="#b8845a" />
      {/* Olhos miúdos */}
      <rect x="12" y="17" width="4" height="1" fill="#5c3921" />
      <rect x="24" y="17" width="4" height="1" fill="#5c3921" />
      <rect x="12" y="18" width="1" height="2" fill="#e6dcc4" />
      <rect x="15" y="18" width="1" height="2" fill="#e6dcc4" />
      <rect x="24" y="18" width="1" height="2" fill="#e6dcc4" />
      <rect x="27" y="18" width="1" height="2" fill="#e6dcc4" />
      <rect x="12" y="20" width="4" height="1" fill="#8a5a38" />
      <rect x="24" y="20" width="4" height="1" fill="#8a5a38" />
      <rect x="14" y="18" width="1" height="2" fill="#0f0a07" />
      <rect x="26" y="18" width="1" height="2" fill="#0f0a07" />
      <rect x="13" y="19" width="1" height="1" fill="#0f0a07" />
      <rect x="25" y="19" width="1" height="1" fill="#0f0a07" />
      <rect x="13" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="25" y="18" width="1" height="1" fill="#ffffff" />
    </>
  );
}

/** Boca do Valdir (falta um dente); falando, abre. */
function ValdirMouth({ mood, speaking }) {
  if (speaking) {
    return (
      <>
      {/* Boca */}
      <rect x="16" y="26" width="1" height="3" fill="#260c07" />
      <rect x="19" y="26" width="1" height="2" fill="#260c07" />
      <rect x="23" y="26" width="1" height="3" fill="#260c07" />
      <rect x="17" y="27" width="2" height="1" fill="#260c07" />
      <rect x="20" y="27" width="3" height="1" fill="#260c07" />
      <rect x="17" y="28" width="1" height="1" fill="#260c07" />
      <rect x="22" y="28" width="1" height="1" fill="#260c07" />
      <rect x="17" y="26" width="2" height="1" fill="#e9e0c6" />
      <rect x="20" y="26" width="3" height="1" fill="#e9e0c6" />
      <rect x="18" y="28" width="4" height="1" fill="#a8423a" />
      </>
    );
  }
  if (mood === 'thinking') {
    return (
      <>
      {/* Boca */}
      <rect x="15" y="27" width="5" height="1" fill="#260c07" />
      <rect x="16" y="28" width="3" height="1" fill="#a46a48" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Boca */}
      <rect x="21" y="26" width="3" height="1" fill="#260c07" />
      <rect x="16" y="27" width="5" height="1" fill="#260c07" />
      <rect x="17" y="28" width="4" height="1" fill="#a46a48" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Boca */}
      <rect x="15" y="26" width="1" height="3" fill="#260c07" />
      <rect x="19" y="26" width="1" height="2" fill="#260c07" />
      <rect x="24" y="26" width="1" height="3" fill="#260c07" />
      <rect x="16" y="27" width="3" height="1" fill="#260c07" />
      <rect x="20" y="27" width="4" height="1" fill="#260c07" />
      <rect x="16" y="28" width="1" height="1" fill="#260c07" />
      <rect x="21" y="28" width="1" height="1" fill="#260c07" />
      <rect x="23" y="28" width="1" height="1" fill="#260c07" />
      <rect x="16" y="26" width="3" height="1" fill="#e9e0c6" />
      <rect x="20" y="26" width="4" height="1" fill="#e9e0c6" />
      <rect x="17" y="28" width="4" height="1" fill="#e9e0c6" />
      <rect x="22" y="28" width="1" height="1" fill="#e9e0c6" />
      </>
    );
  }
  return (
    <>
      {/* Boca */}
      <rect x="16" y="27" width="8" height="1" fill="#260c07" />
      <rect x="17" y="28" width="6" height="1" fill="#a46a48" />
    </>
  );
}

/** Palito de dente do Valdir (cai quando ferido: fica o fio de sangue). */
function ValdirExtras({ mood }) {
  if (mood === 'thinking') {
    return (
      <>
      {/* Palito de dente */}
      <rect x="14" y="27" width="1" height="1" fill="#ecd9a0" />
      <rect x="12" y="28" width="2" height="1" fill="#ecd9a0" />
      <rect x="11" y="29" width="1" height="1" fill="#ecd9a0" />
      <rect x="12" y="29" width="2" height="1" fill="#a88f55" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Palito de dente */}
      <rect x="27" y="24" width="1" height="1" fill="#ecd9a0" />
      <rect x="25" y="25" width="2" height="1" fill="#ecd9a0" />
      <rect x="24" y="26" width="1" height="1" fill="#ecd9a0" />
      <rect x="25" y="26" width="2" height="1" fill="#a88f55" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Fio de sangue */}
      <rect x="24" y="28" width="1" height="3" fill="#c8261d" />
      {/* Suor */}
      <rect x="29" y="16" width="1" height="2" fill="#f4fcff" />
      <rect x="30" y="17" width="1" height="1" fill="#a9d9ec" />
      <rect x="29" y="18" width="1" height="1" fill="#a9d9ec" />
      <rect x="30" y="18" width="1" height="1" fill="#5b95b0" />
      </>
    );
  }
  return (
    <>
      {/* Palito de dente */}
      <rect x="24" y="27" width="1" height="1" fill="#ecd9a0" />
      <rect x="25" y="28" width="2" height="1" fill="#ecd9a0" />
      <rect x="27" y="29" width="1" height="1" fill="#ecd9a0" />
      <rect x="25" y="29" width="2" height="1" fill="#a88f55" />
    </>
  );
}

/** Valdir Borracheiro: bandana encardida, barba cerrada, graxa, macacão com alças, palito e pneu no ombro. */
export function ValdirAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  const speaking = isSpeaking && mood !== 'hurt';
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Fundo de sombra da silhueta */}
      <rect x="6" y="4" width="8" height="1" fill="#090a0f" />
      <rect x="26" y="4" width="8" height="1" fill="#090a0f" />
      <rect x="6" y="5" width="6" height="1" fill="#090a0f" />
      <rect x="28" y="5" width="6" height="1" fill="#090a0f" />
      <rect x="6" y="6" width="4" height="6" fill="#090a0f" />
      <rect x="30" y="6" width="4" height="3" fill="#090a0f" />
      <rect x="32" y="9" width="2" height="4" fill="#090a0f" />
      <rect x="6" y="12" width="3" height="5" fill="#090a0f" />
      <rect x="6" y="17" width="1" height="16" fill="#090a0f" />
      <rect x="7" y="23" width="2" height="10" fill="#090a0f" />
      <rect x="9" y="30" width="1" height="3" fill="#090a0f" />
      <rect x="10" y="31" width="1" height="2" fill="#090a0f" />
      <rect x="11" y="32" width="1" height="1" fill="#090a0f" />
      <rect x="28" y="32" width="1" height="1" fill="#090a0f" />
      {/* Pneu pendurado no ombro */}
      <rect x="39" y="14" width="1" height="2" fill="#303337" />
      <rect x="37" y="16" width="2" height="2" fill="#303337" />
      <rect x="36" y="17" width="1" height="1" fill="#303337" />
      <rect x="39" y="17" width="1" height="10" fill="#303337" />
      <rect x="38" y="18" width="1" height="2" fill="#303337" />
      <rect x="37" y="22" width="2" height="1" fill="#303337" />
      <rect x="37" y="23" width="1" height="6" fill="#303337" />
      <rect x="38" y="24" width="1" height="4" fill="#303337" />
      <rect x="36" y="25" width="1" height="4" fill="#303337" />
      <rect x="33" y="26" width="3" height="1" fill="#303337" />
      <rect x="33" y="27" width="1" height="3" fill="#303337" />
      <rect x="35" y="27" width="1" height="3" fill="#303337" />
      <rect x="31" y="28" width="2" height="1" fill="#303337" />
      <rect x="34" y="28" width="1" height="2" fill="#303337" />
      <rect x="30" y="30" width="1" height="1" fill="#303337" />
      <rect x="38" y="31" width="2" height="2" fill="#303337" />
      <rect x="33" y="32" width="3" height="1" fill="#303337" />
      <rect x="34" y="33" width="2" height="1" fill="#303337" />
      <rect x="34" y="17" width="2" height="1" fill="#17181a" />
      <rect x="36" y="18" width="2" height="1" fill="#17181a" />
      <rect x="34" y="19" width="1" height="1" fill="#17181a" />
      <rect x="34" y="22" width="1" height="3" fill="#17181a" />
      <rect x="33" y="23" width="1" height="1" fill="#17181a" />
      <rect x="35" y="23" width="1" height="1" fill="#17181a" />
      <rect x="38" y="23" width="1" height="1" fill="#17181a" />
      <rect x="34" y="27" width="1" height="1" fill="#17181a" />
      <rect x="39" y="27" width="1" height="4" fill="#17181a" />
      <rect x="38" y="28" width="1" height="3" fill="#17181a" />
      <rect x="31" y="29" width="2" height="4" fill="#17181a" />
      <rect x="36" y="29" width="2" height="5" fill="#17181a" />
      <rect x="33" y="30" width="3" height="2" fill="#17181a" />
      <rect x="33" y="13" width="3" height="1" fill="#4d5155" />
      <rect x="34" y="14" width="2" height="3" fill="#4d5155" />
      <rect x="38" y="14" width="1" height="2" fill="#4d5155" />
      <rect x="36" y="15" width="1" height="2" fill="#4d5155" />
      <rect x="31" y="16" width="1" height="1" fill="#4d5155" />
      <rect x="39" y="16" width="1" height="1" fill="#4d5155" />
      <rect x="29" y="31" width="2" height="2" fill="#4d5155" />
      <rect x="33" y="18" width="3" height="1" fill="#8d949a" />
      <rect x="33" y="19" width="1" height="2" fill="#8d949a" />
      <rect x="35" y="19" width="1" height="2" fill="#8d949a" />
      <rect x="34" y="20" width="1" height="1" fill="#8d949a" />
      <rect x="35" y="22" width="2" height="1" fill="#8d949a" />
      <rect x="31" y="23" width="1" height="2" fill="#8d949a" />
      <rect x="36" y="23" width="1" height="2" fill="#8d949a" />
      <rect x="33" y="24" width="1" height="2" fill="#8d949a" />
      <rect x="35" y="24" width="1" height="2" fill="#8d949a" />
      <rect x="34" y="25" width="1" height="1" fill="#8d949a" />
      <rect x="36" y="19" width="2" height="3" fill="#5a6066" />
      <rect x="38" y="20" width="1" height="2" fill="#5a6066" />
      <rect x="31" y="25" width="2" height="3" fill="#5a6066" />
      <rect x="33" y="21" width="3" height="1" fill="#c3c9ce" />
      <rect x="33" y="22" width="1" height="1" fill="#c3c9ce" />
      <rect x="32" y="23" width="1" height="2" fill="#c3c9ce" />
      <rect x="36" y="13" width="2" height="2" fill="#7c8186" />
      <rect x="37" y="15" width="1" height="1" fill="#7c8186" />
      {/* Bandana encardida */}
      <rect x="19" y="4" width="7" height="1" fill="#60676e" />
      <rect x="19" y="5" width="2" height="2" fill="#60676e" />
      <rect x="22" y="5" width="2" height="2" fill="#60676e" />
      <rect x="10" y="6" width="1" height="1" fill="#60676e" />
      <rect x="17" y="6" width="1" height="2" fill="#60676e" />
      <rect x="21" y="6" width="1" height="6" fill="#60676e" />
      <rect x="24" y="6" width="1" height="3" fill="#60676e" />
      <rect x="18" y="7" width="1" height="5" fill="#60676e" />
      <rect x="20" y="7" width="1" height="2" fill="#60676e" />
      <rect x="22" y="7" width="1" height="3" fill="#60676e" />
      <rect x="19" y="8" width="1" height="4" fill="#60676e" />
      <rect x="23" y="8" width="1" height="4" fill="#60676e" />
      <rect x="17" y="9" width="1" height="3" fill="#60676e" />
      <rect x="11" y="10" width="2" height="2" fill="#60676e" />
      <rect x="14" y="10" width="3" height="1" fill="#60676e" />
      <rect x="20" y="10" width="1" height="2" fill="#60676e" />
      <rect x="24" y="10" width="1" height="2" fill="#60676e" />
      <rect x="13" y="11" width="2" height="1" fill="#60676e" />
      <rect x="16" y="11" width="1" height="1" fill="#60676e" />
      <rect x="22" y="11" width="1" height="1" fill="#60676e" />
      <rect x="14" y="4" width="5" height="1" fill="#80888f" />
      <rect x="12" y="5" width="1" height="1" fill="#80888f" />
      <rect x="16" y="5" width="3" height="1" fill="#80888f" />
      <rect x="21" y="5" width="1" height="1" fill="#80888f" />
      <rect x="11" y="6" width="1" height="4" fill="#80888f" />
      <rect x="15" y="6" width="2" height="4" fill="#80888f" />
      <rect x="18" y="6" width="1" height="1" fill="#80888f" />
      <rect x="23" y="7" width="1" height="1" fill="#80888f" />
      <rect x="12" y="8" width="3" height="2" fill="#80888f" />
      <rect x="20" y="9" width="1" height="1" fill="#80888f" />
      <rect x="13" y="10" width="1" height="1" fill="#80888f" />
      <rect x="22" y="10" width="1" height="1" fill="#80888f" />
      <rect x="10" y="12" width="10" height="1" fill="#80888f" />
      <rect x="24" y="5" width="4" height="1" fill="#454b51" />
      <rect x="25" y="6" width="3" height="6" fill="#454b51" />
      <rect x="10" y="7" width="1" height="5" fill="#454b51" />
      <rect x="19" y="7" width="1" height="1" fill="#454b51" />
      <rect x="17" y="8" width="1" height="1" fill="#454b51" />
      <rect x="9" y="12" width="1" height="1" fill="#454b51" />
      <rect x="20" y="12" width="6" height="1" fill="#454b51" />
      <rect x="28" y="6" width="2" height="3" fill="#2b2f33" />
      <rect x="28" y="9" width="1" height="5" fill="#2b2f33" />
      <rect x="26" y="12" width="2" height="2" fill="#2b2f33" />
      <rect x="9" y="13" width="17" height="1" fill="#2b2f33" />
      <rect x="29" y="13" width="1" height="1" fill="#2b2f33" />
      <rect x="13" y="5" width="3" height="1" fill="#a3abb2" />
      <rect x="12" y="6" width="3" height="2" fill="#a3abb2" />
      <rect x="24" y="9" width="1" height="1" fill="#141618" />
      <rect x="15" y="11" width="1" height="1" fill="#141618" />
      {/* Nó da bandana */}
      <rect x="30" y="9" width="2" height="1" fill="#60676e" />
      <rect x="29" y="10" width="2" height="3" fill="#60676e" />
      <rect x="31" y="13" width="1" height="1" fill="#60676e" />
      <rect x="32" y="14" width="1" height="3" fill="#60676e" />
      <rect x="31" y="15" width="1" height="1" fill="#60676e" />
      <rect x="31" y="10" width="1" height="3" fill="#2b2f33" />
      <rect x="32" y="13" width="1" height="1" fill="#2b2f33" />
      <rect x="33" y="14" width="1" height="4" fill="#2b2f33" />
      <rect x="29" y="9" width="1" height="1" fill="#80888f" />
      <rect x="30" y="13" width="1" height="1" fill="#80888f" />
      <rect x="31" y="14" width="1" height="1" fill="#80888f" />
      {/* Rosto largo (sombreamento triplo) */}
      <rect x="11" y="15" width="1" height="1" fill="#b8845a" />
      <rect x="15" y="15" width="3" height="9" fill="#b8845a" />
      <rect x="13" y="16" width="2" height="6" fill="#b8845a" />
      <rect x="18" y="16" width="8" height="1" fill="#b8845a" />
      <rect x="18" y="17" width="1" height="4" fill="#b8845a" />
      <rect x="22" y="17" width="4" height="3" fill="#b8845a" />
      <rect x="19" y="20" width="1" height="1" fill="#b8845a" />
      <rect x="23" y="20" width="3" height="1" fill="#b8845a" />
      <rect x="24" y="21" width="2" height="3" fill="#b8845a" />
      <rect x="13" y="23" width="2" height="1" fill="#b8845a" />
      <rect x="23" y="23" width="1" height="1" fill="#b8845a" />
      <rect x="13" y="24" width="1" height="1" fill="#b8845a" />
      <rect x="9" y="14" width="22" height="1" fill="#5c3921" />
      <rect x="28" y="15" width="3" height="8" fill="#5c3921" />
      <rect x="29" y="23" width="2" height="1" fill="#5c3921" />
      <rect x="30" y="24" width="1" height="6" fill="#5c3921" />
      <rect x="28" y="30" width="2" height="1" fill="#5c3921" />
      <rect x="9" y="15" width="2" height="1" fill="#8a5a38" />
      <rect x="18" y="15" width="10" height="1" fill="#8a5a38" />
      <rect x="9" y="16" width="1" height="14" fill="#8a5a38" />
      <rect x="26" y="16" width="2" height="3" fill="#8a5a38" />
      <rect x="26" y="21" width="2" height="2" fill="#8a5a38" />
      <rect x="10" y="30" width="1" height="1" fill="#8a5a38" />
      <rect x="11" y="31" width="1" height="1" fill="#8a5a38" />
      <rect x="27" y="31" width="2" height="1" fill="#8a5a38" />
      <rect x="10" y="16" width="1" height="7" fill="#cd9b6b" />
      <rect x="12" y="16" width="1" height="5" fill="#cd9b6b" />
      <rect x="11" y="20" width="1" height="1" fill="#cd9b6b" />
      <rect x="11" y="22" width="1" height="1" fill="#cd9b6b" />
      <rect x="11" y="16" width="1" height="4" fill="#e2b387" />
      {/* Orelhas de abano */}
      <rect x="31" y="17" width="2" height="1" fill="#8a5a38" />
      <rect x="8" y="18" width="1" height="4" fill="#8a5a38" />
      <rect x="32" y="18" width="1" height="5" fill="#8a5a38" />
      <rect x="7" y="22" width="1" height="1" fill="#8a5a38" />
      <rect x="31" y="22" width="1" height="1" fill="#8a5a38" />
      <rect x="7" y="17" width="2" height="1" fill="#cd9b6b" />
      <rect x="7" y="18" width="1" height="4" fill="#cd9b6b" />
      <rect x="8" y="22" width="1" height="1" fill="#cd9b6b" />
      <rect x="31" y="18" width="1" height="4" fill="#5c3921" />
      {/* Nariz quebrado */}
      <rect x="21" y="17" width="1" height="3" fill="#8a5a38" />
      <rect x="22" y="20" width="1" height="3" fill="#8a5a38" />
      <rect x="23" y="21" width="1" height="2" fill="#8a5a38" />
      <rect x="19" y="23" width="3" height="1" fill="#8a5a38" />
      <rect x="20" y="17" width="1" height="4" fill="#cd9b6b" />
      <rect x="19" y="18" width="1" height="2" fill="#cd9b6b" />
      <rect x="21" y="20" width="1" height="1" fill="#cd9b6b" />
      <rect x="18" y="22" width="1" height="1" fill="#cd9b6b" />
      <rect x="20" y="21" width="2" height="2" fill="#b8845a" />
      <rect x="19" y="22" width="1" height="1" fill="#b8845a" />
      <rect x="19" y="17" width="1" height="1" fill="#e2b387" />
      <rect x="18" y="21" width="2" height="1" fill="#e2b387" />
      <rect x="18" y="23" width="1" height="1" fill="#5c3921" />
      <rect x="22" y="23" width="1" height="1" fill="#5c3921" />
      {/* Barba por fazer cerrada */}
      <rect x="10" y="23" width="3" height="3" fill="#8a6446" />
      <rect x="14" y="24" width="12" height="1" fill="#8a6446" />
      <rect x="13" y="25" width="3" height="3" fill="#8a6446" />
      <rect x="24" y="25" width="2" height="1" fill="#8a6446" />
      <rect x="12" y="26" width="1" height="3" fill="#8a6446" />
      <rect x="16" y="26" width="9" height="2" fill="#8a6446" />
      <rect x="10" y="27" width="2" height="1" fill="#8a6446" />
      <rect x="25" y="27" width="1" height="4" fill="#8a6446" />
      <rect x="10" y="28" width="1" height="2" fill="#8a6446" />
      <rect x="14" y="28" width="10" height="1" fill="#8a6446" />
      <rect x="11" y="29" width="1" height="2" fill="#8a6446" />
      <rect x="13" y="29" width="4" height="1" fill="#8a6446" />
      <rect x="18" y="29" width="7" height="1" fill="#8a6446" />
      <rect x="12" y="30" width="3" height="1" fill="#8a6446" />
      <rect x="16" y="30" width="5" height="1" fill="#8a6446" />
      <rect x="22" y="30" width="3" height="1" fill="#8a6446" />
      <rect x="26" y="23" width="3" height="1" fill="#5e4330" />
      <rect x="26" y="24" width="2" height="7" fill="#5e4330" />
      <rect x="16" y="25" width="8" height="1" fill="#5e4330" />
      <rect x="11" y="26" width="1" height="1" fill="#5e4330" />
      <rect x="25" y="26" width="1" height="1" fill="#5e4330" />
      <rect x="13" y="28" width="1" height="1" fill="#5e4330" />
      <rect x="24" y="28" width="1" height="1" fill="#5e4330" />
      <rect x="12" y="29" width="1" height="1" fill="#5e4330" />
      <rect x="17" y="29" width="1" height="1" fill="#5e4330" />
      <rect x="15" y="30" width="1" height="2" fill="#5e4330" />
      <rect x="21" y="30" width="1" height="2" fill="#5e4330" />
      <rect x="12" y="31" width="3" height="1" fill="#5e4330" />
      <rect x="16" y="31" width="5" height="1" fill="#5e4330" />
      <rect x="22" y="31" width="5" height="1" fill="#5e4330" />
      <rect x="28" y="24" width="2" height="6" fill="#5c3921" />
      <rect x="10" y="26" width="1" height="1" fill="#b8845a" />
      <rect x="11" y="28" width="1" height="1" fill="#b8845a" />
      {/* Manchas de graxa */}
      <rect x="13" y="15" width="2" height="1" fill="#141618" />
      <rect x="27" y="19" width="1" height="2" fill="#141618" />
      <rect x="26" y="20" width="1" height="1" fill="#141618" />
      <rect x="12" y="21" width="1" height="2" fill="#141618" />
      <rect x="13" y="22" width="2" height="1" fill="#141618" />
      <rect x="12" y="15" width="1" height="1" fill="#4a5054" />
      <rect x="26" y="19" width="1" height="1" fill="#4a5054" />
      <rect x="11" y="21" width="1" height="1" fill="#4a5054" />
      {/* Pescoço grosso */}
      <rect x="12" y="32" width="1" height="1" fill="#8a5a38" />
      <rect x="17" y="32" width="11" height="1" fill="#8a5a38" />
      <rect x="13" y="32" width="4" height="1" fill="#b8845a" />
      {/* Camiseta encardida */}
      <rect x="6" y="33" width="1" height="1" fill="#aca38e" />
      <rect x="4" y="34" width="1" height="2" fill="#aca38e" />
      <rect x="13" y="34" width="12" height="1" fill="#aca38e" />
      <rect x="26" y="34" width="1" height="4" fill="#aca38e" />
      <rect x="13" y="35" width="3" height="1" fill="#aca38e" />
      <rect x="18" y="35" width="8" height="1" fill="#aca38e" />
      <rect x="5" y="36" width="4" height="1" fill="#aca38e" />
      <rect x="13" y="36" width="2" height="2" fill="#aca38e" />
      <rect x="19" y="36" width="7" height="2" fill="#aca38e" />
      <rect x="5" y="37" width="2" height="3" fill="#aca38e" />
      <rect x="8" y="37" width="1" height="3" fill="#aca38e" />
      <rect x="7" y="38" width="1" height="2" fill="#aca38e" />
      <rect x="13" y="33" width="1" height="1" fill="#8b836f" />
      <rect x="26" y="33" width="1" height="1" fill="#8b836f" />
      <rect x="31" y="33" width="3" height="7" fill="#8b836f" />
      <rect x="34" y="34" width="2" height="1" fill="#8b836f" />
      <rect x="34" y="35" width="1" height="5" fill="#8b836f" />
      <rect x="4" y="36" width="1" height="4" fill="#8b836f" />
      <rect x="7" y="33" width="2" height="3" fill="#cbc2ad" />
      <rect x="5" y="34" width="2" height="2" fill="#cbc2ad" />
      <rect x="15" y="33" width="10" height="1" fill="#5c3921" />
      <rect x="35" y="35" width="1" height="5" fill="#615a4a" />
      <rect x="14" y="33" width="1" height="1" fill="#8a5a38" />
      <rect x="25" y="33" width="1" height="1" fill="#8a5a38" />
      <rect x="25" y="34" width="1" height="1" fill="#6e6048" />
      <rect x="7" y="37" width="1" height="1" fill="#6e6048" />
      {/* Macacão cinza-azulado com alças */}
      <rect x="10" y="33" width="2" height="3" fill="#586470" />
      <rect x="27" y="33" width="1" height="3" fill="#586470" />
      <rect x="10" y="38" width="2" height="2" fill="#586470" />
      <rect x="20" y="38" width="8" height="1" fill="#586470" />
      <rect x="27" y="39" width="1" height="1" fill="#586470" />
      <rect x="28" y="33" width="2" height="3" fill="#46505a" />
      <rect x="28" y="38" width="2" height="2" fill="#46505a" />
      <rect x="13" y="39" width="11" height="1" fill="#46505a" />
      <rect x="12" y="33" width="1" height="3" fill="#323a42" />
      <rect x="12" y="38" width="1" height="2" fill="#323a42" />
      <rect x="24" y="39" width="3" height="1" fill="#323a42" />
      <rect x="9" y="33" width="1" height="3" fill="#72808c" />
      <rect x="9" y="38" width="1" height="2" fill="#72808c" />
      <rect x="13" y="38" width="2" height="1" fill="#72808c" />
      <rect x="30" y="33" width="1" height="3" fill="#1f252a" />
      <rect x="30" y="38" width="1" height="2" fill="#1f252a" />
      {/* Fivelas de metal */}
      <rect x="11" y="36" width="2" height="1" fill="#9ca2a8" />
      <rect x="27" y="36" width="2" height="1" fill="#9ca2a8" />
      <rect x="9" y="37" width="3" height="1" fill="#9ca2a8" />
      <rect x="29" y="36" width="2" height="2" fill="#5c6268" />
      <rect x="12" y="37" width="1" height="1" fill="#5c6268" />
      <rect x="27" y="37" width="2" height="1" fill="#5c6268" />
      <rect x="9" y="36" width="2" height="1" fill="#e2e6ea" />
      {/* Estopa vermelha no bolso */}
      <rect x="17" y="35" width="1" height="3" fill="#a8322a" />
      <rect x="16" y="36" width="1" height="2" fill="#a8322a" />
      <rect x="18" y="36" width="1" height="1" fill="#a8322a" />
      <rect x="15" y="37" width="1" height="1" fill="#a8322a" />
      <rect x="15" y="38" width="5" height="1" fill="#323a42" />
      <rect x="16" y="35" width="1" height="1" fill="#d65040" />
      <rect x="15" y="36" width="1" height="1" fill="#d65040" />
      <rect x="18" y="37" width="1" height="1" fill="#6e1e18" />
      <ValdirEyes mood={mood} />
      <ValdirMouth mood={mood} speaking={speaking} />
      <ValdirExtras mood={mood} />
    </PixelSvg>
  );
}

// ---------------------------------------------------------------------------
// 4. DONA NEIDE — "A Rainha da Tranca" (vinho)
// ---------------------------------------------------------------------------

/** Óculos de gatinho e olhar desconfiado da Neide por humor (ferida, os óculos entortam). */
function NeideEyes({ mood }) {
  if (mood === 'thinking') {
    return (
      <>
      {/* Sobrancelhas pintadas */}
      <rect x="23" y="14" width="3" height="1" fill="#6e6a66" />
      <rect x="22" y="15" width="1" height="1" fill="#6e6a66" />
      <rect x="26" y="15" width="1" height="1" fill="#6e6a66" />
      <rect x="13" y="16" width="4" height="1" fill="#6e6a66" />
      {/* Óculos de gatinho */}
      <rect x="9" y="17" width="2" height="1" fill="#420e1e" />
      <rect x="29" y="17" width="2" height="1" fill="#420e1e" />
      <rect x="17" y="18" width="1" height="3" fill="#420e1e" />
      <rect x="28" y="18" width="1" height="2" fill="#420e1e" />
      <rect x="12" y="20" width="1" height="1" fill="#420e1e" />
      <rect x="27" y="20" width="1" height="1" fill="#420e1e" />
      <rect x="13" y="21" width="4" height="1" fill="#420e1e" />
      <rect x="23" y="21" width="4" height="1" fill="#420e1e" />
      <rect x="14" y="17" width="4" height="1" fill="#741c36" />
      <rect x="25" y="17" width="4" height="1" fill="#741c36" />
      <rect x="11" y="18" width="1" height="2" fill="#741c36" />
      <rect x="19" y="18" width="4" height="1" fill="#741c36" />
      <rect x="22" y="19" width="1" height="2" fill="#741c36" />
      <rect x="15" y="18" width="2" height="3" fill="#cfdfdc" />
      <rect x="26" y="18" width="2" height="2" fill="#cfdfdc" />
      <rect x="13" y="20" width="2" height="1" fill="#cfdfdc" />
      <rect x="23" y="20" width="4" height="1" fill="#cfdfdc" />
      <rect x="11" y="17" width="3" height="1" fill="#a8344f" />
      <rect x="22" y="17" width="3" height="1" fill="#a8344f" />
      <rect x="18" y="18" width="1" height="1" fill="#a8344f" />
      <rect x="10" y="16" width="1" height="1" fill="#e8b854" />
      <rect x="29" y="16" width="1" height="1" fill="#e8b854" />
      <rect x="11" y="16" width="1" height="1" fill="#a87a28" />
      <rect x="28" y="16" width="1" height="1" fill="#a87a28" />
      {/* Olhos atrás das lentes */}
      <rect x="14" y="18" width="1" height="2" fill="#1a0f0b" />
      <rect x="25" y="18" width="1" height="2" fill="#1a0f0b" />
      <rect x="13" y="19" width="1" height="1" fill="#1a0f0b" />
      <rect x="24" y="19" width="1" height="1" fill="#1a0f0b" />
      {/* Brilho das lentes */}
      <rect x="13" y="18" width="1" height="1" fill="#e9f2f0" />
      <rect x="24" y="18" width="1" height="1" fill="#e9f2f0" />
      <rect x="12" y="19" width="1" height="1" fill="#e9f2f0" />
      <rect x="23" y="19" width="1" height="1" fill="#e9f2f0" />
      <rect x="12" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="23" y="18" width="1" height="1" fill="#ffffff" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Sobrancelhas pintadas */}
      <rect x="23" y="15" width="4" height="1" fill="#6e6a66" />
      <rect x="13" y="16" width="4" height="1" fill="#6e6a66" />
      {/* Óculos de gatinho */}
      <rect x="9" y="17" width="2" height="1" fill="#420e1e" />
      <rect x="29" y="17" width="2" height="1" fill="#420e1e" />
      <rect x="17" y="18" width="1" height="3" fill="#420e1e" />
      <rect x="28" y="18" width="1" height="2" fill="#420e1e" />
      <rect x="12" y="20" width="1" height="1" fill="#420e1e" />
      <rect x="27" y="20" width="1" height="1" fill="#420e1e" />
      <rect x="13" y="21" width="4" height="1" fill="#420e1e" />
      <rect x="23" y="21" width="4" height="1" fill="#420e1e" />
      <rect x="14" y="17" width="4" height="1" fill="#741c36" />
      <rect x="25" y="17" width="4" height="1" fill="#741c36" />
      <rect x="11" y="18" width="1" height="2" fill="#741c36" />
      <rect x="19" y="18" width="4" height="1" fill="#741c36" />
      <rect x="22" y="19" width="1" height="2" fill="#741c36" />
      <rect x="11" y="17" width="3" height="1" fill="#a8344f" />
      <rect x="22" y="17" width="3" height="1" fill="#a8344f" />
      <rect x="18" y="18" width="1" height="1" fill="#a8344f" />
      <rect x="13" y="20" width="1" height="1" fill="#cfdfdc" />
      <rect x="16" y="20" width="1" height="1" fill="#cfdfdc" />
      <rect x="23" y="20" width="2" height="1" fill="#cfdfdc" />
      <rect x="10" y="16" width="1" height="1" fill="#e8b854" />
      <rect x="29" y="16" width="1" height="1" fill="#e8b854" />
      <rect x="11" y="16" width="1" height="1" fill="#a87a28" />
      <rect x="28" y="16" width="1" height="1" fill="#a87a28" />
      {/* Olhos atrás das lentes */}
      <rect x="13" y="19" width="4" height="1" fill="#420e1e" />
      <rect x="24" y="19" width="4" height="1" fill="#420e1e" />
      <rect x="14" y="18" width="2" height="1" fill="#d6b49e" />
      <rect x="25" y="18" width="2" height="1" fill="#d6b49e" />
      <rect x="14" y="20" width="2" height="1" fill="#1a0f0b" />
      <rect x="25" y="20" width="2" height="1" fill="#1a0f0b" />
      {/* Brilho das lentes */}
      <rect x="12" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="16" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="23" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="27" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="13" y="18" width="1" height="1" fill="#e9f2f0" />
      <rect x="24" y="18" width="1" height="1" fill="#e9f2f0" />
      <rect x="12" y="19" width="1" height="1" fill="#e9f2f0" />
      <rect x="23" y="19" width="1" height="1" fill="#e9f2f0" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Sobrancelhas pintadas */}
      <rect x="15" y="15" width="2" height="1" fill="#6e6a66" />
      <rect x="23" y="15" width="2" height="1" fill="#6e6a66" />
      <rect x="13" y="16" width="2" height="1" fill="#6e6a66" />
      <rect x="25" y="16" width="2" height="1" fill="#6e6a66" />
      {/* Óculos de gatinho */}
      <rect x="9" y="18" width="2" height="1" fill="#420e1e" />
      <rect x="17" y="19" width="1" height="3" fill="#420e1e" />
      <rect x="29" y="19" width="2" height="1" fill="#420e1e" />
      <rect x="28" y="20" width="1" height="2" fill="#420e1e" />
      <rect x="12" y="21" width="1" height="1" fill="#420e1e" />
      <rect x="13" y="22" width="4" height="1" fill="#420e1e" />
      <rect x="27" y="22" width="1" height="1" fill="#420e1e" />
      <rect x="23" y="23" width="4" height="1" fill="#420e1e" />
      <rect x="14" y="19" width="3" height="1" fill="#cfdfdc" />
      <rect x="12" y="20" width="2" height="1" fill="#cfdfdc" />
      <rect x="16" y="20" width="1" height="2" fill="#cfdfdc" />
      <rect x="24" y="20" width="2" height="1" fill="#cfdfdc" />
      <rect x="27" y="20" width="1" height="2" fill="#cfdfdc" />
      <rect x="14" y="21" width="2" height="1" fill="#cfdfdc" />
      <rect x="23" y="21" width="1" height="2" fill="#cfdfdc" />
      <rect x="26" y="21" width="1" height="1" fill="#cfdfdc" />
      <rect x="24" y="22" width="2" height="1" fill="#cfdfdc" />
      <rect x="14" y="18" width="4" height="1" fill="#741c36" />
      <rect x="11" y="19" width="1" height="2" fill="#741c36" />
      <rect x="19" y="19" width="3" height="1" fill="#741c36" />
      <rect x="25" y="19" width="4" height="1" fill="#741c36" />
      <rect x="22" y="20" width="1" height="3" fill="#741c36" />
      <rect x="11" y="18" width="3" height="1" fill="#a8344f" />
      <rect x="18" y="19" width="1" height="1" fill="#a8344f" />
      <rect x="22" y="19" width="3" height="1" fill="#a8344f" />
      <rect x="10" y="17" width="1" height="1" fill="#e8b854" />
      <rect x="29" y="18" width="1" height="1" fill="#e8b854" />
      <rect x="11" y="17" width="1" height="1" fill="#a87a28" />
      <rect x="28" y="18" width="1" height="1" fill="#a87a28" />
      {/* Olhos espremidos */}
      <rect x="13" y="19" width="1" height="1" fill="#1a0f0b" />
      <rect x="14" y="20" width="2" height="1" fill="#1a0f0b" />
      <rect x="26" y="20" width="1" height="1" fill="#1a0f0b" />
      <rect x="13" y="21" width="1" height="1" fill="#1a0f0b" />
      <rect x="24" y="21" width="2" height="1" fill="#1a0f0b" />
      <rect x="26" y="22" width="1" height="1" fill="#1a0f0b" />
      <rect x="12" y="19" width="1" height="1" fill="#ffffff" />
      <rect x="23" y="20" width="1" height="1" fill="#ffffff" />
      </>
    );
  }
  return (
    <>
      {/* Sobrancelhas pintadas */}
      <rect x="13" y="15" width="3" height="1" fill="#6e6a66" />
      <rect x="23" y="15" width="4" height="1" fill="#6e6a66" />
      <rect x="16" y="16" width="1" height="1" fill="#6e6a66" />
      <rect x="22" y="16" width="1" height="1" fill="#6e6a66" />
      {/* Óculos de gatinho */}
      <rect x="9" y="17" width="2" height="1" fill="#420e1e" />
      <rect x="29" y="17" width="2" height="1" fill="#420e1e" />
      <rect x="17" y="18" width="1" height="3" fill="#420e1e" />
      <rect x="28" y="18" width="1" height="2" fill="#420e1e" />
      <rect x="12" y="20" width="1" height="1" fill="#420e1e" />
      <rect x="13" y="21" width="4" height="1" fill="#420e1e" />
      <rect x="23" y="21" width="4" height="1" fill="#420e1e" />
      <rect x="14" y="17" width="4" height="1" fill="#741c36" />
      <rect x="25" y="17" width="4" height="1" fill="#741c36" />
      <rect x="11" y="18" width="1" height="2" fill="#741c36" />
      <rect x="19" y="18" width="4" height="1" fill="#741c36" />
      <rect x="22" y="19" width="1" height="2" fill="#741c36" />
      <rect x="13" y="19" width="2" height="2" fill="#cfdfdc" />
      <rect x="24" y="19" width="2" height="2" fill="#cfdfdc" />
      <rect x="23" y="20" width="1" height="1" fill="#cfdfdc" />
      <rect x="11" y="17" width="3" height="1" fill="#a8344f" />
      <rect x="22" y="17" width="3" height="1" fill="#a8344f" />
      <rect x="18" y="18" width="1" height="1" fill="#a8344f" />
      <rect x="10" y="16" width="1" height="1" fill="#e8b854" />
      <rect x="29" y="16" width="1" height="1" fill="#e8b854" />
      <rect x="11" y="16" width="1" height="1" fill="#a87a28" />
      <rect x="28" y="16" width="1" height="1" fill="#a87a28" />
      {/* Olhos atrás das lentes */}
      <rect x="15" y="19" width="2" height="2" fill="#1a0f0b" />
      <rect x="26" y="19" width="2" height="2" fill="#1a0f0b" />
      <rect x="14" y="18" width="3" height="1" fill="#d6b49e" />
      <rect x="25" y="18" width="3" height="1" fill="#d6b49e" />
      {/* Brilho das lentes */}
      <rect x="13" y="18" width="1" height="1" fill="#e9f2f0" />
      <rect x="24" y="18" width="1" height="1" fill="#e9f2f0" />
      <rect x="12" y="19" width="1" height="1" fill="#e9f2f0" />
      <rect x="23" y="19" width="1" height="1" fill="#e9f2f0" />
      <rect x="12" y="18" width="1" height="1" fill="#ffffff" />
      <rect x="23" y="18" width="1" height="1" fill="#ffffff" />
    </>
  );
}

/** Boca de batom vinho da Neide; falando, abre. */
function NeideMouth({ mood, speaking }) {
  if (speaking) {
    return (
      <>
      {/* Boca de batom vinho */}
      <rect x="17" y="27" width="6" height="1" fill="#2a0a10" />
      <rect x="17" y="28" width="1" height="1" fill="#2a0a10" />
      <rect x="22" y="28" width="1" height="1" fill="#2a0a10" />
      <rect x="17" y="26" width="6" height="1" fill="#7a1730" />
      <rect x="17" y="29" width="6" height="1" fill="#b03250" />
      <rect x="18" y="28" width="4" height="1" fill="#b8473c" />
      </>
    );
  }
  if (mood === 'thinking') {
    return (
      <>
      {/* Boca de batom vinho */}
      <rect x="19" y="27" width="3" height="1" fill="#7a1730" />
      <rect x="19" y="28" width="3" height="1" fill="#b03250" />
      <rect x="18" y="27" width="1" height="1" fill="#b27a56" />
      </>
    );
  }
  if (mood === 'smug') {
    return (
      <>
      {/* Boca de batom vinho */}
      <rect x="24" y="25" width="1" height="1" fill="#7a1730" />
      <rect x="21" y="26" width="3" height="1" fill="#7a1730" />
      <rect x="17" y="27" width="4" height="1" fill="#7a1730" />
      <rect x="18" y="28" width="4" height="1" fill="#b03250" />
      </>
    );
  }
  if (mood === 'hurt') {
    return (
      <>
      {/* Boca de batom vinho */}
      <rect x="16" y="27" width="1" height="2" fill="#2a0a10" />
      <rect x="23" y="27" width="1" height="2" fill="#2a0a10" />
      <rect x="17" y="28" width="6" height="1" fill="#2a0a10" />
      <rect x="16" y="26" width="8" height="1" fill="#7a1730" />
      <rect x="16" y="29" width="8" height="1" fill="#b03250" />
      <rect x="17" y="27" width="6" height="1" fill="#efe7d4" />
      </>
    );
  }
  return (
    <>
      {/* Boca de batom vinho */}
      <rect x="19" y="27" width="2" height="2" fill="#b03250" />
      <rect x="18" y="28" width="1" height="1" fill="#b03250" />
      <rect x="21" y="28" width="1" height="1" fill="#b03250" />
      <rect x="17" y="27" width="2" height="1" fill="#7a1730" />
      <rect x="21" y="27" width="2" height="1" fill="#7a1730" />
      <rect x="16" y="28" width="1" height="1" fill="#b27a56" />
      <rect x="23" y="28" width="1" height="1" fill="#b27a56" />
    </>
  );
}

/** Suor da Neide quando leva o golpe. */
function NeideExtras({ mood }) {
  if (mood === 'hurt') {
    return (
      <>
      {/* Suor de nervoso */}
      <rect x="26" y="14" width="1" height="2" fill="#f4fcff" />
      <rect x="27" y="15" width="1" height="1" fill="#a9d9ec" />
      <rect x="26" y="16" width="1" height="1" fill="#a9d9ec" />
      <rect x="27" y="16" width="1" height="1" fill="#5b95b0" />
      </>
    );
  }
  return null;
}

/** Dona Neide: coque grisalho, óculos de gatinho, pérolas, batom e cardigã vinho, dedal de chumbo no dedo erguido. */
export function NeideAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  const speaking = isSpeaking && mood !== 'hurt';
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Fundo de sombra da silhueta */}
      <rect x="6" y="4" width="8" height="2" fill="#090a0f" />
      <rect x="26" y="4" width="8" height="2" fill="#090a0f" />
      <rect x="6" y="6" width="6" height="1" fill="#090a0f" />
      <rect x="28" y="6" width="6" height="1" fill="#090a0f" />
      <rect x="6" y="7" width="4" height="1" fill="#090a0f" />
      <rect x="30" y="7" width="4" height="1" fill="#090a0f" />
      <rect x="6" y="8" width="3" height="2" fill="#090a0f" />
      <rect x="31" y="8" width="3" height="2" fill="#090a0f" />
      <rect x="6" y="10" width="2" height="24" fill="#090a0f" />
      <rect x="32" y="10" width="2" height="10" fill="#090a0f" />
      <rect x="8" y="22" width="1" height="12" fill="#090a0f" />
      <rect x="9" y="23" width="1" height="11" fill="#090a0f" />
      <rect x="30" y="23" width="1" height="5" fill="#090a0f" />
      <rect x="10" y="25" width="2" height="8" fill="#090a0f" />
      <rect x="28" y="25" width="2" height="4" fill="#090a0f" />
      <rect x="31" y="25" width="1" height="3" fill="#090a0f" />
      <rect x="12" y="28" width="1" height="5" fill="#090a0f" />
      <rect x="27" y="28" width="1" height="5" fill="#090a0f" />
      <rect x="13" y="29" width="1" height="4" fill="#090a0f" />
      <rect x="26" y="29" width="1" height="4" fill="#090a0f" />
      <rect x="28" y="29" width="1" height="4" fill="#090a0f" />
      <rect x="14" y="30" width="1" height="2" fill="#090a0f" />
      <rect x="25" y="30" width="1" height="3" fill="#090a0f" />
      <rect x="15" y="31" width="1" height="1" fill="#090a0f" />
      <rect x="24" y="31" width="1" height="1" fill="#090a0f" />
      <rect x="6" y="34" width="1" height="1" fill="#090a0f" />
      {/* Contorno do coque */}
      <rect x="17" y="0" width="6" height="1" fill="#0b0806" />
      <rect x="15" y="1" width="2" height="1" fill="#0b0806" />
      <rect x="23" y="1" width="2" height="1" fill="#0b0806" />
      <rect x="14" y="2" width="1" height="4" fill="#0b0806" />
      <rect x="25" y="2" width="1" height="4" fill="#0b0806" />
      {/* Coque */}
      <rect x="19" y="2" width="5" height="1" fill="#a9a6a0" />
      <rect x="18" y="3" width="1" height="1" fill="#a9a6a0" />
      <rect x="21" y="3" width="2" height="1" fill="#a9a6a0" />
      <rect x="20" y="4" width="1" height="1" fill="#a9a6a0" />
      <rect x="22" y="4" width="1" height="2" fill="#a9a6a0" />
      <rect x="15" y="5" width="4" height="1" fill="#a9a6a0" />
      <rect x="21" y="5" width="1" height="1" fill="#a9a6a0" />
      <rect x="17" y="1" width="6" height="1" fill="#cfccc5" />
      <rect x="15" y="3" width="1" height="2" fill="#cfccc5" />
      <rect x="17" y="3" width="1" height="2" fill="#cfccc5" />
      <rect x="16" y="4" width="1" height="1" fill="#cfccc5" />
      <rect x="19" y="4" width="1" height="1" fill="#cfccc5" />
      <rect x="19" y="3" width="2" height="1" fill="#7c7974" />
      <rect x="23" y="3" width="2" height="2" fill="#7c7974" />
      <rect x="18" y="4" width="1" height="1" fill="#7c7974" />
      <rect x="21" y="4" width="1" height="1" fill="#7c7974" />
      <rect x="19" y="5" width="2" height="1" fill="#7c7974" />
      <rect x="23" y="5" width="1" height="1" fill="#7c7974" />
      <rect x="16" y="2" width="3" height="1" fill="#eeebe4" />
      <rect x="16" y="3" width="1" height="1" fill="#eeebe4" />
      <rect x="24" y="5" width="1" height="1" fill="#4e4b47" />
      {/* Grampo dourado */}
      <rect x="26" y="0" width="1" height="1" fill="#e0b050" />
      <rect x="25" y="1" width="1" height="1" fill="#e0b050" />
      <rect x="24" y="2" width="1" height="1" fill="#e0b050" />
      {/* Cabelo grisalho armado */}
      <rect x="17" y="6" width="11" height="1" fill="#a9a6a0" />
      <rect x="16" y="7" width="10" height="1" fill="#a9a6a0" />
      <rect x="14" y="8" width="2" height="2" fill="#a9a6a0" />
      <rect x="18" y="8" width="2" height="1" fill="#a9a6a0" />
      <rect x="22" y="8" width="5" height="1" fill="#a9a6a0" />
      <rect x="16" y="9" width="2" height="3" fill="#a9a6a0" />
      <rect x="19" y="9" width="3" height="3" fill="#a9a6a0" />
      <rect x="23" y="9" width="1" height="3" fill="#a9a6a0" />
      <rect x="26" y="9" width="1" height="1" fill="#a9a6a0" />
      <rect x="8" y="10" width="1" height="1" fill="#a9a6a0" />
      <rect x="15" y="10" width="1" height="2" fill="#a9a6a0" />
      <rect x="18" y="10" width="1" height="3" fill="#a9a6a0" />
      <rect x="22" y="10" width="1" height="3" fill="#a9a6a0" />
      <rect x="24" y="10" width="2" height="2" fill="#a9a6a0" />
      <rect x="10" y="11" width="5" height="2" fill="#a9a6a0" />
      <rect x="26" y="11" width="1" height="2" fill="#a9a6a0" />
      <rect x="17" y="12" width="1" height="1" fill="#a9a6a0" />
      <rect x="21" y="12" width="1" height="1" fill="#a9a6a0" />
      <rect x="25" y="12" width="1" height="1" fill="#a9a6a0" />
      <rect x="10" y="13" width="2" height="1" fill="#a9a6a0" />
      <rect x="28" y="13" width="2" height="1" fill="#a9a6a0" />
      <rect x="11" y="14" width="1" height="1" fill="#a9a6a0" />
      <rect x="28" y="14" width="1" height="8" fill="#a9a6a0" />
      <rect x="10" y="15" width="1" height="4" fill="#a9a6a0" />
      <rect x="29" y="15" width="1" height="3" fill="#a9a6a0" />
      <rect x="11" y="16" width="1" height="6" fill="#a9a6a0" />
      <rect x="9" y="17" width="1" height="1" fill="#a9a6a0" />
      <rect x="9" y="19" width="1" height="3" fill="#a9a6a0" />
      <rect x="29" y="19" width="1" height="3" fill="#a9a6a0" />
      <rect x="10" y="20" width="1" height="2" fill="#a9a6a0" />
      <rect x="26" y="7" width="4" height="1" fill="#7c7974" />
      <rect x="17" y="8" width="1" height="1" fill="#7c7974" />
      <rect x="21" y="8" width="1" height="1" fill="#7c7974" />
      <rect x="27" y="8" width="4" height="5" fill="#7c7974" />
      <rect x="13" y="9" width="1" height="1" fill="#7c7974" />
      <rect x="18" y="9" width="1" height="1" fill="#7c7974" />
      <rect x="22" y="9" width="1" height="1" fill="#7c7974" />
      <rect x="25" y="9" width="1" height="1" fill="#7c7974" />
      <rect x="14" y="10" width="1" height="1" fill="#7c7974" />
      <rect x="26" y="10" width="1" height="1" fill="#7c7974" />
      <rect x="31" y="10" width="1" height="2" fill="#7c7974" />
      <rect x="15" y="12" width="2" height="1" fill="#7c7974" />
      <rect x="19" y="12" width="2" height="1" fill="#7c7974" />
      <rect x="23" y="12" width="2" height="1" fill="#7c7974" />
      <rect x="30" y="13" width="1" height="9" fill="#7c7974" />
      <rect x="10" y="14" width="1" height="1" fill="#7c7974" />
      <rect x="29" y="14" width="1" height="1" fill="#7c7974" />
      <rect x="11" y="15" width="1" height="1" fill="#7c7974" />
      <rect x="8" y="17" width="1" height="5" fill="#7c7974" />
      <rect x="9" y="18" width="1" height="1" fill="#7c7974" />
      <rect x="29" y="18" width="1" height="1" fill="#7c7974" />
      <rect x="10" y="19" width="1" height="1" fill="#7c7974" />
      <rect x="9" y="22" width="1" height="1" fill="#7c7974" />
      <rect x="12" y="6" width="5" height="1" fill="#cfccc5" />
      <rect x="10" y="7" width="1" height="4" fill="#cfccc5" />
      <rect x="14" y="7" width="2" height="1" fill="#cfccc5" />
      <rect x="9" y="8" width="1" height="9" fill="#cfccc5" />
      <rect x="16" y="8" width="1" height="1" fill="#cfccc5" />
      <rect x="20" y="8" width="1" height="1" fill="#cfccc5" />
      <rect x="11" y="9" width="2" height="2" fill="#cfccc5" />
      <rect x="24" y="9" width="1" height="1" fill="#cfccc5" />
      <rect x="13" y="10" width="1" height="1" fill="#cfccc5" />
      <rect x="8" y="11" width="1" height="1" fill="#cfccc5" />
      <rect x="8" y="13" width="1" height="4" fill="#cfccc5" />
      <rect x="31" y="12" width="1" height="9" fill="#4e4b47" />
      <rect x="30" y="22" width="1" height="1" fill="#4e4b47" />
      <rect x="11" y="7" width="3" height="2" fill="#eeebe4" />
      <rect x="8" y="12" width="1" height="1" fill="#eeebe4" />
      {/* Rosto (sombreamento triplo) */}
      <rect x="12" y="13" width="3" height="1" fill="#e0a982" />
      <rect x="25" y="13" width="1" height="1" fill="#e0a982" />
      <rect x="16" y="14" width="1" height="12" fill="#e0a982" />
      <rect x="23" y="14" width="2" height="9" fill="#e0a982" />
      <rect x="17" y="15" width="1" height="11" fill="#e0a982" />
      <rect x="19" y="15" width="2" height="4" fill="#e0a982" />
      <rect x="22" y="15" width="1" height="11" fill="#e0a982" />
      <rect x="18" y="16" width="1" height="7" fill="#e0a982" />
      <rect x="21" y="16" width="1" height="10" fill="#e0a982" />
      <rect x="23" y="23" width="1" height="1" fill="#e0a982" />
      <rect x="24" y="24" width="1" height="4" fill="#e0a982" />
      <rect x="18" y="25" width="3" height="1" fill="#e0a982" />
      <rect x="13" y="26" width="3" height="2" fill="#e0a982" />
      <rect x="18" y="26" width="1" height="4" fill="#e0a982" />
      <rect x="20" y="26" width="1" height="4" fill="#e0a982" />
      <rect x="23" y="26" width="1" height="3" fill="#e0a982" />
      <rect x="12" y="27" width="1" height="1" fill="#e0a982" />
      <rect x="16" y="27" width="2" height="3" fill="#e0a982" />
      <rect x="19" y="27" width="1" height="3" fill="#e0a982" />
      <rect x="21" y="27" width="2" height="3" fill="#e0a982" />
      <rect x="14" y="28" width="2" height="2" fill="#e0a982" />
      <rect x="26" y="28" width="1" height="1" fill="#e0a982" />
      <rect x="15" y="13" width="10" height="1" fill="#b27a56" />
      <rect x="12" y="14" width="1" height="13" fill="#b27a56" />
      <rect x="17" y="14" width="6" height="1" fill="#b27a56" />
      <rect x="25" y="14" width="1" height="9" fill="#b27a56" />
      <rect x="18" y="15" width="1" height="1" fill="#b27a56" />
      <rect x="21" y="15" width="1" height="1" fill="#b27a56" />
      <rect x="25" y="24" width="1" height="5" fill="#b27a56" />
      <rect x="13" y="28" width="1" height="1" fill="#b27a56" />
      <rect x="24" y="28" width="1" height="3" fill="#b27a56" />
      <rect x="23" y="29" width="1" height="2" fill="#b27a56" />
      <rect x="15" y="30" width="8" height="1" fill="#b27a56" />
      <rect x="26" y="13" width="2" height="15" fill="#7c4f35" />
      <rect x="25" y="29" width="1" height="1" fill="#7c4f35" />
      <rect x="13" y="14" width="3" height="1" fill="#edbd99" />
      <rect x="13" y="15" width="1" height="8" fill="#edbd99" />
      <rect x="15" y="15" width="1" height="8" fill="#edbd99" />
      <rect x="14" y="18" width="1" height="5" fill="#edbd99" />
      <rect x="13" y="24" width="2" height="2" fill="#edbd99" />
      <rect x="14" y="15" width="1" height="3" fill="#f7d6b8" />
      {/* Nariz fino e comprido */}
      <rect x="20" y="19" width="1" height="6" fill="#b27a56" />
      <rect x="19" y="24" width="1" height="1" fill="#b27a56" />
      <rect x="19" y="19" width="1" height="1" fill="#edbd99" />
      <rect x="19" y="21" width="1" height="2" fill="#edbd99" />
      <rect x="18" y="23" width="1" height="1" fill="#edbd99" />
      <rect x="19" y="20" width="1" height="1" fill="#f7d6b8" />
      <rect x="19" y="23" width="1" height="1" fill="#e0a982" />
      <rect x="18" y="24" width="1" height="1" fill="#7c4f35" />
      {/* Blush e rugas */}
      <rect x="15" y="24" width="1" height="2" fill="#b27a56" />
      <rect x="23" y="24" width="1" height="2" fill="#b27a56" />
      <rect x="16" y="26" width="2" height="1" fill="#b27a56" />
      <rect x="19" y="26" width="1" height="1" fill="#b27a56" />
      <rect x="21" y="26" width="2" height="1" fill="#b27a56" />
      <rect x="13" y="23" width="3" height="1" fill="#e48a76" />
      <rect x="24" y="23" width="2" height="1" fill="#e48a76" />
      {/* Brincos de pérola */}
      <rect x="11" y="23" width="1" height="1" fill="#ece5d3" />
      <rect x="29" y="23" width="1" height="1" fill="#ece5d3" />
      <rect x="10" y="24" width="1" height="1" fill="#ece5d3" />
      <rect x="28" y="24" width="1" height="1" fill="#ece5d3" />
      <rect x="10" y="22" width="2" height="1" fill="#edbd99" />
      <rect x="28" y="22" width="2" height="1" fill="#b27a56" />
      <rect x="10" y="23" width="1" height="1" fill="#ffffff" />
      <rect x="28" y="23" width="1" height="1" fill="#ffffff" />
      <rect x="11" y="24" width="1" height="1" fill="#a99f8a" />
      <rect x="29" y="24" width="1" height="1" fill="#a99f8a" />
      {/* Pescoço */}
      <rect x="19" y="31" width="5" height="1" fill="#b27a56" />
      <rect x="16" y="31" width="3" height="1" fill="#e0a982" />
      <rect x="19" y="32" width="1" height="1" fill="#7c4f35" />
      {/* Cardigã vinho */}
      <rect x="7" y="34" width="1" height="6" fill="#5a2230" />
      <rect x="8" y="36" width="5" height="1" fill="#5a2230" />
      <rect x="14" y="36" width="2" height="4" fill="#5a2230" />
      <rect x="24" y="36" width="3" height="1" fill="#5a2230" />
      <rect x="8" y="37" width="3" height="3" fill="#5a2230" />
      <rect x="12" y="37" width="2" height="1" fill="#5a2230" />
      <rect x="24" y="37" width="2" height="3" fill="#5a2230" />
      <rect x="11" y="38" width="2" height="1" fill="#5a2230" />
      <rect x="26" y="38" width="1" height="1" fill="#5a2230" />
      <rect x="12" y="39" width="2" height="1" fill="#5a2230" />
      <rect x="27" y="33" width="2" height="1" fill="#431823" />
      <rect x="28" y="34" width="1" height="6" fill="#431823" />
      <rect x="6" y="35" width="1" height="5" fill="#431823" />
      <rect x="27" y="35" width="1" height="5" fill="#431823" />
      <rect x="13" y="36" width="1" height="1" fill="#431823" />
      <rect x="11" y="37" width="1" height="1" fill="#431823" />
      <rect x="26" y="37" width="1" height="1" fill="#431823" />
      <rect x="13" y="38" width="1" height="1" fill="#431823" />
      <rect x="11" y="39" width="1" height="1" fill="#431823" />
      <rect x="26" y="39" width="1" height="1" fill="#431823" />
      <rect x="10" y="33" width="3" height="1" fill="#743042" />
      <rect x="8" y="34" width="1" height="2" fill="#743042" />
      <rect x="9" y="35" width="4" height="1" fill="#743042" />
      <rect x="9" y="34" width="3" height="1" fill="#8e3c4e" />
      {/* Blusa com gola redonda */}
      <rect x="14" y="32" width="5" height="2" fill="#efe6d2" />
      <rect x="20" y="32" width="5" height="3" fill="#efe6d2" />
      <rect x="13" y="33" width="1" height="2" fill="#efe6d2" />
      <rect x="19" y="33" width="1" height="3" fill="#efe6d2" />
      <rect x="25" y="33" width="1" height="1" fill="#efe6d2" />
      <rect x="12" y="34" width="1" height="1" fill="#efe6d2" />
      <rect x="14" y="34" width="1" height="1" fill="#efe6d2" />
      <rect x="16" y="34" width="2" height="1" fill="#efe6d2" />
      <rect x="18" y="35" width="1" height="1" fill="#efe6d2" />
      <rect x="20" y="35" width="1" height="2" fill="#efe6d2" />
      <rect x="17" y="36" width="1" height="4" fill="#efe6d2" />
      <rect x="18" y="37" width="2" height="3" fill="#efe6d2" />
      <rect x="20" y="38" width="1" height="2" fill="#efe6d2" />
      <rect x="26" y="33" width="1" height="3" fill="#c9bea6" />
      <rect x="18" y="34" width="1" height="1" fill="#c9bea6" />
      <rect x="27" y="34" width="1" height="1" fill="#c9bea6" />
      <rect x="13" y="35" width="3" height="1" fill="#c9bea6" />
      <rect x="21" y="35" width="2" height="1" fill="#c9bea6" />
      <rect x="25" y="35" width="1" height="1" fill="#c9bea6" />
      <rect x="21" y="37" width="2" height="3" fill="#c9bea6" />
      <rect x="23" y="36" width="1" height="4" fill="#2a0e16" />
      <rect x="16" y="37" width="1" height="2" fill="#2a0e16" />
      <rect x="16" y="36" width="1" height="1" fill="#d9a441" />
      <rect x="16" y="39" width="1" height="1" fill="#d9a441" />
      {/* Colar de pérolas */}
      <rect x="16" y="35" width="1" height="1" fill="#a99f8a" />
      <rect x="24" y="35" width="1" height="1" fill="#a99f8a" />
      <rect x="18" y="36" width="1" height="1" fill="#a99f8a" />
      <rect x="22" y="36" width="1" height="1" fill="#a99f8a" />
      <rect x="20" y="37" width="1" height="1" fill="#a99f8a" />
      <rect x="15" y="34" width="1" height="1" fill="#ece5d3" />
      <rect x="25" y="34" width="1" height="1" fill="#ece5d3" />
      <rect x="23" y="35" width="1" height="1" fill="#ece5d3" />
      <rect x="19" y="36" width="1" height="1" fill="#ece5d3" />
      <rect x="17" y="35" width="1" height="1" fill="#ffffff" />
      <rect x="21" y="36" width="1" height="1" fill="#ffffff" />
      {/* Contorno da mão erguida */}
      <rect x="32" y="20" width="1" height="1" fill="#0b0806" />
      <rect x="35" y="20" width="1" height="1" fill="#0b0806" />
      <rect x="31" y="21" width="1" height="4" fill="#0b0806" />
      <rect x="36" y="21" width="1" height="4" fill="#0b0806" />
      <rect x="32" y="25" width="1" height="3" fill="#0b0806" />
      <rect x="35" y="25" width="1" height="3" fill="#0b0806" />
      <rect x="30" y="28" width="2" height="1" fill="#0b0806" />
      <rect x="36" y="28" width="2" height="1" fill="#0b0806" />
      <rect x="29" y="29" width="1" height="6" fill="#0b0806" />
      <rect x="38" y="29" width="1" height="6" fill="#0b0806" />
      {/* Mão com o dedo em riste */}
      <rect x="34" y="25" width="1" height="6" fill="#e0a982" />
      <rect x="33" y="26" width="1" height="5" fill="#e0a982" />
      <rect x="32" y="28" width="1" height="3" fill="#e0a982" />
      <rect x="35" y="29" width="1" height="2" fill="#e0a982" />
      <rect x="32" y="32" width="4" height="1" fill="#e0a982" />
      <rect x="32" y="34" width="4" height="1" fill="#e0a982" />
      <rect x="35" y="28" width="1" height="1" fill="#b27a56" />
      <rect x="36" y="29" width="2" height="6" fill="#b27a56" />
      <rect x="32" y="31" width="4" height="1" fill="#b27a56" />
      <rect x="32" y="33" width="4" height="1" fill="#b27a56" />
      <rect x="33" y="25" width="1" height="1" fill="#edbd99" />
      <rect x="30" y="29" width="2" height="1" fill="#edbd99" />
      <rect x="31" y="30" width="1" height="5" fill="#edbd99" />
      <rect x="30" y="31" width="1" height="4" fill="#edbd99" />
      <rect x="30" y="30" width="1" height="1" fill="#f7d6b8" />
      {/* Dedal de chumbo */}
      <rect x="33" y="20" width="2" height="1" fill="#aab0b5" />
      <rect x="32" y="21" width="1" height="4" fill="#aab0b5" />
      <rect x="33" y="24" width="2" height="1" fill="#aab0b5" />
      <rect x="34" y="21" width="2" height="1" fill="#53595f" />
      <rect x="33" y="22" width="1" height="1" fill="#53595f" />
      <rect x="35" y="22" width="1" height="3" fill="#53595f" />
      <rect x="34" y="23" width="1" height="1" fill="#53595f" />
      <rect x="34" y="22" width="1" height="1" fill="#7f858b" />
      <rect x="33" y="23" width="1" height="1" fill="#7f858b" />
      <rect x="33" y="21" width="1" height="1" fill="#dfe3e6" />
      {/* Punho do cardigã */}
      <rect x="29" y="36" width="7" height="1" fill="#5a2230" />
      <rect x="29" y="37" width="1" height="3" fill="#5a2230" />
      <rect x="31" y="37" width="5" height="3" fill="#5a2230" />
      <rect x="36" y="36" width="3" height="4" fill="#431823" />
      <rect x="30" y="37" width="1" height="3" fill="#431823" />
      <rect x="29" y="35" width="10" height="1" fill="#743042" />
      <NeideEyes mood={mood} />
      <NeideMouth mood={mood} speaking={speaking} />
      <NeideExtras mood={mood} />
    </PixelSvg>
  );
}

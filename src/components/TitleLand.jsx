import { useState } from 'react';
import BuxariaLogo from './BuxariaLogo.jsx';
import LampRig from './LampRig.jsx';
import LandStage from './LandStage.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import DominoKey from './DominoKey.jsx';
import RivalBust from './RivalBust.jsx';
import { BookIcon, GearIcon, LedgerIcon } from './art/SceneArt.jsx';
import { TITLE_GEO, TITLE_H, TITLE_PAD, TITLE_W, paintTitleBack, paintTitleFront } from './art/landTitle.js';

const PUFFS = [0, 0.8, 1.6];

/** Versão 2.20: os ícones em pixel das tábuas do menu novo (grade 8×8). */
const ICONS = {
  novo: [['#fff3d0', 'M1 1h6v6H1z'], ['#2a1004', 'M2 2h1v1H2zM5 2h1v1H5zM2 5h1v1H2zM5 5h1v1H5zM3 3h2v2H3z']],
  online: [['#ffcb4a', 'M2 0h4v1h1v1h1v4H7v1H6v1H2V7H1V6H0V2h1V1h1z'], ['#8a5210', 'M3 1h2v6H3zM1 3h6v2H1z']],
  desafios: [['#ffcb4a', 'M1 0h6v1h1v2H7v1H6v1H5v1h1v1H2V6h1V5H2V4H1V3H0V1h1z'], ['#fff3b8', 'M2 1h1v2H2z']],
  colecao: [['#c8382a', 'M1 0h6v8H1z'], ['#7a1810', 'M1 0h1v8H1z'], ['#fff3d0', 'M3 2h3v3H3z'], ['#2a1004', 'M4 3h1v1H4z']],
  opcoes: [['#ffcb4a', 'M3 0h2v1h1v1h1v1h1v2H7v1H6v1H5v1H3V7H2V6H1V5H0V3h1V2h1V1h1z'], ['#2a1004', 'M3 3h2v2H3z']],
  voltar: [['#ffcb4a', 'M3 1h1v1H3zM2 2h1v1H2zM1 3h6v2H1zM2 5h1v1H2zM3 6h1v1H3z']],
  apagar: [['#fff3d0', 'M1 1h1v1H1zM6 1h1v1H6zM2 2h1v1H2zM5 2h1v1H5zM3 3h2v2H3zM2 5h1v1H2zM5 5h1v1H5zM1 6h1v1H1zM6 6h1v1H6z']],
};

function PlankIcon({ name }) {
  return (
    <svg className="nv-ico" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      {ICONS[name].map(([fill, d]) => (
        <path key={d} fill={fill} d={d} />
      ))}
    </svg>
  );
}

/** Uma tábua do menu novo: `main` é a dourada (com o resumo embaixo), `blood` a de apagar. */
function Plank({ icon, label, note, main = false, blood = false, dim = false, onClick }) {
  return (
    <button type="button" className={`nv-plank${main ? ' is-main' : ''}${blood ? ' is-blood' : ''}${dim ? ' is-dim' : ''}`} onClick={onClick}>
      {main ? <span className="nv-play" aria-hidden="true" /> : <PlankIcon name={icon} />}
      <span className="nv-plank-text">
        <span className="nv-plank-label">{label}</span>
        {note && <span className="nv-plank-note">{note}</span>}
      </span>
    </button>
  );
}

/**
 * Versão 2.20: o menu do visual novo, em tábuas pregadas: CONTINUAR em ouro (sem run salva, o
 * NOVO JOGO), e embaixo NOVO JOGO, MESA ONLINE, DESAFIOS, COLEÇÃO e CONFIGURAÇÕES. As funções são
 * as mesmas do menu em pedras; o Livro e o Fiado viram COLEÇÃO, e a engrenagem, CONFIGURAÇÕES.
 */
function PlankMenu({ save, summary, onNewGame, onContinue, onChallenges, hasChallenges, onOnline, onTap, onOpen }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="nv-menu is-confirm">
        <p className="nv-menu-head">APAGAR A RUN SALVA?</p>
        <p className="nv-menu-note">Começar do zero joga fora a run que está no meio.</p>
        <Plank icon="apagar" label="APAGAR E COMEÇAR" blood onClick={onNewGame} />
        <Plank
          icon="voltar"
          label="VOLTAR"
          onClick={() => {
            onTap?.();
            setConfirm(false);
          }}
        />
      </div>
    );
  }
  const ask = () => {
    onTap?.();
    setConfirm(true);
  };
  return (
    <div className="nv-menu">
      {save ? <Plank main label="CONTINUAR" note={summary} onClick={onContinue} /> : <Plank main label="NOVO JOGO" note="Escolha a maleta e sente à mesa" onClick={onNewGame} />}
      {save && <Plank icon="novo" label="NOVO JOGO" onClick={ask} />}
      {onOnline && <Plank icon="online" label="MESA ONLINE" onClick={onOnline} />}
      <Plank icon="desafios" label="DESAFIOS" dim={!hasChallenges} onClick={onChallenges} />
      <Plank icon="colecao" label="COLEÇÃO" onClick={() => onOpen('book')} />
      <Plank icon="opcoes" label="CONFIGURAÇÕES" onClick={() => onOpen('options')} />
    </div>
  );
}

/**
 * O menu em pedras: CONTINUAR (com o resumo da run salva) é a de marfim; sem run salva, o NOVO
 * JOGO é que vira a de marfim. Com run salva, o NOVO JOGO pede confirmação ali mesmo.
 */
function DominoMenu({ save, summary, onNewGame, onContinue, onChallenges, hasChallenges, onOnline, onTap }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="tl-menu is-confirm">
        <p className="tl-menu-head">APAGAR A RUN SALVA?</p>
        <p className="tl-menu-note">Começar do zero joga fora a run que está no meio.</p>
        <DominoKey label="APAGAR E COMEÇAR" pips={0} tone="blood" h={54} onClick={onNewGame} />
        <DominoKey
          label="VOLTAR"
          pips={1}
          onClick={() => {
            onTap?.();
            setConfirm(false);
          }}
        />
      </div>
    );
  }
  return (
    <div className="tl-menu">
      {save && <DominoKey label="CONTINUAR" note={summary} pips={6} tone="ivory" h={66} onClick={onContinue} className="is-main" />}
      <DominoKey
        label="NOVO JOGO"
        pips={5}
        tone={save ? 'ebony' : 'ivory'}
        h={save ? 50 : 60}
        className={save ? '' : 'is-main'}
        onClick={
          save
            ? () => {
                onTap?.();
                setConfirm(true);
              }
            : onNewGame
        }
      />
      {onOnline && <DominoKey label="MESA ONLINE" pips={4} onClick={onOnline} />}
      <DominoKey label="DESAFIOS" pips={3} onClick={onChallenges} className={hasChallenges ? '' : 'is-dim'} />
    </div>
  );
}

/**
 * Versão 2.11: a tela inicial deitada, desenhada do zero para o palco 16:9 (LandStage). Meia-noite
 * no boteco: o letreiro do BUXARIA na parede, iluminado; a mesa de dominó sob a lâmpada, com o
 * jogo correndo, e o rival sentado do outro lado esperando você (o da run salva, ou o Tio Zé);
 * atrás dele a estante acesa, o neon, a TV no futebol e a janela com chuva. O menu são pedras de
 * dominó; o Livro e o Caderno de Fiado ficam em cima da mesa, do seu lado.
 * O logo e a lâmpada continuam com as classes que a abertura mede para pousar no lugar certo.
 */
export default function TitleLand({ save, summary, rival, onNewGame, onContinue, onChallenges, hasChallenges, onOnline, onTap, onOpen, onSecretTap, devUnlocked, showInstallHint, version, visual }) {
  const [ex, ey] = TITLE_GEO.ember;
  const novo = visual !== 'classico';
  return (
    <main className={`title-screen title-land${novo ? ' is-novo' : ''}`}>
      <LandStage paint={() => paintTitleBack()} cacheKey="land-salao-fundo" pad={TITLE_PAD} bleed="#060508" label="Buxaria">
        <span aria-hidden="true" className="tl-rain" />
        <span aria-hidden="true" className="tl-tv" />
        <span aria-hidden="true" className="tl-neon" />

        {/* quem te espera do outro lado da mesa (cortado na beirada de lá) */}
        <div className="tl-rival" aria-hidden="true" style={{ height: TITLE_GEO.rail * 2 }}>
          <div className="tl-rival-bust">
            <div className="seat-breath">
              <RivalBust rival={rival} />
            </div>
          </div>
        </div>

        {/* a mesa, por cima do busto */}
        <PixelCanvas
          cacheKey="land-salao-mesa"
          paint={() => paintTitleFront()}
          w={TITLE_W + TITLE_PAD.x * 2}
          h={TITLE_H + TITLE_PAD.y * 2}
          scale={2}
          className="tl-front"
          style={{ left: -TITLE_PAD.x * 2, top: -TITLE_PAD.y * 2 }}
        />
        <span aria-hidden="true" className="tl-smoke" style={{ left: ex * 2, top: ey * 2 }}>
          {PUFFS.map((delay) => (
            <span key={delay} className="smoke-puff tl-puff" style={{ animationDelay: `${delay}s` }} />
          ))}
        </span>

        <div className="tl-lamp" aria-hidden="true" style={{ left: TITLE_GEO.cx * 2 }}>
          <LampRig part="light" lamp={64} cord={126} beamWidth={300} />
          <LampRig part="body" lamp={64} cord={126} beamWidth={300} />
        </div>
        <span aria-hidden="true" className="tl-dust" />

        <h1 className="tl-logo">
          <BuxariaLogo skin={novo ? 'gold' : 'wood'} className="title-logo-svg" onClick={onSecretTap} />
        </h1>
        <p className="tl-tagline">
          DOMINÓ DE <span className="title-tagline-mark">BOTECO</span> · UM CONTRA UM
        </p>

        {novo ? (
          <nav className="tl-nav nv-nav" aria-label="Menu principal">
            <PlankMenu save={save} summary={summary} onNewGame={onNewGame} onContinue={onContinue} onChallenges={onChallenges} hasChallenges={hasChallenges} onOnline={onOnline} onTap={onTap} onOpen={onOpen} />
          </nav>
        ) : (
          <>
            <nav className="tl-nav" aria-label="Menu principal">
              <DominoMenu
                save={save}
                summary={summary}
                onNewGame={onNewGame}
                onContinue={onContinue}
                onChallenges={onChallenges}
                hasChallenges={hasChallenges}
                onOnline={onOnline}
                onTap={onTap}
              />
            </nav>

            {/* do seu lado da mesa: o Livro de Boteco e o Caderno de Fiado */}
            <div className="tl-objects" aria-label="Atalhos">
              <button type="button" className="tl-object" onClick={() => onOpen('book')} aria-label="Coleções: Livro de Boteco">
                <BookIcon className="tl-object-art" />
                <span className="tl-object-tag">LIVRO</span>
              </button>
              <button type="button" className="tl-object" onClick={() => onOpen('stats')} aria-label="Estatísticas da conta: Caderno de Fiado">
                <LedgerIcon className="tl-object-art" />
                <span className="tl-object-tag">FIADO</span>
              </button>
            </div>
            <button type="button" className="tl-gear" onClick={() => onOpen('options')} aria-label="Opções">
              <GearIcon className="h-full w-full" />
            </button>

          </>
        )}
        <footer className="tl-foot">
          <button type="button" className="tl-credit" onClick={() => onOpen('credits')}>
            Criador: Gabriel Modenezzi
          </button>
          <span className="tl-version">
            v{version}
            {devUnlocked && <span className="text-[#8fd6b4]"> · DEV</span>}
          </span>
          {showInstallHint && <span className="tl-install">Tela cheia: Compartilhar → Adicionar à Tela de Início</span>}
        </footer>
      </LandStage>
    </main>
  );
}

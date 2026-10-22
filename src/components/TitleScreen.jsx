import { useState } from 'react';
import { REGIONS } from '../data/campaign.js';
import { generateCampaign } from '../engine/campaignMap.js';
import { getRival } from '../data/rivals.js';
import BuxariaLogo from './BuxariaLogo.jsx';
import CaseSelect from './CaseSelect.jsx';
import CollectionBook from './CollectionBook.jsx';
import MenuModal from './MenuModal.jsx';
import OptionsPanel from './OptionsPanel.jsx';
import LampRig from './LampRig.jsx';
import { BookIcon, GearIcon } from './art/SceneArt.jsx';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const AFTER_STOP = { shop: 'saiu da loja', black: 'saiu do beco', coins: 'passou pelo Seu Tião' };

/** "Região 2 · andar 3 · Loja do Valtinho · 4♥ · $17" a partir do save (a teia sai da semente). */
function saveSummary(save) {
  const node = save.node ? generateCampaign(save.seed ?? 0).byId.get(save.node) : null;
  const where = node ? `Região ${node.region}/${REGIONS.length} · andar ${node.floor}` : 'Entrada do boteco';
  let what = '';
  if (save.resume === 'shop') what = 'na loja';
  else if (save.resume === 'blackMarket') what = 'no Mercado Negro';
  else if (node?.rivalId && !save.cleared.includes(node.id)) what = getRival(node.rivalId).name;
  else if (node && node.type !== 'combat' && node.type !== 'boss') what = AFTER_STOP[node.type];
  else if (node) what = `${getRival(node.rivalId).name} vencido`;
  const maleta = save.mode === 'hard' ? 'Maleta Preta' : null;
  return [maleta, where, what, `${save.hearts}♥`, `$${save.coins}`].filter(Boolean).join(' · ');
}

/**
 * Escolha depois do JOGAR, no mesmo lugar, só em texto: CONTINUAR (dourado se há run
 * salva, apagado se não), NOVO JOGO e VOLTAR. Com run salva, o NOVO JOGO pede confirmação
 * ali mesmo, também em texto.
 */
function PlayChoices({ save, onNewGame, onContinue, onBack, onTap }) {
  const [confirm, setConfirm] = useState(false);
  const summary = save ? saveSummary(save) : null;
  if (confirm) {
    return (
      <div className="title-choices">
        <p className="title-confirm">Começar do zero apaga a run salva.</p>
        <button type="button" className="text-action title-choice title-choice-danger" onClick={onNewGame}>
          APAGAR E COMEÇAR
        </button>
        <button
          type="button"
          className="text-action title-choice title-choice-quiet"
          onClick={() => {
            onTap?.();
            setConfirm(false);
          }}
        >
          VOLTAR
        </button>
      </div>
    );
  }
  return (
    <div className="title-choices">
      <button type="button" className={`text-action title-choice ${save ? 'title-choice-gold' : ''}`} disabled={!save} onClick={onContinue}>
        CONTINUAR
        <span className="title-choice-note">
          {summary ?? 'Nenhuma run salva'}
        </span>
      </button>
      <button
        type="button"
        className="text-action title-choice"
        onClick={
          save
            ? () => {
                onTap?.();
                setConfirm(true);
              }
            : onNewGame
        }
      >
        NOVO JOGO
      </button>
      <button type="button" className="text-action title-choice title-choice-quiet" onClick={onBack}>
        VOLTAR
      </button>
    </div>
  );
}

function Credits() {
  return (
    <div className="grid gap-3 text-center font-term text-[18px] leading-tight text-bone-200">
      <p>
        <span className="block font-pixel text-[9px] text-brass-300">BUXARIA · PATCH 0.7.0</span>
        Dominó de boteco, um contra um, até alguém zerar os corações.
      </p>
      <p>
        <span className="block font-pixel text-[8px] text-bone-400">CRIADOR</span>
        Gabriel Modenezzi
      </p>
      <p>
        <span className="block font-pixel text-[8px] text-bone-400">NA MESA</span>
        Tio Zé, Seu Arlindo, Beto Cigano, o Comendador e mais 14 figuras da noite. A cada run, 15 deles sentam à mesa, numa teia de caminhos que muda sempre. No beco, o Corvo da Madrugada; no engradado, o Seu Tião das Moedas.
      </p>
      <p>
        <span className="block font-pixel text-[8px] text-bone-400">SOM</span>
        Tudo sintetizado na hora (Web Audio): nenhuma gravação.
      </p>
      <p>
        <span className="block font-pixel text-[8px] text-bone-400">FEITO COM</span>
        React, Vite, Tailwind e muita pedra batida.
      </p>
      <p className="text-bone-400">Jogue com moderação. O boteco fecha às 2h.</p>
    </div>
  );
}

/**
 * Tela inicial (Patch 0.5.5): limpa e de cinema. Lâmpada balançando, o logo BUXARIA em
 * SVG, o crédito do criador em letra de máquina e, no centro, só a palavra JOGAR.
 * Tocar em JOGAR troca a palavra, no mesmo lugar, por CONTINUAR / NOVO JOGO / VOLTAR.
 * Coleções (livro) e Opções (engrenagem) viram ícones nos cantos de cima.
 * O primeiro toque também destrava o áudio no iOS. 3 toques no logo liberam o painel DEV.
 */
export default function TitleScreen({
  save,
  onNewGame,
  onContinue,
  settings,
  onSettings,
  onResetProgress,
  collection,
  onSecretTap,
  onTap,
  devUnlocked = false,
  hardUnlocked = false,
  startPicking = false,
}) {
  const [modal, setModal] = useState(null);
  const [choosing, setChoosing] = useState(startPicking);
  // Patch 0.6.3: NOVO JOGO abre a mesa das maletas (Branca = normal, Preta = difícil)
  const [picking, setPicking] = useState(startPicking);
  const showInstallHint = isIOS() && !isStandalone();
  const open = (id) => {
    onTap?.();
    setModal(id);
  };
  const close = () => {
    onTap?.();
    setModal(null);
  };
  const startChoosing = () => {
    onTap?.();
    setChoosing(true);
  };
  const back = () => {
    onTap?.();
    setChoosing(false);
  };
  const openCases = () => {
    onTap?.();
    setPicking(true);
  };
  const closeCases = () => {
    onTap?.();
    setPicking(false);
  };

  return (
    <main
      className="title-screen relative flex h-full flex-col items-center overflow-hidden px-6 text-center"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 0px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      {/* candeeiro preso no teto: balança de verdade (pivô no fio) e o facho varre
          o logo; quando a lâmpada falha, o salão inteiro escurece */}
      <LampRig part="light" lamp={120} cord={40} beamWidth={380} className="z-[4]" />
      <div aria-hidden="true" className="room-flicker pointer-events-none absolute inset-0 z-[2]" />
      <LampRig part="body" lamp={120} cord={40} beamWidth={380} className="z-[3]" />

      {/* ícones nos cantos: Coleções (livro) e Opções (engrenagem de latão) */}
      <div className="title-corners" aria-label="Atalhos">
        <button type="button" className="icon-btn title-icon" onClick={() => open('book')} aria-label="Coleções: Livro de Boteco">
          <BookIcon className="h-10 w-10" />
        </button>
        <button type="button" className="icon-btn title-icon" onClick={() => open('options')} aria-label="Opções">
          <GearIcon className="h-10 w-10" />
        </button>
      </div>

      {/* espaço da lâmpada no topo (ela fica por cima, fora do fluxo) */}
      <div aria-hidden="true" className="h-[150px] shrink-0" />

      <div className="relative z-[5] mt-[6vh] flex w-full flex-col items-center">
        <h1 className="w-full">
          <BuxariaLogo className="title-logo-svg mx-auto" onClick={onSecretTap} />
        </h1>
        <button type="button" className="text-action title-credit" onClick={() => open('credits')}>
          Criador: Gabriel Modenezzi
        </button>
      </div>

      {/* JOGAR, e no mesmo lugar as escolhas: só tipografia, sem caixas */}
      <nav className="title-menu relative z-[5] flex-1 content-center" aria-label="Menu principal">
        <div className={`title-panel ${choosing ? 'title-panel-off' : ''}`} inert={choosing}>
          <button type="button" className="text-action title-play" onClick={startChoosing}>
            JOGAR
          </button>
        </div>
        <div className={`title-panel ${choosing ? '' : 'title-panel-off'}`} inert={!choosing}>
          {choosing && <PlayChoices save={save} onNewGame={openCases} onContinue={onContinue} onBack={back} onTap={onTap} />}
        </div>
      </nav>

      <footer className="relative z-[5] flex flex-col items-center gap-1">
        {showInstallHint && <p className="font-term text-base text-bone-400">Tela cheia: Compartilhar → Adicionar à Tela de Início.</p>}
        <p className="title-version">
          PATCH 0.7.0{devUnlocked && <span className="text-[#8fd6b4]"> · DEV</span>}
        </p>
      </footer>

      {modal === 'options' && (
        <MenuModal id="options-title" title="OPÇÕES" onClose={close}>
          <OptionsPanel settings={settings} onChange={onSettings} onResetProgress={onResetProgress} />
        </MenuModal>
      )}
      {modal === 'book' && (
        <MenuModal id="book-title" title="LIVRO DE BOTECO" onClose={close} wide variant="leather">
          <CollectionBook collection={collection} />
        </MenuModal>
      )}
      {modal === 'credits' && (
        <MenuModal id="credits-title" title="CRÉDITOS DA MESA" onClose={close}>
          <Credits />
        </MenuModal>
      )}
      {picking && <CaseSelect hardUnlocked={hardUnlocked} onPick={(mode) => onNewGame(mode)} onBack={closeCases} />}
    </main>
  );
}

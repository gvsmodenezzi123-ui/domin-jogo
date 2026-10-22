import { encounterOf } from '../data/encounters.js';
import { REGIONS } from '../data/campaign.js';
import { regionIdOf } from '../engine/campaignMap.js';
import { encounterOptionBlock } from '../engine/encounters.js';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import LampRig from './LampRig.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import { CoinGlyph } from './UiGlyphs.jsx';
import { EncounterIcon } from './art/EncounterArt.jsx';
import { useFitScale } from './useFitScale.js';

/** A arte do dilema: a própria bucha de Rubi, a moeda do jogo ou o pixel art do evento. */
function EncounterArtFor({ encounter }) {
  if (encounter.id === 'bebado') {
    return (
      <span className="encounter-art-pair">
        <EncounterIcon art="drunk" className="h-16 w-16" />
        <DominoTile values={[6, 6]} unit={26} depth={3} enhancement="rubi" orientation="vertical" still className="encounter-tile" />
      </span>
    );
  }
  if (encounter.id === 'esquina') return <CoinGlyph size={72} className="encounter-coin" />;
  return <EncounterIcon art={encounter.art} className="h-20 w-20" />;
}

/**
 * Evento de dilema do mapa (Patch 0.9.4): o nó "[?]". Beco à meia-luz (a lâmpada fraca, a
 * neblina e a vinheta fechada), duas linhas de cena e exatamente duas escolhas de risco e
 * recompensa. A escolha vale na hora (engine/encounters.js); o desfecho aparece no lugar das
 * escolhas e VOLTAR AO MAPA sai com o corte de cena. Sem scroll: se a tela for baixa, o cartão
 * encolhe para caber (useFitScale).
 */
export default function EncounterModal({ state, onChoose, onLeave }) {
  const [fitOuter, fitInner, fitStyle] = useFitScale();
  const enc = state.encounter;
  const data = encounterOf(enc?.id);
  if (!enc || !data) return null;
  const outcome = enc.outcome;
  const region = REGIONS[regionIdOf(state) - 1];

  return (
    <div className={`encounter-scene map-atmo-${region.atmosphere} fixed inset-0 z-[55]`} role="dialog" aria-modal="true" aria-labelledby="encounter-title">
      <div className="encounter-lamp" aria-hidden="true">
        <LampRig part="light" lamp={40} cord={30} beamWidth={300} />
        <LampRig part="body" lamp={40} cord={30} beamWidth={300} className="z-[6]" />
      </div>
      <span aria-hidden="true" className="encounter-fog" />
      <div ref={fitOuter} className="encounter-scroll">
        <div ref={fitInner} className="encounter-fit" style={fitStyle}>
          <div className="encounter-card">
            <p className="encounter-kicker">[?] IMPREVISTO DA NOITE · {region.name.toUpperCase()}</p>
            <div className="encounter-art">
              <EncounterArtFor encounter={data} />
            </div>
            <h1 id="encounter-title" className="encounter-title">
              {data.title.toUpperCase()}
            </h1>
            <p className="encounter-text">
              {data.text[0]}
              <br />
              {data.text[1]}
            </p>

            {!outcome ? (
              <div className="encounter-options" role="group" aria-label="Escolhas">
                {data.options.map((opt) => {
                  const block = encounterOptionBlock(state, enc.id, opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`encounter-option tone-${opt.tone} ${block ? 'is-blocked' : ''}`}
                      disabled={Boolean(block)}
                      onClick={() => onChoose(opt.id)}
                    >
                      <span className="encounter-option-key" aria-hidden="true">
                        {opt.id.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="encounter-option-label">{opt.label}</span>
                        <span className="encounter-option-detail">{block ?? opt.detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div key={enc.choice} className={`encounter-outcome is-${outcome.tone}`} role="status">
                <p className="encounter-outcome-head">{outcome.head ?? (outcome.tone === 'good' ? 'DEU BOM' : outcome.tone === 'bad' ? 'DEU RUIM' : 'NADA DEMAIS')}</p>
                {outcome.lines.map((line) => (
                  <p key={line} className="encounter-outcome-line">
                    {line}
                  </p>
                ))}
                <button type="button" data-tone="play" className="btn-pixel encounter-leave" onClick={onLeave}>
                  VOLTAR AO MAPA
                </button>
              </div>
            )}

            <div className="encounter-purse" aria-label="O que você tem agora">
              <HeartsBar current={state.hearts.player} max={state.maxHearts.player} pixel={2} label={`Você: ${state.hearts.player} de ${state.maxHearts.player} corações`} />
              <CoinCount value={state.coins.player} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

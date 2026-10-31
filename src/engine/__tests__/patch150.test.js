import { describe, expect, it } from 'vitest';
import { PACKS, PACK_DROP_RATES, PACK_IDS, STONE_TIERS } from '../../data/packs.js';
import { ENHANCEMENTS } from '../../data/enhancedTiles.js';
import { RELICS, RELIC_SLOTS } from '../../data/relics.js';
import { PROP_IDS, SCENE_IDS, SCENE_PX, paintProp, paintScene, propSize } from '../../components/art/botecoScene.js';
import { availableNodes, campaignOf, generateCampaign } from '../campaignMap.js';
import { FULL_SET, createSeededRng, shuffle } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { isValidSave, snapshotRun } from '../save.js';
import { packBuyBlock, rollPack } from '../shop.js';

const dev = (s, op, extra = {}) => gameReducer(s, { type: 'DEV', op, ...extra });
const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });

/** Run nova, já na Loja do Valtinho da 1ª região, com dinheiro. */
function inShop(seed = 7, coins = 80) {
  let s = act(createInitialState(), 'NEW_RUN', { seed, unlocks: [] });
  s = dev(s, 'openStop', { kind: 'shop' });
  expect(s.phase).toBe('shop');
  return dev(s, 'addCoins', { amount: coins });
}

const packIndex = (s, id) => s.shop.packs.findIndex((o) => o.id === id);

describe('Versão 1.5: pacotes fechados na Loja do Valtinho', () => {
  it('as chances de cada pacote somam 100%; o Saco divide balcão (raro e lendário) e luxo (mítico)', () => {
    for (const id of PACK_IDS) {
      const total = Object.values(PACK_DROP_RATES[id]).reduce((a, b) => a + b, 0);
      expect(total, id).toBeCloseTo(1, 6);
    }
    expect(PACK_DROP_RATES.macoParaguaio).toEqual({ comum: 0.65, raro: 0.25, lendario: 0.08, mitico: 0.02 });
    expect(PACK_DROP_RATES.engradadoJumbo).toEqual({ comum: 0.4, raro: 0.4, lendario: 0.17, mitico: 0.03 });
    expect(PACK_DROP_RATES.sacoPedras).toEqual({ normal: 0.7, luxo: 0.3 });
    expect(STONE_TIERS.luxo).toEqual(['mitico']);
    expect([PACKS.macoParaguaio.price, PACKS.sacoPedras.price, PACKS.engradadoJumbo.price]).toEqual([6, 9, 12]);
  });

  it('a loja abre com a vitrine de sempre e mais a prateleira dos 3 pacotes', () => {
    const s = inShop();
    expect(s.shop.relics).toHaveLength(3);
    expect(s.shop.tiles).toHaveLength(2);
    expect(s.shop.packs.map((o) => o.id)).toEqual(PACK_IDS);
    expect(s.shop.packs.every((o) => !o.sold)).toBe(true);
  });

  it('comprar paga, abre na hora 3 opções diferentes (sem as que você tem, sem necrótico) e a mesma semente abre igual', () => {
    const s = inShop(11);
    const i = packIndex(s, 'macoParaguaio');
    const opened = act(s, 'SHOP_BUY_PACK', { index: i });
    expect(opened.coins.player).toBe(s.coins.player - s.shop.packs[i].price);
    const ids = opened.shop.opening.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      expect(RELICS[id].rarity).not.toBe('necrotico');
      expect(opened.relics.player).not.toContain(id);
    }
    expect(opened.shop.packs[i].sold).toBe(true);
    // a mesma semente abre o mesmo pacote
    expect(act(inShop(11), 'SHOP_BUY_PACK', { index: i }).shop.opening.options).toEqual(opened.shop.opening.options);
  });

  it('com o pacote aberto a loja espera a escolha: não compra, não vende, não reembaralha, não sai', () => {
    let s = inShop(5);
    s = act(s, 'SHOP_BUY_PACK', { index: packIndex(s, 'engradadoJumbo') });
    expect(s.shop.opening).toBeTruthy();
    expect(act(s, 'SHOP_BUY_RELIC', { index: 0 })).toBe(s);
    expect(act(s, 'SHOP_BUY_TILE', { index: 0 })).toBe(s);
    expect(act(s, 'SHOP_REROLL')).toBe(s);
    expect(act(s, 'LEAVE_SHOP')).toBe(s);
    expect(act(s, 'SHOP_BUY_PACK', { index: packIndex(s, 'macoParaguaio') })).toBe(s);
    const chosen = s.shop.opening.options[2].id;
    const picked = act(s, 'SHOP_PACK_PICK', { index: 2 });
    expect(picked.shop.opening).toBeNull();
    expect(picked.relics.player).toContain(chosen);
    expect(picked.events.at(-1)).toMatchObject({ type: 'packPick', pack: 'engradadoJumbo', id: chosen });
  });

  it('o Saco de Pedras traz pedras comuns do seu baralho com grife; a escolhida substitui a comum', () => {
    let s = inShop(9);
    s = act(s, 'SHOP_BUY_PACK', { index: packIndex(s, 'sacoPedras') });
    for (const o of s.shop.opening.options) {
      expect(o.kind).toBe('tile');
      expect(FULL_SET.some((t) => t.id === o.tileId)).toBe(true);
      expect(s.decks.player[o.tileId]).toBeUndefined();
      expect(['raro', 'lendario', 'mitico']).toContain(ENHANCEMENTS[o.enhancement].rarity);
    }
    const choice = s.shop.opening.options[0];
    const picked = act(s, 'SHOP_PACK_PICK', { index: 0 });
    expect(picked.decks.player[choice.tileId]).toBe(choice.enhancement);
  });

  it('pacote de talismã não abre com a bolsa cheia; sem dinheiro, também não', () => {
    let s = inShop(3);
    s = { ...s, relics: { ...s.relics, player: ['caneca', 'giz', 'borracha', 'cinzeiro'].slice(0, RELIC_SLOTS) } };
    const maco = s.shop.packs[packIndex(s, 'macoParaguaio')];
    expect(packBuyBlock(s, maco)).toBe('full');
    expect(act(s, 'SHOP_BUY_PACK', { index: packIndex(s, 'macoParaguaio') })).toBe(s);
    // o saco de pedras não precisa de vaga na bolsa
    expect(packBuyBlock(s, s.shop.packs[packIndex(s, 'sacoPedras')])).toBeNull();
    const broke = { ...s, coins: { ...s.coins, player: 2 } };
    expect(packBuyBlock(broke, broke.shop.packs[packIndex(s, 'sacoPedras')])).toBe('coins');
  });

  it('reembaralhar troca a vitrine mas não os pacotes (o que abriu continua aberto)', () => {
    let s = inShop(13);
    s = act(s, 'SHOP_BUY_PACK', { index: 0 });
    s = act(s, 'SHOP_PACK_PICK', { index: 0 });
    const after = act(s, 'SHOP_REROLL');
    expect(after.shop.rerolls).toBe(1);
    expect(after.shop.packs).toEqual(s.shop.packs);
    expect(after.shop.packs[0].sold).toBe(true);
  });

  it('o save tirado com o pacote aberto guarda as opções e volta esperando a escolha', () => {
    let s = inShop(17);
    s = act(s, 'SHOP_BUY_PACK', { index: packIndex(s, 'sacoPedras') });
    const save = JSON.parse(JSON.stringify(snapshotRun(s, 'shop', 99)));
    expect(isValidSave(save)).toBe(true);
    const loaded = act(createInitialState(), 'LOAD_RUN', { save });
    expect(loaded.phase).toBe('shop');
    expect(loaded.shop.opening).toEqual(s.shop.opening);
    expect(loaded.shop.packs).toEqual(s.shop.packs);
    // save de uma opção impossível não passa
    const bad = JSON.parse(JSON.stringify(save));
    bad.shop.opening.options[0].enhancement = 'diamante';
    expect(isValidSave(bad)).toBe(false);
  });

  it('a mesa online não tem pacotes (as raridades são as da mesa)', () => {
    const s = inShop();
    const pvp = { ...s, pvp: { run: true, rarity: 'todas' } };
    // a loja do online é montada pelo duelo: com pvp.run, buildShop devolve a prateleira vazia
    const rolled = act({ ...pvp, shop: null, phase: 'map' }, 'DEV', { op: 'openStop', kind: 'shop' });
    expect(rolled.shop.packs ?? []).toEqual([]);
  });

  it('rollPack nunca repete um talismã da vitrine (enquanto der)', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const s = inShop(seed);
      const shown = new Set(s.shop.relics.map((o) => o.id));
      for (const o of rollPack(s, 'engradadoJumbo')) expect(shown.has(o.id)).toBe(false);
    }
  });
});

describe('Versão 1.5: o boteco pintado (art/botecoScene.js)', () => {
  it('cada cena pinta a grade inteira, sem buraco, e a mesma semente pinta igual', () => {
    for (const name of SCENE_IDS) {
      const a = paintScene(name, 60, 120, 5);
      expect(a.data.length).toBe(60 * 120 * 4);
      let transparent = 0;
      for (let i = 3; i < a.data.length; i += 4) if (a.data[i] < 255) transparent += 1;
      expect(transparent, name).toBe(0);
      expect(paintScene(name, 60, 120, 5).data).toEqual(a.data);
    }
    expect(paintScene('title', 60, 120, 5).data).not.toEqual(paintScene('title', 60, 120, 6).data);
    expect(SCENE_PX).toBe(2);
  });

  it('os objetos soltos (copo, cinzeiro, tampinhas) têm fundo transparente e o tamanho declarado', () => {
    for (const name of PROP_IDS) {
      const p = paintProp(name);
      expect({ w: p.w, h: p.h }).toEqual(propSize(name));
      expect(p.data[3]).toBe(0); // canto de cima à esquerda vazio
      expect(p.data.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
    }
  });
});

describe('Versão 1.5: a teia e a mesa continuam jogando igual', () => {
  it('pacotes e cenário não mexem na teia: a mesma semente monta a mesma campanha', () => {
    const a = generateCampaign(4242, 3);
    const b = generateCampaign(4242, 3);
    expect([...a.byId.keys()]).toEqual([...b.byId.keys()]);
    const s = act(createInitialState(), 'NEW_RUN', { seed: 4242 });
    expect(campaignOf(s).byId.size).toBe(a.byId.size);
    expect(availableNodes(s).length).toBeGreaterThan(0);
    const deck = shuffle(FULL_SET, createSeededRng(4242));
    expect(deck).toHaveLength(28);
  });
});

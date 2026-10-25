import { describe, expect, it } from 'vitest';
import { makeMatch } from './kit.js';

const summary = (m) => {
  const h = m.host.getSnapshot();
  const g = m.guest.getSnapshot();
  return { host: h.over, guest: g.over, tables: [h.duelCount, g.duelCount], duels: m.bots.host.duelsPlayed, guestDuels: m.bots.guest.duelsPlayed, issues: m.issues.slice(0, 5), errors: [...m.bots.host.errors, ...m.bots.guest.errors] };
};

describe('Patch PvP: partidas inteiras entre dois robôs (rede de mentira)', () => {
  const cases = [
    { seed: 3, hostMaleta: 'classica', guestMaleta: 'classica' },
    { seed: 11, hostMaleta: 'bicheiro', guestMaleta: 'seca' },
    { seed: 29, hostMaleta: 'borracharia', guestMaleta: 'trapaceiro' },
    { seed: 41, hostMaleta: 'seca', guestMaleta: 'bicheiro' },
    { seed: 57, hostMaleta: 'trapaceiro', guestMaleta: 'borracharia' },
  ];
  for (const c of cases) {
    it(`seed ${c.seed}: ${c.hostMaleta} × ${c.guestMaleta} termina com um Dono da Noite`, () => {
      const m = makeMatch(c);
      m.run();
      const s = summary(m);
      expect(s.issues).toEqual([]);
      expect(s.errors).toEqual([]);
      expect(s.host).toBeTruthy();
      expect(s.guest).toBeTruthy();
      // os dois concordam em quem venceu
      expect(s.host.winnerId).toBe(s.guest.winnerId);
      expect(['id-anfitriao', 'id-convidado']).toContain(s.host.winnerId);
      expect(s.host.reason).toBe('hearts');
      expect(s.duels).toBeGreaterThan(0);
      // o fim da noite mostra o mesmo número de mesas nos dois aparelhos
      expect(s.tables[1]).toBe(s.tables[0]);
    });
  }
});

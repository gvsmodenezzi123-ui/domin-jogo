/**
 * Patch PvP: carrega o PeerJS só quando alguém abre a mesa online (o jogo solo não paga nada
 * por isso). Primeiro a cópia que vem junto do jogo (public/vendor, PeerJS 1.5.4 compilado do
 * código-fonte oficial), depois o CDN da mesma versão.
 *
 * O servidor de sinalização é o público e gratuito do PeerJS (0.peerjs.com): ele só apresenta
 * os dois aparelhos; a partida passa direto de um para o outro (WebRTC). Para testes, dá para
 * apontar para outro servidor com `?pvpserver=host:porta` no endereço ou
 * localStorage['buxaria:pvp-server'] = '{"host":"localhost","port":9000,"secure":false}'.
 */

export const PEERJS_VERSION = '1.5.4';
export const PEERJS_SOURCES = Object.freeze([
  `./vendor/peerjs-${PEERJS_VERSION}.min.js`,
  `https://cdn.jsdelivr.net/npm/peerjs@${PEERJS_VERSION}/dist/peerjs.min.js`,
  `https://unpkg.com/peerjs@${PEERJS_VERSION}/dist/peerjs.min.js`,
]);

let loading = null;

function inject(src) {
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      tag.remove();
      reject(new Error(src));
    };
    document.head.appendChild(tag);
  });
}

/** A classe Peer (window.Peer), carregando a biblioteca na primeira vez. */
export function loadPeerJs() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem navegador'));
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!loading) {
    loading = (async () => {
      for (const src of PEERJS_SOURCES) {
        try {
          await inject(src);
          if (window.Peer) return window.Peer;
        } catch {
          /* tenta a próxima fonte */
        }
      }
      throw new Error('PeerJS indisponível');
    })();
    loading.catch(() => {
      loading = null; // deixa tentar de novo no próximo toque
    });
  }
  return loading;
}

/** Opções do `new Peer(id, opções)`: o servidor público, ou o de teste se a página pedir. */
export function peerServerOptions() {
  const options = { debug: 0 };
  let custom = null;
  try {
    const param = new URLSearchParams(window.location.search).get('pvpserver');
    if (param) {
      // pelo endereço, só um servidor de teste na própria máquina (um link não troca o servidor de ninguém)
      const [host, port] = param.split(':');
      if (host === 'localhost' || host === '127.0.0.1') custom = { host, port: Number(port) || 9000, secure: false, path: '/', local: true };
    } else {
      const raw = window.localStorage.getItem('buxaria:pvp-server');
      if (raw) custom = JSON.parse(raw);
    }
  } catch {
    custom = null;
  }
  if (custom && typeof custom.host === 'string') {
    Object.assign(options, { host: custom.host, port: Number(custom.port) || 443, path: custom.path ?? '/', secure: custom.secure !== false });
    // na rede local de teste não há STUN/TURN: só os candidatos do próprio aparelho
    if (custom.local) options.config = { iceServers: [] };
  }
  return options;
}

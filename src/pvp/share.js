// Patch PvP: o link da mesa e o COPIAR LINK/ID.

/** O link que abre a mesa direto (só quando a página tem endereço de verdade). */
export function roomLink(code) {
  try {
    const { protocol, hostname, origin, pathname } = window.location;
    const framed = window.self !== window.top;
    if (framed || !/^https?:$/.test(protocol) || hostname === 'localhost' || hostname === '127.0.0.1') return null;
    return `${origin}${pathname}?mesa=${code}`;
  } catch {
    return null;
  }
}

/** Copia o texto (área de transferência; no navegador antigo, o jeito antigo). */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// Copiar texto (Patch 0.9.2): navigator.clipboard quando o navegador deixa; senão, o jeito
// antigo (textarea escondida + execCommand), que ainda funciona no WebView do Android.

/** Copia `text`. Devolve true se deu certo. */
export async function copyText(text) {
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* sem permissão: tenta o jeito antigo */
  }
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

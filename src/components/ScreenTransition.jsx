// A camada preta do corte de cena; o hook mora em useSceneTransition.js.

/** A camada preta por cima de tudo (`.screen-transition-overlay`); nunca pega toque. */
export default function ScreenVeil({ stage }) {
  return <div aria-hidden="true" className={`screen-transition-overlay pointer-events-none ${stage === 'dark' ? 'is-dark' : ''}`} />;
}

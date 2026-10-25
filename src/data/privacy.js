/**
 * Política de Privacidade (Patch 0.9.7; a mesa online entrou na versão 1.2): o texto que o jogo mostra nas Opções e que a página
 * pública (public/privacy.html e public/privacidade/index.html, para a Google Play Console)
 * repete palavra por palavra. O teste engine/__tests__/patch097.test.js confere que as três
 * versões dizem a mesma coisa: mudou aqui, mude nas duas páginas.
 *
 * Cada trecho é uma lista de pedaços: texto puro, { b } (negrito) ou { code }.
 */

/** Endereço público da página (GitHub Pages do repositório domin-jogo). */
export const PRIVACY_URL = 'https://gvsmodenezzi123-ui.github.io/domin-jogo/privacy.html';

export const PRIVACY_EMAIL = 'gabrielmodenezzi10@gmail.com';

export const PRIVACY = Object.freeze({
  title: 'Política de Privacidade — Buxaria',
  updated: 'Última atualização: Outubro de 2026',
  intro: ['Esta Política de Privacidade descreve de forma clara e transparente como o aplicativo ', { b: 'Buxaria' }, ' lida com as informações dos usuários.'],
  sections: [
    {
      title: '1. Coleta de Informações Pessoais',
      paragraphs: [
        [
          'O jogo ',
          { b: 'Buxaria' },
          ' NÃO coleta, não armazena e não compartilha nenhum dado pessoal identificável dos seus usuários (como nome, endereço, e-mail, telefone, localização geográfica, fotos ou contatos). O único conteúdo que sai do aparelho é o que o próprio jogador envia ao outro jogador na mesa online, opcional, descrita no item 3.',
        ],
      ],
    },
    {
      title: '2. Armazenamento Local de Dados (Local Storage / Cache)',
      paragraphs: [['Fora da mesa online (item 3), o jogo funciona inteiramente de forma local e offline no dispositivo do usuário:']],
      items: [
        [
          'Informações de progresso de jogo, conquistas, maletas desbloqueadas, moedas, talismãs, estatísticas de carreira e opções de configuração são salvas exclusivamente na memória local do seu aparelho (',
          { code: 'localStorage' },
          ' ou arquivos locais do aplicativo).',
        ],
        [
          'Esses dados pertencem unicamente ao jogador e não são enviados para nenhum servidor externo. Ao desinstalar o jogo ou limpar o cache do aplicativo, esses dados locais podem ser permanentemente excluídos.',
        ],
      ],
    },
    {
      title: '3. Mesa Online (opcional)',
      paragraphs: [['O modo ', { b: 'JOGAR ONLINE' }, ' só é usado se o jogador escolher entrar ou criar uma mesa. Nesse caso:']],
      items: [
        [
          'O seu aparelho se conecta diretamente ao aparelho do outro jogador (WebRTC). Entre os dois viaja apenas o que a partida precisa: o apelido que você digitou, a maleta escolhida, as jogadas, os corações, as moedas e os talismãs da partida.',
        ],
        [
          'Para os dois aparelhos se encontrarem, o jogo usa o servidor público e gratuito do ',
          { b: 'PeerJS' },
          ' (0.peerjs.com), mantido pelo projeto PeerJS. Ele recebe o ID da mesa e os dados técnicos da conexão, como o endereço IP. Quando a ligação direta não é possível, a partida pode passar por um servidor de retransmissão do mesmo projeto. O desenvolvedor não opera esses servidores e não recebe nem guarda nenhum desses dados.',
        ],
        ['Como em toda conexão direta, o outro jogador também recebe o endereço IP do seu aparelho. Use a mesa online com pessoas de sua confiança.'],
        [
          'O apelido e a mesa em andamento ficam salvos só no seu aparelho (',
          { code: 'localStorage' },
          '), para você voltar à partida se a página recarregar.',
        ],
      ],
    },
    {
      title: '4. Permissões de Dispositivo',
      paragraphs: [
        [
          'O aplicativo ',
          { b: 'Buxaria' },
          ' não solicita acesso a permissões invasivas do sistema operacional, como câmera, microfone, agenda de contatos ou localização em segundo plano. Ele utiliza apenas recursos operacionais básicos para execução local de áudio, renderização gráfica e resposta tátil/vibração, além do acesso à internet, usado somente pela mesa online.',
        ],
      ],
    },
    {
      title: '5. Anúncios e Serviços de Terceiros',
      paragraphs: [['O ', { b: 'Buxaria' }, ' é um aplicativo premium pago:']],
      items: [
        ['Não contém redes de anúncios de terceiros (sem AdMob, Unity Ads ou similares).'],
        ['Não utiliza ferramentas externas de rastreamento de comportamento, analytics ou telemetria invasiva.'],
        ['O único serviço de terceiros é o servidor de conexão do PeerJS, usado só pela mesa online (item 3).'],
        [
          'As transações financeiras de aquisição do jogo são processadas de forma exclusiva e direta pelos serviços de pagamento da própria Google Play Store, sob os termos de segurança da Google. O desenvolvedor não tem acesso aos seus dados de cartão de crédito ou dados bancários.',
        ],
      ],
    },
    {
      title: '6. Privacidade de Crianças e Menores',
      paragraphs: [
        [
          'Em conformidade com as diretrizes internacionais (como COPPA e GDPR) e nacionais (LGPD), o jogo não coleta conscientemente qualquer dado de crianças ou adolescentes.',
        ],
      ],
    },
    {
      title: '7. Contato com o Desenvolvedor',
      paragraphs: [
        ['Em caso de dúvidas, esclarecimentos técnicos ou solicitações referentes a esta Política de Privacidade, entre em contato pelo e-mail de suporte:'],
        [{ b: PRIVACY_EMAIL }],
      ],
    },
  ],
});

/** O texto corrido de um trecho (sem marcação), para comparar com as páginas. */
export const plainOf = (chunks) => chunks.map((c) => (typeof c === 'string' ? c : (c.b ?? c.code ?? ''))).join('');

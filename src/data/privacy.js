/**
 * Política de Privacidade (Patch 0.9.7): o texto que o jogo mostra nas Opções e que a página
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
          ' NÃO coleta, não armazena, não transmite e não compartilha nenhum dado pessoal identificável dos seus usuários (como nome, endereço, e-mail, telefone, localização geográfica, fotos ou contatos).',
        ],
      ],
    },
    {
      title: '2. Armazenamento Local de Dados (Local Storage / Cache)',
      paragraphs: [['O jogo funciona inteiramente de forma local e offline no dispositivo do usuário:']],
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
      title: '3. Permissões de Dispositivo',
      paragraphs: [
        [
          'O aplicativo ',
          { b: 'Buxaria' },
          ' não solicita acesso a permissões invasivas do sistema operacional, como câmera, microfone, agenda de contatos ou localização em segundo plano. Ele utiliza apenas recursos operacionais básicos para execução local de áudio, renderização gráfica e resposta tátil/vibração.',
        ],
      ],
    },
    {
      title: '4. Anúncios e Serviços de Terceiros',
      paragraphs: [['O ', { b: 'Buxaria' }, ' é um aplicativo premium pago:']],
      items: [
        ['Não contém redes de anúncios de terceiros (sem AdMob, Unity Ads ou similares).'],
        ['Não utiliza ferramentas externas de rastreamento de comportamento, analytics ou telemetria invasiva.'],
        [
          'As transações financeiras de aquisição do jogo são processadas de forma exclusiva e direta pelos serviços de pagamento da própria Google Play Store, sob os termos de segurança da Google. O desenvolvedor não tem acesso aos seus dados de cartão de crédito ou dados bancários.',
        ],
      ],
    },
    {
      title: '5. Privacidade de Crianças e Menores',
      paragraphs: [
        [
          'Em conformidade com as diretrizes internacionais (como COPPA e GDPR) e nacionais (LGPD), o jogo não coleta conscientemente qualquer dado de crianças ou adolescentes.',
        ],
      ],
    },
    {
      title: '6. Contato com o Desenvolvedor',
      paragraphs: [
        ['Em caso de dúvidas, esclarecimentos técnicos ou solicitações referentes a esta Política de Privacidade, entre em contato pelo e-mail de suporte:'],
        [{ b: PRIVACY_EMAIL }],
      ],
    },
  ],
});

/** O texto corrido de um trecho (sem marcação), para comparar com as páginas. */
export const plainOf = (chunks) => chunks.map((c) => (typeof c === 'string' ? c : (c.b ?? c.code ?? ''))).join('');

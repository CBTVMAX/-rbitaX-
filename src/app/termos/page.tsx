import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string };

type Section = { title: string; blocks: Block[] };

const p = (text: string): Block => ({ type: "p", text });
const ul = (items: string[]): Block => ({ type: "ul", items });
const h3 = (text: string): Block => ({ type: "h3", text });
const quote = (text: string): Block => ({ type: "quote", text });

const INTRO: Block[] = [
  p("Bem-vindo ao Órbita X — Seu Universo em Conexão."),
  p(
    "Estes Termos de Uso estabelecem as regras para utilização do Órbita X, incluindo perfis, publicações, comunidades, grupos, Messenger, Stories, Clipes, música, vídeos, jogos, adesivos, presentes, personalizações, Órbita Coins e demais recursos disponibilizados pela plataforma."
  ),
  p("Ao criar uma conta ou utilizar o Órbita X, você declara que leu, compreendeu e concorda com estes Termos de Uso."),
];

const SECTIONS: Section[] = [
  {
    title: "1. Sobre o Órbita X",
    blocks: [
      p("O Órbita X é uma rede social criada para conectar pessoas, permitir o compartilhamento de conteúdos, criação de comunidades, comunicação entre usuários e participação em diferentes experiências dentro da plataforma."),
      p("Entre os recursos que podem ser disponibilizados estão:"),
      ul([
        "Perfis pessoais;",
        "Publicações;",
        "Fotos e vídeos;",
        "Stories;",
        "Clipes;",
        "Amigos e seguidores;",
        "Comunidades;",
        "Grupos;",
        "Messenger;",
        "Chamadas;",
        "Eventos;",
        "Música;",
        "Jogos;",
        "Adesivos;",
        "Presentes virtuais;",
        "Personalização de perfis;",
        "Loja;",
        "Órbita Coins;",
        "Outros recursos desenvolvidos futuramente.",
      ]),
    ],
  },
  {
    title: "2. Requisito de idade",
    blocks: [
      p("O Órbita X é destinado exclusivamente a pessoas com 18 anos ou mais."),
      p("Para criar uma conta, o usuário deverá informar sua data de nascimento verdadeira."),
      p("A data de nascimento será utilizada principalmente para verificar se o usuário atende ao requisito mínimo de idade da plataforma."),
      p("O Órbita X poderá solicitar mecanismos adicionais de verificação de idade quando forem necessários para segurança, prevenção de fraude ou cumprimento de obrigações legais."),
      p("Caso seja identificada uma conta pertencente a uma pessoa menor de 18 anos, a conta poderá ser restringida, suspensa ou encerrada."),
    ],
  },
  {
    title: "3. Criação da conta",
    blocks: [
      p("Para criar uma conta, o usuário deverá fornecer informações verdadeiras e atualizadas."),
      p("O cadastro poderá solicitar:"),
      ul([
        "Nome;",
        "Sobrenome;",
        "Data de nascimento;",
        "Gênero;",
        "E-mail ou número de telefone;",
        "Senha;",
        "Código de verificação;",
        "Aceite dos Termos de Uso;",
        "Ciência da Política de Privacidade.",
      ]),
      p("O usuário não precisa informar CPF ou CNPJ para criar uma conta pessoal no Órbita X."),
      p("O Órbita X poderá solicitar confirmação do e-mail ou número de telefone através de código de segurança."),
    ],
  },
  {
    title: "4. Informações verdadeiras",
    blocks: [
      p("O usuário deve fornecer informações verdadeiras durante o cadastro e manter suas informações relevantes atualizadas."),
      p("É proibido utilizar informações falsas com a finalidade de:"),
      ul([
        "Fraudar a plataforma;",
        "Enganar outros usuários;",
        "Praticar golpes;",
        "Se passar por outra pessoa;",
        "Burlar restrições de segurança ou idade.",
      ]),
    ],
  },
  {
    title: "5. Orbit ID",
    blocks: [
      p("Cada conta do Órbita X possuirá um Orbit ID exclusivo."),
      p("O Orbit ID:"),
      ul([
        "É gerado automaticamente;",
        "É associado permanentemente à conta;",
        "É exclusivo;",
        "Não é escolhido pelo usuário durante o cadastro;",
        "Não pode ser transferido para outra pessoa;",
        "Não deve ser reutilizado após encerramento da conta.",
      ]),
      p("O Orbit ID serve como identificador público permanente da conta dentro do Órbita X."),
    ],
  },
  {
    title: "6. Nome de usuário (@username)",
    blocks: [
      p("O usuário poderá posteriormente escolher um nome de usuário personalizado, quando essa funcionalidade estiver disponível."),
      p("Exemplo: @nicolasrayne"),
      p("O nome de usuário deverá respeitar as regras da plataforma e estar disponível."),
      p("O Órbita X poderá impedir nomes de usuário que:"),
      ul([
        "Já estejam sendo utilizados;",
        "Sejam reservados;",
        "Sejam utilizados para fraude;",
        "Sejam ofensivos ou proibidos;",
        "Possam causar confusão com contas oficiais;",
        "Violem direitos de terceiros.",
      ]),
      p("Alterar o @username não altera o Orbit ID ou a identidade interna da conta."),
    ],
  },
  {
    title: "7. Segurança da conta",
    blocks: [
      p("O usuário é responsável por proteger sua conta."),
      p("O usuário deverá:"),
      ul([
        "Manter sua senha em sigilo;",
        "Não compartilhar códigos de verificação;",
        "Não permitir acesso indevido à conta;",
        "Utilizar dispositivos confiáveis;",
        "Comunicar atividades suspeitas.",
      ]),
      p("O Órbita X nunca deverá solicitar que o usuário forneça sua senha por mensagem."),
    ],
  },
  {
    title: "8. Perfil",
    blocks: [
      p("O usuário poderá personalizar seu perfil utilizando os recursos disponibilizados pelo Órbita X."),
      p("Isso poderá incluir:"),
      ul([
        "Foto de perfil;",
        "Foto de capa;",
        "Nome;",
        "@username;",
        "Biografia;",
        "Informações pessoais;",
        "Cidade;",
        "Relacionamento;",
        "Formação;",
        "Profissão;",
        "Idiomas;",
        "Interesses;",
        "Comunidades;",
        "Temas;",
        "Molduras;",
        "Efeitos;",
        "Decorações;",
        "Outros recursos.",
      ]),
      p("O usuário poderá controlar a visibilidade de determinadas informações através das configurações de privacidade."),
    ],
  },
  {
    title: "9. Foto de perfil e capa",
    blocks: [
      p("O usuário poderá alterar sua foto de perfil e sua foto de capa."),
      p("A capa do perfil é independente da personalização visual escolhida pelo usuário e poderá ser uma imagem de sua preferência, desde que respeite estes Termos e a legislação aplicável."),
      p("Não é permitido utilizar imagens que violem direitos autorais, direitos de imagem ou outras regras aplicáveis."),
    ],
  },
  {
    title: "10. Publicações",
    blocks: [
      p("O usuário poderá criar publicações utilizando os recursos disponíveis no Órbita X."),
      p("Entre eles:"),
      ul([
        "Texto;",
        "Fotos;",
        "Vídeos;",
        "GIFs;",
        "Música;",
        "Enquetes;",
        "Links;",
        "Localização;",
        "Compartilhamentos;",
        "Publicações em comunidades;",
        "Outros formatos disponibilizados futuramente.",
      ]),
      p("O usuário é responsável pelo conteúdo que publica."),
    ],
  },
  {
    title: "11. Direitos sobre o conteúdo",
    blocks: [
      p("O usuário continua sendo titular dos direitos sobre conteúdos que lhe pertencem."),
      p("Ao publicar conteúdo no Órbita X, o usuário concede à plataforma uma licença necessária para hospedar, armazenar, processar, reproduzir tecnicamente, exibir e disponibilizar esse conteúdo dentro das funcionalidades escolhidas pelo próprio usuário."),
      p("Essa licença não significa transferência da propriedade do conteúdo para o Órbita X."),
    ],
  },
  {
    title: "12. Conteúdo proibido",
    blocks: [
      p("É proibido utilizar o Órbita X para publicar, transmitir, armazenar ou distribuir conteúdos ou realizar atividades ilegais ou que violem estes Termos."),
      p("São proibidos, entre outros:"),
      ul([
        "Conteúdo sexual envolvendo menores;",
        "Exploração sexual;",
        "Ameaças;",
        "Incentivo à violência;",
        "Terrorismo;",
        "Fraudes e golpes;",
        "Phishing;",
        "Malware;",
        "Invasão de contas;",
        "Roubo de identidade;",
        "Divulgação indevida de dados pessoais;",
        "Assédio e perseguição;",
        "Spam;",
        "Falsificação;",
        "Atividades criminosas;",
        "Conteúdo que infrinja direitos autorais;",
        "Conteúdo que viole direitos de terceiros.",
      ]),
    ],
  },
  {
    title: "13. Denúncias",
    blocks: [
      p("O Órbita X poderá disponibilizar ferramentas para denunciar:"),
      ul(["Perfis;", "Publicações;", "Comentários;", "Mensagens;", "Comunidades;", "Grupos;", "Outros conteúdos."]),
      p("As denúncias poderão ser analisadas por sistemas automatizados, equipes de moderação ou ambos."),
      p("Quando necessário, poderão ser tomadas medidas como:"),
      ul([
        "Remoção de conteúdo;",
        "Restrição de conteúdo;",
        "Restrição de funcionalidades;",
        "Suspensão da conta;",
        "Encerramento da conta;",
        "Bloqueio de usuários;",
        "Remoção de comunidades ou grupos.",
      ]),
    ],
  },
  {
    title: "14. Amigos e seguidores",
    blocks: [
      p("O Órbita X poderá disponibilizar recursos de:"),
      ul(["Amizade;", "Seguidores;", "Seguindo;", "Solicitações;", "Contatos;", "Amigos em comum;", "Bloqueio;", "Restrição."]),
      p("O usuário poderá utilizar as configurações de privacidade para controlar determinadas interações."),
    ],
  },
  {
    title: "15. Comunidades",
    blocks: [
      p("Usuários poderão criar comunidades de acordo com as regras da plataforma."),
      p("Uma comunidade poderá possuir:"),
      ul([
        "Proprietário;",
        "Administradores;",
        "Moderadores;",
        "Membros;",
        "Feed;",
        "Discussões;",
        "Fotos;",
        "Vídeos;",
        "Eventos;",
        "Arquivos;",
        "Grupos;",
        "Regras próprias.",
      ]),
      p("Os responsáveis pelas comunidades devem administrar seus espaços de acordo com estes Termos e a legislação aplicável."),
      p("O Órbita X poderá tomar medidas contra comunidades que violem as regras da plataforma."),
    ],
  },
  {
    title: "16. Messenger",
    blocks: [
      p("O Órbita X poderá oferecer um sistema de mensagens chamado Messenger."),
      p("O Messenger poderá permitir:"),
      ul([
        "Mensagens de texto;",
        "Fotos;",
        "Vídeos;",
        "Arquivos;",
        "GIFs;",
        "Links;",
        "Localização;",
        "Enquetes;",
        "Adesivos;",
        "Presentes;",
        "Reações;",
        "Mensagens de voz;",
        "Chamadas;",
        "Conversas em grupo.",
      ]),
      p("O Messenger não deverá ser utilizado para atividades ilegais, golpes, ameaças, assédio ou outras violações destes Termos."),
    ],
  },
  {
    title: "17. Adesivos, presentes e personalizações",
    blocks: [
      p("O Órbita X poderá disponibilizar itens virtuais e cosméticos, incluindo:"),
      ul([
        "Adesivos;",
        "Molduras;",
        "Temas;",
        "Efeitos;",
        "Animações;",
        "Presentes;",
        "Decorações;",
        "Personalizações de perfil;",
        "Personalizações do Messenger.",
      ]),
      p("Esses itens poderão ser gratuitos ou pagos."),
      p("Os itens virtuais não representam dinheiro ou investimento."),
    ],
  },
  {
    title: "18. Órbita Coins",
    blocks: [
      p("O Órbita X poderá disponibilizar uma moeda virtual chamada Órbita Coins."),
      p("As Órbita Coins poderão ser utilizadas dentro dos recursos autorizados pela plataforma."),
      p("As Órbita Coins:"),
      ul([
        "Não são moeda oficial;",
        "Não representam depósito bancário;",
        "Não são investimento;",
        "Não conferem participação societária;",
        "Não devem ser utilizadas como instrumento financeiro.",
      ]),
      p("As condições de compra, utilização e eventual reembolso serão apresentadas pela plataforma quando aplicáveis."),
    ],
  },
  {
    title: "19. Compras",
    blocks: [
      p("Alguns recursos poderão ser disponibilizados mediante pagamento."),
      p("Antes da confirmação de uma compra, o usuário deverá receber informações sobre:"),
      ul(["Produto ou recurso;", "Preço;", "Forma de pagamento;", "Condições aplicáveis."]),
      p("Os pagamentos poderão ser processados por provedores especializados."),
    ],
  },
  {
    title: "20. Propriedade intelectual",
    blocks: [
      p("A marca Órbita X, incluindo seu nome, logotipo, identidade visual, interface, software, elementos gráficos e demais materiais pertencentes à plataforma, são protegidos pela legislação aplicável."),
      p("Não é permitido copiar, reproduzir, modificar ou utilizar esses elementos comercialmente sem autorização."),
    ],
  },
  {
    title: "21. Impersonação e contas falsas",
    blocks: [
      p("É proibido criar ou utilizar uma conta com a finalidade de se passar por:"),
      ul(["Outra pessoa;", "Empresa;", "Organização;", "Criador;", "Personalidade;", "Conta oficial;", "Comunidade oficial."]),
      p("O Órbita X poderá investigar contas envolvidas em impersonação ou fraude."),
    ],
  },
  {
    title: "22. Suspensão e encerramento",
    blocks: [
      p("O usuário poderá solicitar o encerramento de sua conta através dos recursos disponibilizados pela plataforma."),
      p("O Órbita X poderá suspender ou encerrar uma conta quando houver:"),
      ul([
        "Violação destes Termos;",
        "Violação da legislação;",
        "Fraude;",
        "Abuso;",
        "Risco à segurança;",
        "Uso indevido da plataforma;",
        "Determinação legal ou judicial.",
      ]),
      p("Quando aplicável, poderão existir mecanismos de revisão ou recurso."),
    ],
  },
  {
    title: "23. Disponibilidade da plataforma",
    blocks: [
      p("O Órbita X buscará manter seus serviços disponíveis, mas poderão ocorrer interrupções causadas por:"),
      ul([
        "Manutenção;",
        "Atualizações;",
        "Falhas técnicas;",
        "Problemas de infraestrutura;",
        "Serviços de terceiros;",
        "Incidentes de segurança;",
        "Eventos fora do controle da plataforma.",
      ]),
    ],
  },
  {
    title: "24. Alterações dos Termos",
    blocks: [
      p("O Órbita X poderá atualizar estes Termos para refletir:"),
      ul(["Novas funcionalidades;", "Alterações na plataforma;", "Mudanças legais;", "Melhorias de segurança;", "Mudanças nos serviços."]),
      p("Quando houver alterações relevantes, o usuário poderá ser informado através da plataforma ou de outros canais disponíveis."),
    ],
  },
  {
    title: "25. Privacidade",
    blocks: [
      p("O tratamento dos dados pessoais dos usuários é realizado de acordo com a Política de Privacidade do Órbita X."),
      p("A Política de Privacidade explica quais dados são tratados, para quais finalidades, como são protegidos e quais direitos podem ser exercidos pelos usuários."),
    ],
  },
  {
    title: "26. Legislação aplicável",
    blocks: [p("Estes Termos serão interpretados de acordo com a legislação aplicável no Brasil.")],
  },
  {
    title: "27. Contato",
    blocks: [
      p("Órbita X — Seu Universo em Conexão"),
      p("E-mail: orbitaxonline@gmail.com"),
      p("Para assuntos relacionados à privacidade, o usuário poderá utilizar o canal indicado na Política de Privacidade."),
      quote("Li e concordo com os Termos de Uso e a Política de Privacidade do Órbita X."),
    ],
  },
];

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return <p className="mb-3 text-sm leading-relaxed text-white/60">{block.text}</p>;
  }
  if (block.type === "h3") {
    return <h3 className="mb-1 mt-4 text-sm font-semibold text-white/90">{block.text}</h3>;
  }
  if (block.type === "quote") {
    return (
      <blockquote className="mb-3 border-l-2 border-orbit-pink pl-4 text-sm italic leading-relaxed text-white/70">
        {block.text}
      </blockquote>
    );
  }
  return (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-white/60">
      {block.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default async function TermosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <PublicHeader authed={!!user} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-6 sm:px-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
          <span className="text-orbit-cyan">|</span> Legal
        </p>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Termos de Uso — Órbita X</h1>
        <p className="mt-2 text-sm text-white/40">Última atualização: 23 de setembro de 2026.</p>

        <div className="mt-8">
          {INTRO.map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
        </div>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 font-display text-lg font-bold text-white">{section.title}</h2>
              {section.blocks.map((block, i) => (
                <RenderBlock key={i} block={block} />
              ))}
            </section>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

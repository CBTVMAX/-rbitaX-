import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { TermosToc, type TocItem } from "@/components/termos-toc";
import { ExpandableIconList, type IconListItem } from "@/components/expandable-list";
import {
  Globe,
  UserPlus,
  ShieldAlert,
  IdCard,
  Image as ImageIcon,
  Users,
  MessageCircle,
  Coins,
  ShieldCheck,
  Flag,
  Ban,
  FileText,
  Scale,
  Mail,
  User,
  Calendar,
  Film,
  Phone,
  Music,
  Gamepad2,
  Sticker,
  Gift,
  Palette,
  Store,
  Sparkles,
  Aperture,
  Zap,
  Link2,
  KeyRound,
  Lock,
  RotateCcw,
  AtSign,
} from "lucide-react";

type Block =
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "iconGrid"; items: IconListItem[] }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string }
  | { type: "warn"; badge?: string; title: string; text: string };

type Section = { id: string; number: string; title: string; icon: React.ReactNode; color: string; navBadge?: string; blocks: Block[] };

const p = (text: string): Block => ({ type: "p", text });
const bullets = (items: string[]): Block => ({ type: "bullets", items });
const iconGrid = (items: IconListItem[]): Block => ({ type: "iconGrid", items });
const h3 = (text: string): Block => ({ type: "h3", text });
const quote = (text: string): Block => ({ type: "quote", text });
const warn = (title: string, text: string, badge?: string): Block => ({ type: "warn", title, text, badge });

const ic = (Icon: typeof User, className = "h-4 w-4") => <Icon className={className} />;

const INTRO: Block[] = [
  p("Bem-vindo ao Órbita X — Seu Universo em Conexão."),
  p(
    "Estes Termos de Uso estabelecem as regras para utilização do Órbita X, incluindo perfis, publicações, comunidades, grupos, Messenger, Stories, Clipes, música, vídeos, jogos, adesivos, presentes, personalizações, Órbita Coins e demais recursos disponibilizados pela plataforma."
  ),
  p("Ao criar uma conta ou utilizar o Órbita X, você declara que leu, compreendeu e concorda com estes Termos de Uso."),
];

const SECTIONS: Section[] = [
  {
    id: "sobre",
    number: "01",
    title: "Sobre o Órbita X",
    icon: ic(Globe),
    color: "border-orbit-blue/40 text-orbit-blue",
    blocks: [
      p(
        "O Órbita X é uma rede social criada para conectar pessoas, permitir o compartilhamento de conteúdos, criação de comunidades, comunicação entre usuários e participação em diferentes experiências dentro da plataforma."
      ),
      p("Entre os recursos que podem ser disponibilizados estão:"),
      iconGrid([
        { icon: ic(User), text: "Perfis pessoais" },
        { icon: ic(FileText), text: "Publicações" },
        { icon: ic(ImageIcon), text: "Fotos e vídeos" },
        { icon: ic(Aperture), text: "Stories" },
        { icon: ic(Film), text: "Clipes" },
        { icon: ic(UserPlus), text: "Amigos e seguidores" },
        { icon: ic(Users), text: "Comunidades" },
        { icon: ic(Users), text: "Grupos" },
        { icon: ic(MessageCircle), text: "Messenger" },
        { icon: ic(Phone), text: "Chamadas" },
        { icon: ic(Calendar), text: "Eventos" },
        { icon: ic(Music), text: "Música" },
        { icon: ic(Gamepad2), text: "Jogos" },
        { icon: ic(Sticker), text: "Adesivos" },
        { icon: ic(Gift), text: "Presentes virtuais" },
        { icon: ic(Palette), text: "Personalização de perfis" },
        { icon: ic(Store), text: "Loja" },
        { icon: ic(Coins), text: "Órbita Coins" },
        { icon: ic(Sparkles), text: "Outros recursos desenvolvidos futuramente" },
      ]),
    ],
  },
  {
    id: "conta",
    number: "02",
    title: "Conta e cadastro",
    icon: ic(UserPlus),
    color: "border-orbit-cyan/40 text-orbit-cyan",
    blocks: [
      h3("Criação da conta"),
      p("Para criar uma conta, o usuário deverá fornecer informações verdadeiras e atualizadas."),
      p("O cadastro poderá solicitar:"),
      bullets([
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
      h3("Informações verdadeiras"),
      p("O usuário deve fornecer informações verdadeiras durante o cadastro e manter suas informações relevantes atualizadas."),
      p("É proibido utilizar informações falsas com a finalidade de:"),
      bullets(["Fraudar a plataforma;", "Enganar outros usuários;", "Praticar golpes;", "Se passar por outra pessoa;", "Burlar restrições de segurança ou idade."]),
      h3("Segurança da conta"),
      p("O usuário é responsável por proteger sua conta."),
      p("O usuário deverá:"),
      bullets([
        "Manter sua senha em sigilo;",
        "Não compartilhar códigos de verificação;",
        "Não permitir acesso indevido à conta;",
        "Utilizar dispositivos confiáveis;",
        "Comunicar atividades suspeitas.",
      ]),
      warn("Nunca pediremos sua senha", "O Órbita X nunca deverá solicitar que o usuário forneça sua senha por mensagem."),
    ],
  },
  {
    id: "idade",
    number: "03",
    title: "Requisito de idade",
    icon: ic(ShieldAlert),
    color: "border-orbit-pink/40 text-orbit-pink",
    navBadge: "18+",
    blocks: [
      warn("Plataforma 18+", "O Órbita X é destinado exclusivamente a pessoas com 18 anos ou mais.", "18+"),
      p("Para criar uma conta, o usuário deverá informar sua data de nascimento verdadeira."),
      p("A data de nascimento será utilizada principalmente para verificar se o usuário atende ao requisito mínimo de idade da plataforma."),
      p("O Órbita X poderá solicitar mecanismos adicionais de verificação de idade quando forem necessários para segurança, prevenção de fraude ou cumprimento de obrigações legais."),
      p("Caso seja identificada uma conta pertencente a uma pessoa menor de 18 anos, a conta poderá ser restringida, suspensa ou encerrada."),
    ],
  },
  {
    id: "orbit-id",
    number: "04",
    title: "Orbit ID e @username",
    icon: ic(IdCard),
    color: "border-orbit-purple/40 text-orbit-purple",
    blocks: [
      h3("Orbit ID"),
      p("Cada conta do Órbita X possuirá um Orbit ID exclusivo."),
      iconGrid([
        { icon: ic(Zap), text: "É gerado automaticamente" },
        { icon: ic(Link2), text: "É associado permanentemente à conta" },
        { icon: ic(KeyRound), text: "É exclusivo" },
        { icon: ic(Ban), text: "Não é escolhido pelo usuário durante o cadastro" },
        { icon: ic(Lock), text: "Não pode ser transferido para outra pessoa" },
        { icon: ic(RotateCcw), text: "Não deve ser reutilizado após encerramento da conta" },
      ]),
      p("O Orbit ID serve como identificador público permanente da conta dentro do Órbita X."),
      h3("Nome de usuário (@username)"),
      p("O usuário poderá posteriormente escolher um nome de usuário personalizado, quando essa funcionalidade estiver disponível."),
      quote("Exemplo: @nicolasrayne"),
      p("O nome de usuário deverá respeitar as regras da plataforma e estar disponível."),
      p("O Órbita X poderá impedir nomes de usuário que:"),
      bullets([
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
    id: "perfil",
    number: "05",
    title: "Perfil e conteúdo",
    icon: ic(ImageIcon),
    color: "border-orbit-blue/40 text-orbit-blue",
    blocks: [
      h3("Perfil"),
      p("O usuário poderá personalizar seu perfil utilizando os recursos disponibilizados pelo Órbita X."),
      p("Isso poderá incluir:"),
      iconGrid([
        { icon: ic(ImageIcon), text: "Foto de perfil" },
        { icon: ic(ImageIcon), text: "Foto de capa" },
        { icon: ic(User), text: "Nome" },
        { icon: ic(AtSign), text: "@username" },
        { icon: ic(FileText), text: "Biografia" },
        { icon: ic(User), text: "Informações pessoais" },
        { icon: ic(Globe), text: "Cidade" },
        { icon: ic(Users), text: "Relacionamento" },
        { icon: ic(FileText), text: "Formação" },
        { icon: ic(Store), text: "Profissão" },
        { icon: ic(MessageCircle), text: "Idiomas" },
        { icon: ic(Sparkles), text: "Interesses" },
        { icon: ic(Users), text: "Comunidades" },
        { icon: ic(Palette), text: "Temas" },
        { icon: ic(ImageIcon), text: "Molduras" },
        { icon: ic(Sparkles), text: "Efeitos" },
        { icon: ic(Palette), text: "Decorações" },
        { icon: ic(Sparkles), text: "Outros recursos" },
      ]),
      p("O usuário poderá controlar a visibilidade de determinadas informações através das configurações de privacidade."),
      h3("Foto de perfil e capa"),
      p("O usuário poderá alterar sua foto de perfil e sua foto de capa."),
      p("A capa do perfil é independente da personalização visual escolhida pelo usuário e poderá ser uma imagem de sua preferência, desde que respeite estes Termos e a legislação aplicável."),
      p("Não é permitido utilizar imagens que violem direitos autorais, direitos de imagem ou outras regras aplicáveis."),
      h3("Publicações"),
      p("O usuário poderá criar publicações utilizando os recursos disponíveis no Órbita X."),
      p("Entre eles:"),
      bullets([
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
      h3("Direitos sobre o conteúdo"),
      p("O usuário continua sendo titular dos direitos sobre conteúdos que lhe pertencem."),
      p(
        "Ao publicar conteúdo no Órbita X, o usuário concede à plataforma uma licença necessária para hospedar, armazenar, processar, reproduzir tecnicamente, exibir e disponibilizar esse conteúdo dentro das funcionalidades escolhidas pelo próprio usuário."
      ),
      p("Essa licença não significa transferência da propriedade do conteúdo para o Órbita X."),
    ],
  },
  {
    id: "comunidades",
    number: "06",
    title: "Comunidades",
    icon: ic(Users),
    color: "border-orbit-cyan/40 text-orbit-cyan",
    blocks: [
      h3("Amigos e seguidores"),
      p("O Órbita X poderá disponibilizar recursos de:"),
      bullets(["Amizade;", "Seguidores;", "Seguindo;", "Solicitações;", "Contatos;", "Amigos em comum;", "Bloqueio;", "Restrição."]),
      p("O usuário poderá utilizar as configurações de privacidade para controlar determinadas interações."),
      h3("Comunidades"),
      p("Usuários poderão criar comunidades de acordo com as regras da plataforma."),
      p("Uma comunidade poderá possuir:"),
      bullets([
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
    id: "messenger",
    number: "07",
    title: "Messenger",
    icon: ic(MessageCircle),
    color: "border-orbit-purple/40 text-orbit-purple",
    blocks: [
      p("O Órbita X poderá oferecer um sistema de mensagens chamado Messenger."),
      p("O Messenger poderá permitir:"),
      iconGrid([
        { icon: ic(FileText), text: "Mensagens de texto" },
        { icon: ic(ImageIcon), text: "Fotos" },
        { icon: ic(Film), text: "Vídeos" },
        { icon: ic(FileText), text: "Arquivos" },
        { icon: ic(Aperture), text: "GIFs" },
        { icon: ic(Link2), text: "Links" },
        { icon: ic(Globe), text: "Localização" },
        { icon: ic(Sparkles), text: "Enquetes" },
        { icon: ic(Sticker), text: "Adesivos" },
        { icon: ic(Gift), text: "Presentes" },
        { icon: ic(Sparkles), text: "Reações" },
        { icon: ic(Music), text: "Mensagens de voz" },
        { icon: ic(Phone), text: "Chamadas" },
        { icon: ic(Users), text: "Conversas em grupo" },
      ]),
      p("O Messenger não deverá ser utilizado para atividades ilegais, golpes, ameaças, assédio ou outras violações destes Termos."),
    ],
  },
  {
    id: "coins",
    number: "08",
    title: "Adesivos e Órbita Coins",
    icon: ic(Coins),
    color: "border-orbit-pink/40 text-orbit-pink",
    blocks: [
      h3("Adesivos, presentes e personalizações"),
      p("O Órbita X poderá disponibilizar itens virtuais e cosméticos, incluindo:"),
      iconGrid([
        { icon: ic(Sticker), text: "Adesivos" },
        { icon: ic(ImageIcon), text: "Molduras" },
        { icon: ic(Palette), text: "Temas" },
        { icon: ic(Sparkles), text: "Efeitos" },
        { icon: ic(Aperture), text: "Animações" },
        { icon: ic(Gift), text: "Presentes" },
        { icon: ic(Palette), text: "Decorações" },
        { icon: ic(User), text: "Personalizações de perfil" },
        { icon: ic(MessageCircle), text: "Personalizações do Messenger" },
      ]),
      p("Esses itens poderão ser gratuitos ou pagos. Os itens virtuais não representam dinheiro ou investimento."),
      h3("Órbita Coins"),
      p("O Órbita X poderá disponibilizar uma moeda virtual chamada Órbita Coins, utilizável dentro dos recursos autorizados pela plataforma."),
      warn(
        "Órbita Coins não são dinheiro",
        "Não são moeda oficial, não representam depósito bancário, não são investimento, não conferem participação societária e não devem ser utilizadas como instrumento financeiro."
      ),
      p("As condições de compra, utilização e eventual reembolso serão apresentadas pela plataforma quando aplicáveis."),
      h3("Compras"),
      p("Antes da confirmação de uma compra, o usuário deverá receber informações sobre produto ou recurso, preço, forma de pagamento e condições aplicáveis."),
      p("Os pagamentos poderão ser processados por provedores especializados."),
    ],
  },
  {
    id: "regras",
    number: "09",
    title: "Regras de uso",
    icon: ic(ShieldCheck),
    color: "border-orbit-blue/40 text-orbit-blue",
    blocks: [
      h3("Conteúdo proibido"),
      warn(
        "Tolerância zero",
        "É proibido utilizar o Órbita X para publicar, transmitir, armazenar ou distribuir conteúdos ou realizar atividades ilegais ou que violem estes Termos."
      ),
      p("São proibidos, entre outros:"),
      bullets([
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
      h3("Impersonação e contas falsas"),
      p("É proibido criar ou utilizar uma conta com a finalidade de se passar por:"),
      bullets(["Outra pessoa;", "Empresa;", "Organização;", "Criador;", "Personalidade;", "Conta oficial;", "Comunidade oficial."]),
      p("O Órbita X poderá investigar contas envolvidas em impersonação ou fraude."),
      h3("Propriedade intelectual"),
      p(
        "A marca Órbita X, incluindo seu nome, logotipo, identidade visual, interface, software, elementos gráficos e demais materiais pertencentes à plataforma, são protegidos pela legislação aplicável."
      ),
      p("Não é permitido copiar, reproduzir, modificar ou utilizar esses elementos comercialmente sem autorização."),
    ],
  },
  {
    id: "denuncias",
    number: "10",
    title: "Denúncias e moderação",
    icon: ic(Flag),
    color: "border-orbit-cyan/40 text-orbit-cyan",
    blocks: [
      p("O Órbita X poderá disponibilizar ferramentas para denunciar:"),
      bullets(["Perfis;", "Publicações;", "Comentários;", "Mensagens;", "Comunidades;", "Grupos;", "Outros conteúdos."]),
      p("As denúncias poderão ser analisadas por sistemas automatizados, equipes de moderação ou ambos."),
      p("Quando necessário, poderão ser tomadas medidas como:"),
      bullets([
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
    id: "encerramento",
    number: "11",
    title: "Suspensão e encerramento",
    icon: ic(Ban),
    color: "border-orbit-purple/40 text-orbit-purple",
    blocks: [
      p("O usuário poderá solicitar o encerramento de sua conta através dos recursos disponibilizados pela plataforma."),
      p("O Órbita X poderá suspender ou encerrar uma conta quando houver:"),
      bullets([
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
    id: "alteracoes",
    number: "12",
    title: "Alterações dos Termos",
    icon: ic(FileText),
    color: "border-orbit-pink/40 text-orbit-pink",
    blocks: [
      h3("Disponibilidade da plataforma"),
      p("O Órbita X buscará manter seus serviços disponíveis, mas poderão ocorrer interrupções causadas por:"),
      bullets([
        "Manutenção;",
        "Atualizações;",
        "Falhas técnicas;",
        "Problemas de infraestrutura;",
        "Serviços de terceiros;",
        "Incidentes de segurança;",
        "Eventos fora do controle da plataforma.",
      ]),
      h3("Alterações dos Termos"),
      p("O Órbita X poderá atualizar estes Termos para refletir:"),
      bullets(["Novas funcionalidades;", "Alterações na plataforma;", "Mudanças legais;", "Melhorias de segurança;", "Mudanças nos serviços."]),
      p("Quando houver alterações relevantes, o usuário poderá ser informado através da plataforma ou de outros canais disponíveis."),
    ],
  },
  {
    id: "legislacao",
    number: "13",
    title: "Legislação aplicável",
    icon: ic(Scale),
    color: "border-orbit-blue/40 text-orbit-blue",
    blocks: [
      h3("Privacidade"),
      p("O tratamento dos dados pessoais dos usuários é realizado de acordo com a Política de Privacidade do Órbita X."),
      p("A Política de Privacidade explica quais dados são tratados, para quais finalidades, como são protegidos e quais direitos podem ser exercidos pelos usuários."),
      h3("Legislação aplicável"),
      p("Estes Termos serão interpretados de acordo com a legislação aplicável no Brasil."),
    ],
  },
  {
    id: "contato",
    number: "14",
    title: "Contato",
    icon: ic(Mail),
    color: "border-orbit-cyan/40 text-orbit-cyan",
    blocks: [
      p("Órbita X — Seu Universo em Conexão"),
      p("E-mail: orbitaxonline@gmail.com"),
      p("Para assuntos relacionados à privacidade, o usuário poderá utilizar o canal indicado na Política de Privacidade."),
      quote("Li e concordo com os Termos de Uso e a Política de Privacidade do Órbita X."),
    ],
  },
];

const TOC_ITEMS: TocItem[] = SECTIONS.map((section) => ({
  id: section.id,
  number: section.number,
  title: section.title,
  icon: section.icon,
  color: section.color,
  badge: section.navBadge,
}));

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return <p className="mb-3 text-sm leading-relaxed text-white/60">{block.text}</p>;
  }
  if (block.type === "h3") {
    return <h3 className="mb-2 mt-5 text-sm font-semibold text-white/90">{block.text}</h3>;
  }
  if (block.type === "quote") {
    return (
      <blockquote className="mb-3 border-l-2 border-orbit-pink pl-4 text-sm italic leading-relaxed text-white/70">
        {block.text}
      </blockquote>
    );
  }
  if (block.type === "warn") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-orbit-pink/30 bg-orbit-pink/[0.06] p-4">
        {block.badge && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-orbit-pink/50 text-xs font-bold text-orbit-pink">
            {block.badge}
          </span>
        )}
        <div>
          <p className="mb-0.5 text-sm font-semibold text-white">{block.title}</p>
          <p className="text-sm leading-relaxed text-white/60">{block.text}</p>
        </div>
      </div>
    );
  }
  if (block.type === "iconGrid") {
    return <ExpandableIconList items={block.items} />;
  }
  return (
    <ul className="mb-4 space-y-1.5 text-sm leading-relaxed text-white/60">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orbit-cyan/60" />
          {item}
        </li>
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

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
          <span className="text-orbit-cyan">|</span> Legal
        </p>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Termos de Uso — <span className="orbit-text-gradient">Órbita X</span>
        </h1>
        <p className="mt-2 text-sm text-white/40">Seu universo em conexão.</p>
        <p className="mt-1 text-sm text-white/40">Última atualização: 23 de setembro de 2026.</p>
        <div className="mt-6 h-px w-full bg-orbit-gradient opacity-40" />

        <div className="mt-8 max-w-3xl">
          {INTRO.map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[260px_1fr]">
          <TermosToc items={TOC_ITEMS} />

          <div className="min-w-0 space-y-6">
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-2xl border border-white/10 bg-space-card p-6 sm:p-8"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-sm font-bold text-white">
                    {section.number}
                  </span>
                  <h2 className="flex-1 font-display text-lg font-bold text-white sm:text-xl">{section.title}</h2>
                  <a href={`#${section.id}`} className="shrink-0 text-white/20 transition hover:text-white/50">
                    <Link2 className="h-4 w-4" />
                  </a>
                </div>
                {section.blocks.map((block, i) => (
                  <RenderBlock key={i} block={block} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

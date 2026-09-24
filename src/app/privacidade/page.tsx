import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { TermosToc, type TocItem } from "@/components/termos-toc";
import { DocHeroPlanet } from "@/components/doc-hero-planet";
import { Block, RenderBlock, p, bullets, checklist, iconGrid, h3, quote, info, hero, warn, fieldCard, row } from "@/components/legal-doc";
import {
  House,
  User,
  UserPlus,
  Users,
  Share2,
  Cookie,
  ShieldCheck,
  Shield,
  Clock,
  Trash2,
  FileText,
  Mail,
  Image as ImageIcon,
  Globe,
  Store,
  MessageCircle,
  Sparkles,
  Palette,
  Heart,
  Link2,
} from "lucide-react";

type Section = { id: string; number: string; title: string; icon: React.ReactNode; color: string; navBadge?: string; blocks: Block[] };

const ic = (Icon: typeof User, className = "h-4 w-4") => <Icon className={className} />;

const INTRO: Block[] = [p("Bem-vindo ao Órbita X — Seu Universo em Conexão.")];

const LEAD: Block = hero(
  "Sua privacidade é importante",
  "Esta Política de Privacidade explica como o Órbita X coleta, utiliza, armazena, protege e trata informações relacionadas aos seus usuários. Nosso objetivo é ser transparente e claro sobre como seus dados são utilizados.",
  <ShieldCheck className="h-5 w-5" />
);

const SECTIONS: Section[] = [
  {
    id: "introducao",
    number: "01",
    title: "Introdução",
    icon: ic(House),
    color: "border-orbit-blue/40 text-orbit-blue bg-orbit-blue/10",
    blocks: [
      p(
        "O Órbita X é uma rede social que permite aos usuários criar perfis, publicar conteúdos, conversar, participar de comunidades, adicionar amigos, seguir pessoas e utilizar diferentes recursos sociais e digitais."
      ),
      p("Esta Política explica:"),
      bullets([
        "quais informações podem ser coletadas;",
        "por que essas informações são utilizadas;",
        "como elas são protegidas;",
        "quando podem ser compartilhadas;",
        "quais escolhas e direitos o usuário possui.",
      ]),
      p("O tratamento de dados pessoais observará a legislação aplicável, incluindo a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018)."),
    ],
  },
  {
    id: "dados",
    number: "02",
    title: "Dados que coletamos",
    icon: ic(User),
    color: "border-orbit-cyan/40 text-orbit-cyan bg-orbit-cyan/10",
    blocks: [
      h3("Dados de cadastro"),
      p("O Órbita X coleta somente as informações necessárias para oferecer seus serviços e permitir o funcionamento das funcionalidades utilizadas pelo usuário. Para criar uma conta, o usuário poderá informar:"),
      row([
        fieldCard(ic(UserPlus), "Dados de cadastro", ["Nome", "Sobrenome", "Data de nascimento", "Gênero", "E-mail ou número de telefone", "Senha"]),
        warn("Sem CPF nem CNPJ", "O cadastro do Órbita X é pessoal e não exige CPF ou CNPJ."),
      ]),
      info("Uso restrito", "Utilizamos essas informações apenas para criar e proteger sua conta e oferecer os serviços da plataforma."),

      h3("Dados de autenticação"),
      p("Para permitir o acesso seguro à conta, o Órbita X poderá tratar:"),
      bullets(["e-mail;", "número de telefone;", "informações de autenticação;", "códigos de verificação;", "informações relacionadas à sessão;", "credenciais protegidas."]),
      p("As senhas deverão ser armazenadas utilizando mecanismos apropriados de segurança e não devem ficar disponíveis em formato de leitura comum para administradores da plataforma."),

      h3("Orbit ID"),
      p("Após a criação da conta, o Órbita X poderá gerar automaticamente um Orbit ID exclusivo, utilizado para identificar a conta dentro da plataforma. Ele:"),
      checklist(["É gerado automaticamente", "É exclusivo", "Permanece associado à conta", "Não depende do @username", "Não é escolhido durante o cadastro"]),
      p("O Orbit ID não substitui os dados necessários para autenticação da conta."),

      h3("Nome de usuário (@username)"),
      p(
        "O usuário poderá posteriormente escolher um @username, quando essa funcionalidade estiver disponível. O @username poderá ser utilizado para encontrar e mencionar o usuário dentro da plataforma."
      ),
      p("Alterações no @username não alteram a identidade interna da conta, o Orbit ID, publicações, amizades, seguidores, mensagens ou comunidades associadas."),

      h3("Informações do perfil"),
      p("Depois de criar sua conta, o usuário poderá adicionar informações ao perfil. Dependendo das funcionalidades disponibilizadas, isso poderá incluir:"),
      iconGrid([
        { icon: ic(ImageIcon), text: "Foto de perfil" },
        { icon: ic(ImageIcon), text: "Foto de capa" },
        { icon: ic(FileText), text: "Biografia" },
        { icon: ic(Globe), text: "Cidade" },
        { icon: ic(Heart), text: "Relacionamento" },
        { icon: ic(Store), text: "Profissão" },
        { icon: ic(FileText), text: "Formação" },
        { icon: ic(MessageCircle), text: "Idiomas" },
        { icon: ic(Sparkles), text: "Interesses" },
        { icon: ic(Users), text: "Informações familiares" },
        { icon: ic(Users), text: "Comunidades" },
        { icon: ic(Palette), text: "Outras informações escolhidas pelo usuário" },
      ]),
      p("O usuário poderá controlar a visibilidade de determinadas informações através das configurações de privacidade."),

      h3("Conteúdo publicado"),
      p("Quando o usuário publica conteúdo no Órbita X, a plataforma precisa processar determinadas informações para disponibilizar esse conteúdo. Isso pode incluir:"),
      bullets([
        "Textos;",
        "Fotos;",
        "Vídeos;",
        "GIFs;",
        "Músicas;",
        "Stories;",
        "Clipes;",
        "Enquetes;",
        "Comentários;",
        "Reações;",
        "Links;",
        "Localização adicionada à publicação;",
        "Compartilhamentos;",
        "Conteúdos publicados em comunidades.",
      ]),
      p("O usuário é responsável pelas informações e conteúdos que decide publicar."),

      h3("Mensagens e Messenger"),
      p("Quando o usuário utiliza o Messenger, o Órbita X poderá tratar informações necessárias para permitir envio e recebimento de mensagens, sincronização, armazenamento, notificações, conversas individuais e em grupo, chamadas, envio de arquivos, fotos, vídeos, GIFs, adesivos, presentes e outros recursos de comunicação."),
      warn("Respeite a privacidade de terceiros", "O usuário deve evitar compartilhar informações pessoais de terceiros sem autorização ou fundamento adequado."),

      h3("Amigos, seguidores e comunidades"),
      p("Para permitir o funcionamento dos recursos sociais, o Órbita X poderá tratar informações relacionadas a:"),
      bullets([
        "Amizades;",
        "Solicitações de amizade;",
        "Seguidores;",
        "Pessoas seguidas;",
        "Bloqueios;",
        "Comunidades, membros, grupos, administradores e moderadores;",
        "Interações entre usuários.",
      ]),
      p(
        "Quando o usuário cria ou participa de uma comunidade, o Órbita X poderá tratar informações relacionadas à sua participação, como a comunidade da qual participa, função exercida, publicações, comentários, participação em grupos, eventos e conteúdos enviados. A visibilidade dessas informações dependerá das configurações da comunidade e do perfil."
      ),

      h3("Dados técnicos"),
      p("Para funcionamento, segurança e melhoria da plataforma, podemos coletar informações técnicas, como:"),
      bullets([
        "Endereço IP;",
        "Tipo de dispositivo;",
        "Sistema operacional;",
        "Navegador;",
        "Versão do aplicativo;",
        "Idioma;",
        "Data e horário de acesso;",
        "Informações de sessão;",
        "Registros de erros;",
        "Informações relacionadas à segurança.",
      ]),
      p("Essas informações ajudam a detectar problemas técnicos, proteger contas e manter o funcionamento do Órbita X."),

      h3("Localização"),
      p(
        "Alguns recursos poderão utilizar localização. Quando uma funcionalidade solicitar acesso à localização, o usuário poderá controlar essa permissão através das configurações do dispositivo e da plataforma. A localização poderá ser utilizada, por exemplo, quando o usuário decidir:"
      ),
      bullets(["adicionar localização a uma publicação;", "utilizar recursos baseados em localização;", "encontrar conteúdos ou comunidades relacionados a determinados locais."]),
    ],
  },
  {
    id: "idade",
    number: "03",
    title: "Verificação de idade",
    icon: <span className="text-[10px] font-extrabold leading-none">18+</span>,
    color: "border-orbit-pink/40 text-orbit-pink bg-orbit-pink/10",
    blocks: [
      warn("Plataforma 18+", "O Órbita X é uma plataforma destinada exclusivamente a pessoas com 18 anos ou mais.", "18+"),
      p("A data de nascimento informada durante o cadastro é utilizada para verificar o requisito mínimo de idade."),
      p("Caso o sistema identifique que o usuário possui menos de 18 anos, o cadastro não poderá ser concluído."),
      p("Em determinadas situações, o Órbita X poderá solicitar uma verificação adicional de idade quando isso for necessário para segurança, prevenção de fraude ou cumprimento de obrigação legal."),
    ],
  },
  {
    id: "uso",
    number: "04",
    title: "Uso das informações",
    icon: ic(Users),
    color: "border-orbit-purple/40 text-orbit-purple bg-orbit-purple/10",
    blocks: [
      h3("Como utilizamos os dados"),
      p("As informações poderão ser utilizadas para:"),
      bullets([
        "Criar contas;",
        "Autenticar usuários;",
        "Verificar idade;",
        "Verificar e-mail ou telefone;",
        "Gerar Orbit ID;",
        "Permitir a criação de perfis;",
        "Disponibilizar publicações;",
        "Permitir amizades e seguidores;",
        "Oferecer comunidades e grupos;",
        "Disponibilizar o Messenger;",
        "Enviar notificações;",
        "Disponibilizar recursos personalizados;",
        "Processar compras;",
        "Disponibilizar Órbita Coins;",
        "Prevenir fraude;",
        "Detectar abuso;",
        "Proteger usuários;",
        "Solucionar problemas;",
        "Melhorar a plataforma;",
        "Cumprir obrigações legais.",
      ]),
      h3("Bases legais"),
      p("O tratamento de dados pessoais poderá ocorrer com fundamento nas bases legais previstas na legislação aplicável, incluindo, conforme o caso:"),
      checklist(["Execução de contrato", "Cumprimento de obrigação legal ou regulatória", "Exercício regular de direitos", "Legítimo interesse, quando aplicável", "Consentimento", "Outras hipóteses previstas na legislação"]),
      p("A base legal utilizada poderá variar conforme o tipo de informação e a finalidade do tratamento."),
      h3("Privacidade de terceiros"),
      warn(
        "Respeite os dados de outras pessoas",
        "É proibido utilizar o Órbita X para divulgar indevidamente informações pessoais de terceiros, incluindo documentos, senhas, dados bancários, informações financeiras, endereço residencial, telefone privado, informações confidenciais e outros dados obtidos de maneira indevida."
      ),
    ],
  },
  {
    id: "compartilhamento",
    number: "05",
    title: "Compartilhamento",
    icon: ic(Share2),
    color: "border-orbit-blue/40 text-orbit-blue bg-orbit-blue/10",
    blocks: [
      p("O Órbita X poderá utilizar fornecedores e prestadores de serviços necessários para o funcionamento da plataforma. Isso poderá incluir fornecedores de:"),
      bullets(["Hospedagem;", "Banco de dados;", "Autenticação;", "Armazenamento;", "Envio de e-mails e SMS;", "Pagamentos;", "Segurança;", "Infraestrutura tecnológica;", "Análise técnica;", "Suporte."]),
      p("Os dados também poderão ser disponibilizados quando houver obrigação legal ou determinação válida de autoridade competente."),

      h3("Órbita Coins, loja e pagamentos"),
      p("Quando o usuário realizar compras dentro do Órbita X, determinados dados poderão ser tratados para:"),
      bullets(["Processar a compra;", "Confirmar o pagamento;", "Disponibilizar o produto ou recurso adquirido;", "Prevenir fraude;", "Manter registros da transação;", "Atender obrigações legais."]),
      info(
        "Pagamentos processados com segurança",
        "Os dados completos de pagamento poderão ser processados diretamente por provedores especializados. O Órbita X não precisa armazenar diretamente dados completos de cartão quando o processamento for realizado por um provedor de pagamento adequado."
      ),
    ],
  },
  {
    id: "cookies",
    number: "06",
    title: "Cookies",
    icon: ic(Cookie),
    color: "border-orbit-cyan/40 text-orbit-cyan bg-orbit-cyan/10",
    blocks: [
      p("O Órbita X poderá utilizar cookies e tecnologias semelhantes para:"),
      checklist([
        "Manter o usuário conectado",
        "Autenticar sessões",
        "Salvar preferências",
        "Melhorar o desempenho",
        "Proteger a plataforma",
        "Detectar atividades suspeitas",
        "Compreender como os recursos são utilizados",
      ]),
    ],
  },
  {
    id: "seguranca",
    number: "07",
    title: "Segurança",
    icon: ic(ShieldCheck),
    color: "border-orbit-purple/40 text-orbit-purple bg-orbit-purple/10",
    blocks: [
      p("O Órbita X adotará medidas técnicas e administrativas destinadas a proteger os dados pessoais contra:"),
      bullets(["Acesso não autorizado;", "Perda;", "Alteração indevida;", "Destruição;", "Divulgação indevida;", "Utilização não autorizada."]),
      p("Entre as medidas de segurança poderão existir:"),
      checklist(["Autenticação", "Controle de acesso", "Criptografia, quando aplicável", "Registros de segurança", "Monitoramento", "Proteção contra atividades suspeitas", "Mecanismos de prevenção contra fraude"]),
      info("Nenhum sistema é 100% seguro", "Nenhum sistema conectado à internet pode garantir segurança absoluta."),
    ],
  },
  {
    id: "direitos",
    number: "08",
    title: "Seus direitos",
    icon: ic(Shield),
    color: "border-orbit-pink/40 text-orbit-pink bg-orbit-pink/10",
    blocks: [
      p("Nos termos da legislação aplicável, especialmente da LGPD, o usuário poderá exercer direitos relacionados aos seus dados pessoais, incluindo, conforme aplicável:"),
      checklist([
        "Confirmação da existência de tratamento",
        "Acesso aos dados",
        "Correção de informações",
        "Atualização",
        "Solicitação de eliminação",
        "Anonimização",
        "Bloqueio",
        "Portabilidade",
        "Informação sobre compartilhamentos",
        "Revogação do consentimento",
        "Oposição, quando aplicável",
        "Revisão de determinadas decisões automatizadas",
      ]),
      p("A ANPD reconhece esses direitos aos titulares de dados pessoais."),
      h3("Como solicitar seus direitos"),
      info("Fale conosco", "O usuário poderá entrar em contato com o Órbita X através do canal oficial de privacidade. E-mail: orbitaxonline@gmail.com"),
      p("Para proteger o usuário contra solicitações fraudulentas, poderá ser necessário confirmar sua identidade antes de atender determinadas solicitações."),
    ],
  },
  {
    id: "retencao",
    number: "09",
    title: "Retenção de dados",
    icon: ic(Clock),
    color: "border-orbit-blue/40 text-orbit-blue bg-orbit-blue/10",
    blocks: [
      p("Os dados poderão ser mantidos enquanto forem necessários para:"),
      bullets(["Manter a conta;", "Oferecer os serviços;", "Cumprir obrigações legais;", "Prevenir fraude;", "Garantir segurança;", "Resolver disputas;", "Exercer direitos legalmente reconhecidos."]),
      p("Quando não houver mais necessidade de manutenção, os dados poderão ser eliminados ou anonimizados, observadas as obrigações legais aplicáveis."),
    ],
  },
  {
    id: "exclusao",
    number: "10",
    title: "Exclusão da conta",
    icon: ic(Trash2),
    color: "border-orbit-cyan/40 text-orbit-cyan bg-orbit-cyan/10",
    blocks: [
      p("O usuário poderá solicitar a exclusão de sua conta através dos recursos disponibilizados pelo Órbita X. A exclusão poderá resultar na remoção ou anonimização de informações associadas à conta."),
      p("Entretanto, determinadas informações poderão permanecer armazenadas quando sua conservação for necessária para:"),
      bullets(["Cumprimento de obrigação legal;", "Prevenção de fraude;", "Segurança;", "Exercício regular de direitos;", "Cumprimento de ordem judicial;", "Outras hipóteses previstas em lei."]),
    ],
  },
  {
    id: "transferencias",
    number: "11",
    title: "Transferências internacionais",
    icon: ic(Globe),
    color: "border-orbit-cyan/40 text-orbit-cyan bg-orbit-cyan/10",
    blocks: [
      p(
        "Alguns fornecedores utilizados para operar o Órbita X poderão estar localizados fora do Brasil ou processar informações em outros países. Quando houver transferência internacional de dados pessoais, serão observados os requisitos previstos na legislação brasileira aplicável."
      ),
    ],
  },
  {
    id: "menores",
    number: "12",
    title: "Menores de 18 anos",
    icon: <span className="text-[10px] font-extrabold leading-none">18+</span>,
    color: "border-orbit-purple/40 text-orbit-purple bg-orbit-purple/10",
    blocks: [
      warn(
        "Proibido para menores de idade",
        "O Órbita X é destinado exclusivamente a pessoas com 18 anos ou mais. Pessoas menores de 18 anos não devem criar ou utilizar uma conta na plataforma.",
        "18+"
      ),
      p("Caso seja identificada uma conta pertencente a uma pessoa menor de idade, poderão ser adotadas medidas para restringir ou encerrar a conta."),
    ],
  },
  {
    id: "alteracoes",
    number: "13",
    title: "Alterações da Política",
    icon: ic(FileText),
    color: "border-orbit-pink/40 text-orbit-pink bg-orbit-pink/10",
    blocks: [
      p("Esta Política poderá ser atualizada para refletir:"),
      bullets(["Novas funcionalidades;", "Mudanças na plataforma;", "Alterações legais;", "Mudanças nos serviços;", "Melhorias de segurança;", "Alterações na forma de tratamento dos dados."]),
      p("Quando uma alteração for relevante, o Órbita X poderá informar os usuários através da plataforma ou de outros canais disponíveis."),
    ],
  },
  {
    id: "contato",
    number: "14",
    title: "Contato",
    icon: ic(Mail),
    color: "border-orbit-blue/40 text-orbit-blue bg-orbit-blue/10",
    blocks: [
      p("Órbita X — Seu Universo em Conexão"),
      p("E-mail: orbitaxonline@gmail.com"),
      p("E-mail para privacidade: orbitaxonline@gmail.com"),
      quote("Li e estou ciente da Política de Privacidade do Órbita X."),
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

export default async function PrivacidadePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-nebula" />
      <div className="pointer-events-none absolute inset-0 bg-stars-deep opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <PublicHeader authed={!!user} />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <div className="relative">
          <DocHeroPlanet />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
            <span className="text-orbit-cyan">|</span> Legal
          </p>
          <h1 className="max-w-xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            Política de <span className="orbit-text-gradient">Privacidade</span>
            <br />
            <span className="orbit-text-gradient">Órbita X</span>
          </h1>
          <p className="mt-3 text-sm text-white/80">Seu universo em conexão.</p>
          <p className="mt-1 text-sm text-orbit-purple/70">Última atualização: 23 de setembro de 2026.</p>
          <div className="mt-6 h-0.5 w-full bg-orbit-gradient opacity-60" />
        </div>

        <div className="mt-8 max-w-3xl">
          {INTRO.map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
          <RenderBlock block={LEAD} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[260px_1fr]">
          <TermosToc items={TOC_ITEMS} />

          <div className="min-w-0 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
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

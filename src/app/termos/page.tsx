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
  p("Bem-vindo ao Órbita X."),
  p(
    "Estes Termos de Uso estabelecem as regras para acesso e utilização da plataforma Órbita X, incluindo seu site, aplicações, aplicativos, funcionalidades, comunidades, mensagens, perfis, publicações, serviços digitais e demais recursos disponibilizados pela plataforma."
  ),
  p(
    "Ao criar uma conta, acessar ou utilizar o Órbita X, você declara que leu, compreendeu e concorda com estes Termos de Uso e com a Política de Privacidade aplicável à plataforma."
  ),
  p("Caso não concorde com estes termos, não deverá criar ou utilizar uma conta no Órbita X."),
];

const SECTIONS: Section[] = [
  {
    title: "1. Sobre o Órbita X",
    blocks: [
      p("O Órbita X é uma plataforma de rede social destinada à interação entre usuários, permitindo, conforme as funcionalidades disponibilizadas:"),
      ul([
        "criação de perfis;",
        "publicação de textos, imagens, vídeos, GIFs e outros conteúdos;",
        "comentários e reações;",
        "compartilhamento e repostagem de conteúdos;",
        "criação e participação em comunidades;",
        "comunicação por mensagens;",
        "criação de stories e outros formatos de conteúdo;",
        "criação de páginas ou perfis destinados a projetos, marcas, comunidades ou organizações;",
        "utilização de stickers e outros recursos digitais;",
        "aquisição de determinados recursos ou produtos digitais;",
        "utilização de sistemas de verificação;",
        "personalização do perfil;",
        "descoberta de pessoas, comunidades e conteúdos;",
        "outras funcionalidades que possam ser disponibilizadas futuramente.",
      ]),
      p("O Órbita X poderá alterar, adicionar, suspender ou descontinuar funcionalidades, observadas as obrigações legais aplicáveis."),
    ],
  },
  {
    title: "2. Aceitação dos Termos",
    blocks: [
      p("Ao utilizar o Órbita X, você declara que:"),
      ul([
        "possui capacidade legal para aceitar estes Termos;",
        "fornecerá informações verdadeiras e atualizadas quando solicitadas;",
        "manterá seus dados de acesso protegidos;",
        "não utilizará a plataforma para atividades ilícitas;",
        "respeitará os direitos de outros usuários;",
        "cumprirá estes Termos e as demais políticas do Órbita X.",
      ]),
      p("A utilização continuada da plataforma após alterações nos Termos poderá representar a aceitação das novas condições, quando permitido pela legislação aplicável."),
      p("Alterações relevantes serão comunicadas aos usuários pelos meios disponíveis na plataforma."),
    ],
  },
  {
    title: "3. Requisito de idade",
    blocks: [
      p("O Órbita X poderá exigir idade mínima de 18 anos para criação e utilização de determinadas contas ou da plataforma como um todo."),
      p("O usuário declara que possui a idade mínima exigida no momento do cadastro."),
      p("É proibido criar uma conta utilizando informações falsas para contornar restrições de idade."),
      p("O Órbita X poderá solicitar mecanismos razoáveis de verificação de idade quando necessários para segurança, prevenção de fraude ou cumprimento de obrigações legais."),
    ],
  },
  {
    title: "4. Criação e segurança da conta",
    blocks: [
      p("Cada usuário é responsável pelas informações fornecidas durante o cadastro."),
      p("O usuário deve:"),
      ul([
        "utilizar informações verdadeiras;",
        "manter seus dados atualizados;",
        "proteger sua senha;",
        "não compartilhar suas credenciais;",
        "não permitir que terceiros utilizem sua conta de maneira não autorizada;",
        "informar ao Órbita X qualquer suspeita de acesso indevido.",
      ]),
      p("O usuário é responsável pelas atividades realizadas em sua conta quando decorrentes de negligência na proteção de suas credenciais, sem prejuízo das responsabilidades legais da plataforma."),
      p("O Órbita X poderá implementar mecanismos de segurança, autenticação adicional, verificação de identidade ou outros mecanismos destinados à proteção das contas."),
    ],
  },
  {
    title: "5. Nome de usuário e identidade",
    blocks: [
      p("O nome de usuário, nome exibido, foto, descrição e demais elementos do perfil não poderão ser utilizados para:"),
      ul([
        "impersonar outra pessoa;",
        "fingir ser uma organização, empresa ou autoridade sem autorização;",
        "praticar fraude;",
        "enganar outros usuários;",
        "utilizar identidade pertencente a terceiros com finalidade ilícita;",
        "violar direitos de terceiros.",
      ]),
      p("O Órbita X poderá reservar determinados nomes de usuário relacionados à própria plataforma, marcas, funcionalidades, sistemas oficiais ou situações de segurança."),
    ],
  },
  {
    title: "6. Conteúdo publicado pelo usuário",
    blocks: [
      p("O usuário mantém seus direitos sobre os conteúdos que criar e publicar no Órbita X, respeitados os direitos de terceiros."),
      p("Ao publicar conteúdo, o usuário concede ao Órbita X uma licença limitada, não exclusiva e necessária para hospedar, armazenar, reproduzir tecnicamente, processar, adaptar tecnicamente, distribuir e exibir esse conteúdo dentro da operação normal da plataforma."),
      p("Essa licença existe para permitir o funcionamento dos recursos da rede social, incluindo:"),
      ul([
        "exibição de publicações no feed;",
        "exibição no perfil;",
        "compartilhamento dentro da plataforma;",
        "geração de miniaturas;",
        "processamento técnico de imagens e vídeos;",
        "armazenamento;",
        "backup;",
        "distribuição técnica através de servidores e redes de entrega de conteúdo.",
      ]),
      p("A licença não significa transferência de propriedade intelectual do conteúdo para o Órbita X."),
      p("O usuário poderá excluir conteúdos, observadas situações em que a retenção seja necessária por obrigação legal, segurança, investigação de abusos, prevenção de fraude ou outras hipóteses legalmente permitidas."),
    ],
  },
  {
    title: "7. Responsabilidade pelo conteúdo",
    blocks: [
      p("O usuário é responsável pelo conteúdo que publica."),
      p("O usuário não deverá publicar conteúdo que:"),
      ul([
        "viole a legislação brasileira ou aplicável;",
        "viole direitos autorais;",
        "viole marcas ou outros direitos de propriedade intelectual;",
        "contenha fraude ou tentativa de fraude;",
        "contenha malware ou código malicioso;",
        "divulgue dados pessoais de terceiros sem autorização ou base legal adequada;",
        "contenha ameaças;",
        "promova violência ilícita;",
        "envolva exploração sexual;",
        "envolva exploração ou abuso de menores;",
        "contenha conteúdo íntimo divulgado sem consentimento;",
        "pratique assédio ou perseguição;",
        "pratique discriminação ilícita;",
        "incentive atividades criminosas;",
        "pratique golpes ou engenharia social;",
        "utilize spam de forma abusiva;",
        "tente manipular artificialmente sistemas da plataforma;",
        "utilize contas falsas para enganar ou prejudicar terceiros.",
      ]),
      p("A existência de conteúdo publicado por usuário não significa que o Órbita X concorde com, aprove ou endosse esse conteúdo."),
    ],
  },
  {
    title: "8. Conteúdo proibido",
    blocks: [
      p("O Órbita X poderá remover, restringir, ocultar ou limitar conteúdos que violem estes Termos ou a legislação aplicável. Entre os conteúdos e comportamentos proibidos estão:"),
      h3("8.1 Fraudes e golpes"),
      p("É proibido utilizar a plataforma para:"),
      ul([
        "aplicar golpes;",
        "obter dinheiro mediante fraude;",
        "realizar phishing;",
        "roubar credenciais;",
        "criar falsas oportunidades comerciais;",
        "enganar usuários sobre produtos ou serviços.",
      ]),
      h3("8.2 Violência e ameaças"),
      p("Não são permitidas ameaças reais de violência ou utilização da plataforma para organização de atividades criminosas."),
      h3("8.3 Exploração sexual"),
      p("É proibido utilizar o Órbita X para exploração sexual, tráfico sexual ou qualquer forma de exploração de crianças e adolescentes."),
      h3("8.4 Conteúdo íntimo sem consentimento"),
      p("É proibida a publicação ou distribuição de imagens ou vídeos íntimos de terceiros sem autorização. O Órbita X poderá adotar mecanismos de identificação, bloqueio e remoção destinados a impedir a circulação desse material."),
      h3("8.5 Assédio"),
      p("É proibido utilizar a plataforma para perseguição, intimidação ou assédio direcionado contra outra pessoa."),
      h3("8.6 Discriminação"),
      p("Conteúdos que promovam violência ou discriminação ilícita contra pessoas ou grupos poderão ser removidos ou restringidos."),
      h3("8.7 Spam"),
      p("Não é permitido utilizar sistemas automatizados ou contas para enviar grandes volumes de mensagens, comentários, convites ou publicações não solicitadas com finalidade abusiva."),
    ],
  },
  {
    title: "9. Direitos autorais e propriedade intelectual",
    blocks: [
      p("O usuário não deverá publicar conteúdo que viole direitos autorais, marcas, imagens, músicas, vídeos ou outros direitos pertencentes a terceiros."),
      p("O Órbita X poderá receber denúncias relacionadas a direitos autorais e adotar medidas apropriadas conforme a legislação aplicável."),
      p("Quando permitido, o usuário poderá contestar medidas tomadas contra seu conteúdo."),
      p("O Órbita X também poderá proteger seus próprios direitos relacionados à marca, nome, logotipo, interface, código, design, software, bancos de dados e demais elementos proprietários."),
      p("Nenhuma disposição destes Termos concede ao usuário direito de copiar, modificar, distribuir ou explorar comercialmente a propriedade intelectual do Órbita X sem autorização."),
    ],
  },
  {
    title: "10. Comunidades",
    blocks: [
      p("O Órbita X poderá permitir que usuários criem e administrem comunidades."),
      p("Administradores e moderadores de comunidades são responsáveis por utilizar as ferramentas administrativas de maneira compatível com estes Termos e com a legislação aplicável."),
      p("Comunidades poderão estabelecer regras próprias, desde que essas regras não contrariem estes Termos ou a legislação."),
      p("O Órbita X poderá intervir em comunidades quando houver:"),
      ul([
        "violação destes Termos;",
        "atividade ilegal;",
        "fraude;",
        "risco à segurança;",
        "abuso de ferramentas;",
        "descumprimento de obrigações legais;",
        "utilização da comunidade para prejudicar outros usuários.",
      ]),
    ],
  },
  {
    title: "11. Perfis oficiais e verificação",
    blocks: [
      p("O Órbita X poderá oferecer mecanismos de verificação ou identificação de perfis."),
      p("A verificação não constitui declaração de que o usuário é superior, mais confiável ou mais importante que outros usuários."),
      p("O selo ou mecanismo de verificação indica apenas que determinados critérios definidos pelo Órbita X foram atendidos. Os critérios poderão incluir, conforme o tipo de conta:"),
      ul([
        "autenticidade;",
        "identificação;",
        "relevância;",
        "presença pública;",
        "representação de organização;",
        "pagamento de plano ou recurso de verificação;",
        "outros requisitos definidos pela plataforma.",
      ]),
      p("O Órbita X poderá revogar uma verificação quando os requisitos deixarem de ser atendidos ou houver violação destes Termos."),
    ],
  },
  {
    title: "12. Recursos pagos",
    blocks: [
      p("O Órbita X poderá oferecer recursos pagos, incluindo, conforme disponibilidade:"),
      ul([
        "verificação;",
        "stickers premium;",
        "presentes virtuais;",
        "recursos de personalização;",
        "recursos para comunidades;",
        "recursos para perfis;",
        "publicidade;",
        "ferramentas comerciais;",
        "outros produtos ou funcionalidades digitais.",
      ]),
      p("Os preços, condições e características serão apresentados antes da contratação."),
      p("O pagamento poderá ser processado por empresas ou instituições financeiras parceiras."),
      p("As condições de cancelamento, reembolso e cobrança estarão sujeitas à legislação aplicável e às condições apresentadas no momento da contratação."),
    ],
  },
  {
    title: "13. Moedas, créditos e itens virtuais",
    blocks: [
      p("O Órbita X poderá disponibilizar moedas, créditos, pontos, stickers, presentes ou outros itens digitais. Esses itens:"),
      ul([
        "não constituem moeda oficial;",
        "não representam depósito bancário;",
        "não representam investimento;",
        "não possuem valor monetário fora do sistema do Órbita X, salvo quando expressamente previsto;",
        "não poderão ser vendidos ou transferidos fora das funcionalidades autorizadas pela plataforma.",
      ]),
      p("O Órbita X poderá estabelecer limites, preços e regras específicas para esses recursos."),
      p("Transações poderão ser registradas em sistemas de auditoria e segurança para prevenção de fraude."),
    ],
  },
  {
    title: "14. Publicidade",
    blocks: [
      p("O Órbita X poderá exibir publicidade ou conteúdo patrocinado."),
      p("Anúncios poderão ser personalizados de acordo com informações e permissões previstas na Política de Privacidade e na legislação aplicável."),
      p("O usuário poderá encontrar conteúdos identificados como publicidade, patrocinados ou comerciais."),
      p("O Órbita X não necessariamente participa da relação comercial entre o usuário e um anunciante."),
    ],
  },
  {
    title: "15. Mensagens e comunicações",
    blocks: [
      p("O Órbita X poderá disponibilizar mensagens privadas e outros recursos de comunicação."),
      p("É proibido utilizar esses recursos para:"),
      ul(["spam;", "golpes;", "ameaças;", "assédio;", "exploração sexual;", "divulgação não autorizada de conteúdo íntimo;", "malware;", "phishing;", "outras atividades ilícitas."]),
      p("O tratamento de dados e informações relacionadas às comunicações será realizado conforme a Política de Privacidade e a legislação aplicável."),
    ],
  },
  {
    title: "16. Denúncias",
    blocks: [
      p("O Órbita X disponibilizará mecanismos para denúncia de conteúdos, contas ou comportamentos."),
      p("Uma denúncia não significa automaticamente que o conteúdo será removido. As denúncias poderão ser analisadas considerando:"),
      ul(["estes Termos;", "políticas da plataforma;", "contexto;", "legislação aplicável;", "natureza do conteúdo;", "evidências disponíveis;", "risco à segurança dos usuários."]),
      p("Quando aplicável, o usuário afetado poderá receber informações sobre a decisão e os mecanismos disponíveis para contestação."),
    ],
  },
  {
    title: "17. Moderação",
    blocks: [
      p("O Órbita X poderá utilizar sistemas automatizados, ferramentas de detecção e análise humana para identificar possíveis violações. As medidas poderão incluir:"),
      ul([
        "remoção de conteúdo;",
        "restrição de alcance;",
        "ocultação temporária;",
        "bloqueio de determinadas funcionalidades;",
        "suspensão temporária;",
        "suspensão permanente;",
        "encerramento de conta;",
        "restrição de comunidades;",
        "outras medidas proporcionais ao caso.",
      ]),
      p("As decisões de moderação deverão observar as regras aplicáveis e os procedimentos disponibilizados pelo Órbita X."),
    ],
  },
  {
    title: "18. Contestação de decisões",
    blocks: [
      p("Quando uma publicação ou conta for submetida a uma medida de moderação que permita contestação, o usuário poderá utilizar o mecanismo disponibilizado pelo Órbita X."),
      p("A contestação deverá apresentar informações suficientes para permitir a análise do caso."),
      p("O Órbita X poderá manter uma decisão quando concluir que a medida é compatível com seus Termos, políticas ou legislação aplicável."),
      p("Quando uma decisão for revertida, o conteúdo ou funcionalidade poderá ser restaurado quando tecnicamente possível."),
    ],
  },
  {
    title: "19. Segurança da plataforma",
    blocks: [
      p("É proibido:"),
      ul([
        "tentar invadir contas;",
        "explorar vulnerabilidades sem autorização;",
        "realizar ataques contra servidores;",
        "utilizar bots maliciosos;",
        "distribuir malware;",
        "tentar contornar sistemas de segurança;",
        "acessar dados que não estejam autorizados ao usuário;",
        "realizar scraping abusivo;",
        "interferir no funcionamento da plataforma;",
        "realizar ataques automatizados.",
      ]),
      p("Pesquisadores de segurança poderão seguir eventuais programas e regras específicos disponibilizados pelo Órbita X."),
    ],
  },
  {
    title: "20. Uso de sistemas automatizados",
    blocks: [
      p("O uso de bots, automações, APIs ou ferramentas automatizadas somente será permitido quando autorizado pelo Órbita X."),
      p("Não é permitido utilizar automação para:"),
      ul([
        "criar milhares de contas;",
        "manipular curtidas;",
        "manipular seguidores;",
        "manipular visualizações;",
        "espalhar spam;",
        "manipular artificialmente tendências;",
        "abusar de APIs;",
        "contornar limites da plataforma.",
      ]),
    ],
  },
  {
    title: "21. Privacidade e dados pessoais",
    blocks: [
      p("O tratamento de dados pessoais realizado pelo Órbita X será explicado em sua Política de Privacidade."),
      p("A plataforma poderá tratar dados necessários para:"),
      ul([
        "criação e manutenção de contas;",
        "autenticação;",
        "segurança;",
        "funcionamento da rede social;",
        "comunicação;",
        "personalização;",
        "prevenção de fraude;",
        "cumprimento de obrigações legais;",
        "processamento de pagamentos;",
        "melhoria dos serviços;",
        "outras finalidades informadas aos usuários.",
      ]),
      p("Os direitos dos titulares serão observados conforme a legislação aplicável."),
      p("A LGPD estabelece regras para operações como coleta, armazenamento, utilização, transmissão e eliminação de dados pessoais."),
    ],
  },
  {
    title: "22. Retenção de dados",
    blocks: [
      p("Determinados dados poderão permanecer armazenados mesmo após exclusão de uma conta quando houver fundamento legal para sua retenção. Isso poderá ocorrer, por exemplo, para:"),
      ul(["cumprimento de obrigação legal;", "exercício regular de direitos;", "prevenção de fraude;", "segurança;", "investigação de incidentes;", "cumprimento de determinações de autoridades competentes."]),
      p("Os períodos e fundamentos aplicáveis serão detalhados na Política de Privacidade."),
    ],
  },
  {
    title: "23. Disponibilidade do serviço",
    blocks: [
      p("O Órbita X busca manter a plataforma disponível, mas não garante disponibilidade ininterrupta. O serviço poderá ficar temporariamente indisponível devido a:"),
      ul([
        "manutenção;",
        "atualizações;",
        "falhas técnicas;",
        "problemas de infraestrutura;",
        "ataques cibernéticos;",
        "problemas de fornecedores;",
        "eventos fora do controle razoável da plataforma;",
        "determinações legais ou administrativas.",
      ]),
      p("Quando possível, o Órbita X poderá comunicar interrupções relevantes."),
    ],
  },
  {
    title: "24. Limitações de responsabilidade",
    blocks: [
      p("O Órbita X não controla previamente todo conteúdo publicado pelos usuários."),
      p("A plataforma não garante que:"),
      ul([
        "todas as informações publicadas por usuários sejam verdadeiras;",
        "todos os usuários sejam quem afirmam ser;",
        "todos os conteúdos permaneçam disponíveis;",
        "todos os serviços externos funcionem continuamente;",
        "interações entre usuários sejam livres de riscos.",
      ]),
      p("Os usuários devem exercer cautela ao interagir com terceiros."),
      p("Nenhuma disposição destes Termos busca excluir responsabilidades que não possam ser afastadas pela legislação aplicável."),
    ],
  },
  {
    title: "25. Serviços de terceiros",
    blocks: [
      p("O Órbita X poderá utilizar serviços de terceiros, incluindo:"),
      ul([
        "provedores de hospedagem;",
        "serviços de armazenamento;",
        "processadores de pagamento;",
        "serviços de autenticação;",
        "serviços de envio de mensagens;",
        "ferramentas de segurança;",
        "serviços de análise;",
        "outros fornecedores necessários ao funcionamento da plataforma.",
      ]),
      p("Esses serviços poderão possuir termos e políticas próprias."),
    ],
  },
  {
    title: "26. Links externos",
    blocks: [
      p("A plataforma poderá disponibilizar links para sites ou serviços externos."),
      p("O Órbita X não controla necessariamente esses serviços e não é responsável por suas políticas, conteúdos ou práticas."),
      p("O usuário deve consultar os termos e políticas dos respectivos terceiros."),
    ],
  },
  {
    title: "27. Encerramento da conta pelo usuário",
    blocks: [
      p("O usuário poderá solicitar o encerramento de sua conta através das ferramentas disponibilizadas pelo Órbita X."),
      p("A exclusão poderá estar sujeita aos procedimentos de segurança necessários para confirmar a identidade do solicitante."),
      p("Determinadas informações poderão ser mantidas quando houver fundamento legal para isso."),
    ],
  },
  {
    title: "28. Suspensão ou encerramento pelo Órbita X",
    blocks: [
      p("O Órbita X poderá suspender ou encerrar contas quando houver fundamento previsto nestes Termos, nas políticas da plataforma ou na legislação aplicável."),
      p("Dependendo da gravidade e urgência do caso, determinadas medidas poderão ser adotadas imediatamente para proteger usuários, sistemas ou cumprir obrigações legais."),
      p("Sempre que aplicável, serão disponibilizados mecanismos de informação e contestação."),
    ],
  },
  {
    title: "29. Alterações na plataforma",
    blocks: [
      p("O Órbita X poderá desenvolver novas funcionalidades, modificar funcionalidades existentes ou descontinuar determinados recursos."),
      p("Quando uma alteração tiver impacto relevante sobre os usuários, poderão ser fornecidas informações adicionais."),
    ],
  },
  {
    title: "30. Alterações destes Termos",
    blocks: [
      p("Estes Termos poderão ser atualizados periodicamente."),
      p("A versão vigente será disponibilizada na plataforma."),
      p("Alterações relevantes poderão ser comunicadas por meios adequados, incluindo notificações dentro do Órbita X."),
      p("A data de atualização será indicada no início do documento."),
    ],
  },
  {
    title: "31. Legislação aplicável",
    blocks: [
      p("Estes Termos serão interpretados de acordo com a legislação brasileira, observadas as normas obrigatórias aplicáveis ao usuário. Entre as normas relevantes estão, conforme aplicabilidade:"),
      ul([
        "Marco Civil da Internet;",
        "Lei Geral de Proteção de Dados Pessoais — LGPD;",
        "legislação de defesa do consumidor;",
        "legislação de propriedade intelectual;",
        "legislação civil e penal;",
        "demais normas aplicáveis às atividades digitais.",
      ]),
      p("O Marco Civil da Internet e as políticas próprias de cada provedor são referências relevantes para a administração de contas e perfis em redes sociais."),
    ],
  },
  {
    title: "32. Direitos do consumidor",
    blocks: [
      p("Quando houver relação de consumo, serão respeitados os direitos previstos na legislação brasileira de proteção ao consumidor."),
      p("Nenhuma disposição destes Termos deverá ser interpretada como renúncia a direitos que sejam legalmente irrenunciáveis."),
    ],
  },
  {
    title: "33. Comunicações oficiais",
    blocks: [
      p("O Órbita X poderá entrar em contato com o usuário através de:"),
      ul(["notificações da plataforma;", "e-mail cadastrado;", "mensagens dentro do serviço;", "outros canais oficiais."]),
      p("O usuário deve manter seus dados de contato atualizados."),
    ],
  },
  {
    title: "34. Atendimento e denúncias",
    blocks: [
      p("O Órbita X deverá disponibilizar canais adequados para:"),
      ul([
        "suporte;",
        "denúncias;",
        "questões de segurança;",
        "solicitações relacionadas à conta;",
        "questões relacionadas à privacidade;",
        "contestação de medidas de moderação;",
        "outras solicitações relacionadas ao serviço.",
      ]),
      p("Os canais oficiais serão divulgados dentro da plataforma."),
    ],
  },
  {
    title: "35. Disposições finais",
    blocks: [
      p("Caso alguma disposição destes Termos seja considerada inválida ou inaplicável, as demais disposições permanecerão válidas na extensão permitida pela legislação."),
      p("A eventual ausência de aplicação imediata de determinada regra pelo Órbita X não significa renúncia ao direito de aplicá-la posteriormente."),
      p("Estes Termos constituem parte das regras que regulam a utilização do Órbita X."),
    ],
  },
  {
    title: "36. Documentos relacionados",
    blocks: [
      p("A utilização do Órbita X também poderá estar sujeita a documentos e políticas específicas, incluindo:"),
      ul([
        "Política de Privacidade;",
        "Política de Cookies, quando aplicável;",
        "Diretrizes da Comunidade;",
        "Política de Direitos Autorais;",
        "Política de Verificação;",
        "Política de Conteúdo;",
        "Política de Compras e Reembolsos;",
        "Política de Comunidades;",
        "outras políticas específicas disponibilizadas pela plataforma.",
      ]),
      p("Em caso de conflito entre documentos, será observada a legislação aplicável e a regra específica correspondente ao serviço ou situação."),
    ],
  },
  {
    title: "37. Aceite",
    blocks: [
      p("Ao selecionar a opção “Criar conta”, “Aceitar” ou equivalente, o usuário declara que:"),
      quote("Li e concordo com os Termos de Uso e a Política de Privacidade do Órbita X."),
      p("O aceite eletrônico poderá ser registrado para fins de comprovação da concordância do usuário com a versão vigente dos documentos."),
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

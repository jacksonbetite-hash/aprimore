import Link from 'next/link';
import { alunoAtual } from '../lib/sessao.ts';
import { portalAtual } from '../lib/portal-consultas.ts';
import { corSegura, formatarCnpj } from '../lib/portal.ts';
import { portalFechadoParaVisitante } from './guarda-empresa.ts';
import { sair } from './acoes-auth.ts';
import { daEquipe } from '../lib/permissoes.ts';

import MenuFerramentas from './MenuFerramentas.tsx';
import { ferramentasEscolhidas } from '../lib/ferramentas.ts';

export { Icone, Marca } from './ui.tsx';
import { Icone, Marca } from './ui.tsx';

export async function Cabecalho({ ativo }: { ativo?: string }) {
  const [aluno, portal] = await Promise.all([alunoAtual(), portalAtual()]);
  const noPortal = portal.id !== 0;
  const item = (href: string, chave: string, texto: string) => (
    <Link href={href} className={ativo === chave ? 'ativo' : undefined}>{texto}</Link>
  );
  // §5.10 — o submenu "Ferramentas" é do PORTAL, não da casa. No site
  // principal ele não existe mais (as ferramentas continuam no rodapé e
  // no endereço direto); dentro do portal de um professor, ele mostra
  // exatamente o que ele marcou em "Minha página" — nem tudo o que a
  // plataforma tem, nem nada por padrão.
  const ferramentas = noPortal ? ferramentasEscolhidas(portal.personalizacao.ferramentas) : [];

  // §5.11 — no portal de uma empresa o menu encolhe ao que existe ali.
  // "Planos" levaria o colaborador a uma página que redireciona (ele não
  // contrata nada: quem libera acesso é o RH), e menu com item que não
  // leva a lugar nenhum é pior que menu curto.
  const empresa = portal.tipo === 'EMPRESA';

  return (
    <header className="topo">
      <div className="container topo-nav">
        {/* No portal de um professor, a marca em cima é a DELE e a linha
            miúda diz quem opera — a mesma informação do rodapé legal
            (§5.10), agora onde a pessoa olha primeiro. No portal de uma
            empresa não: ali o portal é interno, e o nome do fornecedor
            no alto da tela do colaborador não acrescenta nada a ele. */}
        <Marca nome={noPortal ? portal.nomeExibicao : undefined}
               assinatura={noPortal && !empresa ? 'por Aprimore o Saber' : null} />
        {/* Navegação ao centro: a marca ancora a esquerda, a ação de entrar
            ancora a direita, e o miolo fica com os destinos. */}
        {/* A Biblioteca não está na barra: é ferramenta de consulta, e
            no site principal a porta dela é o rodapé (o submenu de
            ferramentas passou a ser dos portais). O Blog ocupa o primeiro
            nível porque é conteúdo de leitura, a porta de entrada de quem
            ainda não é aluno. */}
        <nav className="topo-links">
          {item('/catalogo', 'catalogo', empresa ? 'Trilhas' : 'Cursos')}
          {!noPortal && item('/blog', 'blog', 'Blog')}
          {!empresa && item('/planos', 'planos', 'Planos')}
          {/* Só no site principal: dentro do portal de um professor, o
              anúncio "monte o seu" seria concorrência na casa dele. */}
          {!noPortal && item('/para-professores', 'para-professores', 'Para professores')}
          {item('/painel', 'painel', empresa ? 'Meu progresso' : 'Meu painel')}
          {!empresa && ferramentas.length > 0 && <MenuFerramentas itens={ferramentas} ativo={ativo} />}
        </nav>
        <div className="topo-acoes">
          {aluno ? (
            <>
              {daEquipe(aluno.papel) && (
                <Link className="btn btn-contorno btn-sm" href="/admin">Admin</Link>
              )}
              {aluno.papel === 'professor' && !noPortal && (
                <Link className="btn btn-contorno btn-sm" href="/professor">Meu portal</Link>
              )}
              <form action={sair}>
                <button className="link-entrar" type="submit">Sair</button>
              </form>
            </>
          ) : (
            <Link className="btn btn-primario btn-sm" href="/entrar">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export async function Rodape() {
  // O convite ao professor só existe no site principal: no portal de um
  // professor, o rodapé anunciar "monte o seu" seria concorrência dentro
  // da casa dele (§5.10.2, etapa 3).
  const portal = await portalAtual();
  const plataforma = portal.id === 0;

  if (!plataforma) {
    // §5.10, rodapé legal do portal: quem responde pelo conteúdo é o
    // professor (identificado), e quem opera cobrança e entrega é a
    // plataforma. Os dois nomes, com todas as letras.
    return (
      <footer className="rodape">
        <div className="container">
          <div className="rodape-grade">
            <div>
              <Marca nome={portal.nomeExibicao}
                     assinatura={portal.tipo === 'EMPRESA' ? null : 'por Aprimore o Saber'} />
              <p className="caption suave" style={{ marginTop: 12, maxWidth: '22rem', lineHeight: 1.7 }}>
                {portal.personalizacao.contato && <>Contato: {portal.personalizacao.contato}<br /></>}
                Responsável pelo conteúdo: {portal.responsavelNome ?? portal.nomeExibicao}
                {portal.responsavelDoc && <> · CNPJ {formatarCnpj(portal.responsavelDoc)}</>}
              </p>
            </div>
            {/* §5.11 — na empresa não há o que comprar nem o que
                cancelar: o colaborador não é cliente, e o rodapé não deve
                oferecer a ele páginas que só existem para quem compra. */}
            {portal.tipo === 'EMPRESA' ? (
              <>
                <div>
                  <h4>Neste portal</h4>
                  <Link href="/catalogo">Trilhas</Link>
                  <Link href="/painel">Meu progresso</Link>
                </div>
                <div>
                  <h4>Precisa de ajuda?</h4>
                  <span className="caption suave">
                    Quem libera o seu acesso é o setor responsável pelo treinamento
                    {portal.personalizacao.contato && <> — {portal.personalizacao.contato}</>}.
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h4>Neste portal</h4>
                  <Link href="/catalogo">Cursos</Link>
                  <Link href="/planos">Planos</Link>
                  <Link href="/vademecum">Biblioteca</Link>
                  <Link href="/painel">Área do aluno</Link>
                </div>
                <div>
                  <h4>Suporte</h4>
                  <Link href="/planos#legal">Pagamento e cancelamento</Link>
                  <Link href="/planos#legal">Reembolso</Link>
                  <Link href="/planos#legal">Privacidade</Link>
                </div>
              </>
            )}
          </div>
          <div className="rodape-legal">
            {portal.tipo === 'EMPRESA' ? (
              <>
                <strong>Treinamento corporativo</strong>, de responsabilidade da empresa
                identificada acima, que é a <strong>controladora</strong> dos dados dos
                participantes (LGPD, art. 5º). Portal hospedado e operado pela plataforma
                Aprimore o Saber, na condição de <strong>operadora</strong>.<br />
                Os certificados emitidos são de curso livre, para registro interno: a
                plataforma não é instituição credenciada pelo MEC.
              </>
            ) : (
              <>
                <strong>Curso livre</strong>, de responsabilidade do professor identificado acima.
                Portal hospedado e operado pela plataforma Aprimore o Saber, que responde por
                cobrança, entrega e suporte técnico. Não é instituição credenciada pelo MEC.<br />
                Direito de arrependimento em 7 dias (CDC, art. 49) · Cancelamento em 2 cliques no painel.
              </>
            )}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="rodape">
      <div className="container">
        <div className="rodape-grade">
          <div>
            <Marca />
            <p className="caption suave" style={{ marginTop: 12, maxWidth: '22rem', lineHeight: 1.7 }}>
              © 2026 Aprimore o Saber. Conhecimento aplicado, no seu ritmo, sem decoreba.
            </p>
          </div>
          <div>
            <h4>Plataforma</h4>
            <Link href="/catalogo">Cursos</Link>
            <Link href="/planos">Planos</Link>
            <Link href="/vademecum">Biblioteca</Link>
            <Link href="/calculadora-penal">Calculadora Penal</Link>
            <Link href="/painel">Área do aluno</Link>
          </div>
          <div>
            <h4>Empresa</h4>
            <Link href="/planos#legal">Sobre nós</Link>
            {plataforma && <Link href="/para-professores">Para professores</Link>}
            {plataforma && <Link href="/empresas">Empresas &amp; RH</Link>}
            <Link href="/blog">Blog</Link>
            <Link href="/vagas">Mural de vagas</Link>
          </div>
          <div>
            <h4>Suporte</h4>
            <Link href="/planos#legal">Ajuda</Link>
            <Link href="/planos#legal">Contato</Link>
            <Link href="/planos#legal">Termos</Link>
            <Link href="/planos#legal">Privacidade</Link>
          </div>
        </div>
        <div className="rodape-legal">
          <strong>Curso livre.</strong> O Aprimore o Saber não é instituição de ensino
          credenciada pelo MEC e não emite certificado de curso reconhecido. Também não presta
          consultoria profissional nem responde a caso concreto.<br />
          Direito de arrependimento em 7 dias (CDC, art. 49) · Cancelamento em 2 cliques no painel.
        </div>
      </div>
    </footer>
  );
}

/**
 * §5.10 — inadimplência do professor: o portal SUSPENSO sai do ar para o
 * visitante, mas o aluno com licença vigente continua assistindo. As
 * páginas públicas perguntam aqui se devem esconder o conteúdo; quem tem
 * algo liberado (login, licença) passa reto.
 */
export async function portalSuspenso(): Promise<boolean> {
  return (await portalAtual()).status === 'SUSPENSO';
}

export async function PortalSuspenso() {
  const portal = await portalAtual();
  return (
    <Pagina>
      <section className="secao caixa-auth">
        <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
          <h1>{portal.nomeExibicao} está temporariamente indisponível</h1>
          <p className="sub">
            O portal está fora do ar por pendência administrativa do responsável. Se você já
            tem uma licença ativa, entre na sua conta: o seu acesso continua valendo até o
            fim do período contratado.
          </p>
          <Link className="btn btn-primario" href="/entrar">Entrar na minha conta</Link>
        </div>
      </section>
    </Pagina>
  );
}

/**
 * §5.11 — o portão do portal de uma empresa. É a página inteira que o
 * visitante sem sessão vê ali: a marca e o login, nada mais. Sem
 * catálogo, sem amostra, sem preço, sem "criar conta" — quem entra é
 * quem o RH cadastrou ou convidou.
 */
export async function PortalDeEmpresaFechado() {
  const portal = await portalAtual();
  const cor = corSegura(portal.personalizacao.corPrimaria);
  return (
    <>
      {cor && (
        <style>{`:root{--primary:${cor};--primary-texto:${cor};--primary-container:${cor};--on-primary-fixed-variant:${cor}}`}</style>
      )}
      <main>
        <section className="secao caixa-auth">
          <div className="cartao cartao-auth" style={{ width: 'min(520px, 92vw)' }}>
            {portal.personalizacao.foto && (
              <img src={portal.personalizacao.foto} alt="" width={72} height={72}
                   style={{ borderRadius: 16, objectFit: 'cover', marginBottom: 16 }} />
            )}
            <h1>{portal.nomeExibicao}</h1>
            <p className="sub">
              {portal.personalizacao.chamada
                || 'Portal de treinamento da equipe. O acesso é restrito aos colaboradores.'}
            </p>
            <Link className="btn btn-primario btn-lg" href="/entrar">Entrar</Link>
            <p className="caption suave" style={{ marginTop: 18 }}>
              Ainda não tem acesso? Fale com o setor responsável pelo treinamento na sua
              empresa — é quem libera as trilhas e envia o convite.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

export async function Pagina(
  { children, ativo, aberta }: { children: React.ReactNode; ativo?: string; aberta?: boolean },
) {
  // §5.11 — segunda linha de defesa. A guarda de verdade é a chamada a
  // `exigirPortalAberto` no topo de cada rota pública; esta aqui existe
  // para o dia em que alguém criar uma rota nova e esquecer de chamá-la:
  // o conteúdo não chega à tela de qualquer jeito. `aberta` é a exceção
  // das poucas páginas que TÊM de responder sem sessão — entrar, aceitar
  // convite, conferir certificado —, sem as quais o portão não teria
  // maçaneta.
  if (!aberta && await portalFechadoParaVisitante()) return <PortalDeEmpresaFechado />;

  // §5.10 — a cor principal do portal entra como variável de tema. Só uma
  // cor validada (#rgb/#rrggbb) chega ao CSS: cor é dado, não código.
  const portal = await portalAtual();
  const cor = corSegura(portal.personalizacao.corPrimaria);
  return (
    <>
      {cor && (
        <style>{`:root{--primary:${cor};--primary-texto:${cor};--primary-container:${cor};--on-primary-fixed-variant:${cor}}`}</style>
      )}
      <Cabecalho ativo={ativo} />
      <main>{children}</main>
      <Rodape />
    </>
  );
}

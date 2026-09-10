import Link from 'next/link';
import type { Metadata } from 'next';
import { Pagina, Icone, portalSuspenso, PortalSuspenso } from '../componentes.tsx';
import SeletorPeriodo from './SeletorPeriodo.tsx';
import AbasPublico from './AbasPublico.tsx';
import { economia, brl } from '../../lib/precos.ts';
import { tabelaVigente } from '../../lib/precos-consultas.ts';
import { listarMateriasEmCache } from '../../lib/catalogo.ts';
import { alunoAtual, licencasDo } from '../../lib/sessao.ts';
import { temCpf } from '../../lib/checkout.ts';
import { acaoComprar, acaoAtivarTrial } from '../acoes-comerciais.ts';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { planoDeLancamento } from '../../lib/portal-assinatura.ts';
import { PLANOS_EMPRESA } from '../../lib/empresas.ts';
import { recusarNoPortalDeEmpresa } from '../guarda-empresa.ts';

export const metadata: Metadata = {
  title: 'Planos e licenças',
  description: 'Licença por curso ou passe completo, teste de 7 dias sem cartão, Pix ou cartão e cancelamento em 2 cliques. '
    + 'Portal do Professor e planos corporativos para empresas e RH.',
};

export const dynamic = 'force-dynamic';

/**
 * O que o banner do professor destaca é o que o portal entrega hoje —
 * a mesma regra da home: nada de DRM ou boleto, que não existem (ver
 * lib/video.ts e lib/pagamento.ts).
 */
const DESTAQUES_PROFESSOR = [
  'Endereço de vídeo assinado, com prazo, e marca d’água com o nome do aluno',
  'Seu próprio subdomínio — domínio próprio como upgrade',
  'Pix e cartão com split: a sua parte cai direto na sua conta',
  'Alunos 100% seus: cadastro, progresso e faturamento à parte',
];

const RECURSOS_EMPRESA = [
  { icone: 'shield_person', titulo: 'Portal fechado',
    texto: 'Só entra quem tem o e-mail da empresa. Nada do conteúdo interno fica público.' },
  { icone: 'insights', titulo: 'Progresso em tempo real',
    texto: 'O RH acompanha aulas concluídas, notas e engajamento, por pessoa e por equipe.' },
  { icone: 'library_books', titulo: 'Trilhas por departamento',
    texto: 'Integração, compliance, vendas, atendimento: cada área com o seu roteiro.' },
  { icone: 'workspace_premium', titulo: 'Certificado de conclusão',
    texto: 'Ao fim de cada trilha, com a chancela da empresa, para o registro interno de treinamento.' },
];

export default async function Planos() {
  /* §5.11 — página de preço não existe na empresa: o colaborador não
     contrata nada, e mostrar oferta a ele seria vender pelas costas do
     RH. A recusa continua; o que muda é o destino. Mandar para a home
     era mudo — quem clicava em "Planos" no menu caía na página inicial
     sem entender por quê. Agora vai para "Meu acesso", que responde a
     pergunta que ele de fato tinha: até quando eu tenho acesso a quê. */
  await recusarNoPortalDeEmpresa('/painel/planos');
  const portalId = await portalIdAtual();
  const plataforma = portalId === 0;
  const [tabela, materias, aluno, planoPortal] = await Promise.all([
    tabelaVigente(portalId), listarMateriasEmCache(portalId), alunoAtual(),
    plataforma ? planoDeLancamento() : Promise.resolve(null),
  ]);
  // §5.10 — portal suspenso não vende para visitante; aluno logado vê
  // seus planos (e a compra é barrada em abrirPedido de todo jeito).
  if (!aluno && await portalSuspenso()) return <PortalSuspenso />;
  const publicadas = materias
    .filter((m) => m.status === 'publicado' && m.aulasPublicadas > 0)
    .map((m) => ({ id: m.id, nome: m.nome }));
  const licencas = aluno ? await licencasDo(aluno.id) : [];
  const precisaCpf = aluno ? !(await temCpf(aluno.id)) : false;
  const temTrial = licencas.some((l) => l.origem === 'TRIAL');
  return (
    <Pagina ativo="planos">
      <section className="cabeca-materia">
        <div className="container">
          <div className="trilha-topo"><Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} /><span>Planos</span></div>
          <div className="cabeca-planos">
            <div>
              <h1>Planos <em className="cor-marca">sob medida</em></h1>
              <p className="sub">
                A licença é por curso. Se for estudar vários, o passe completo sai mais em conta.
                Tudo o que está escrito aqui é o que vale na hora da compra (CDC, art. 30).
              </p>
            </div>
            {/* Professor e empresa só se vendem no site principal (§5.10):
                no portal de um professor, a página é só a de aluno e as
                abas não fazem sentido. */}
            {plataforma && <AbasPublico />}
          </div>
        </div>
      </section>

      <section className="secao" id="alunos" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          <SeletorPeriodo
            tabela={tabela}
            economiaAnual={economia(tabela, 'CATALOGO', 'anual')}
            materias={publicadas}
            logado={Boolean(aluno)}
            precisaCpf={precisaCpf}
            temTrial={temTrial}
            acaoComprar={acaoComprar}
            acaoTrial={acaoAtivarTrial}
          />
          <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--on-surface-variant)', marginTop: '1.4rem' }}>
            Preços de referência — hipótese a validar antes do lançamento.
          </p>
        </div>
      </section>

      {plataforma && (
        <section className="secao" id="professores" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="chamada chamada-lado">
              <span className="bolha bolha-a" aria-hidden="true" />
              <span className="bolha bolha-b" aria-hidden="true" />
              <div className="chamada-texto">
                <span className="chip chip-vidro chip-sm">
                  <Icone nome="auto_awesome" tamanho={16} /> Para educadores e criadores
                </span>
                <h2>Para professores: o seu portal</h2>
                <p>
                  Seu site de aulas com endereço próprio, checkout e alunos seus —
                  {' '}{planoPortal ? <>por <strong>{brl(planoPortal.licencaMensalCentavos)}/mês + {Number(planoPortal.percentualBase)}% sobre as vendas</strong></> : 'contratação em minutos'}.
                  Exige CNPJ; o portal vai ao ar no dia da contratação.
                </p>
                <ul className="chamada-destaques">
                  {DESTAQUES_PROFESSOR.map((d) => (
                    <li key={d}><Icone nome="check_circle" tamanho={18} /> <span>{d}</span></li>
                  ))}
                </ul>
              </div>
              <div className="chamada-acao">
                <Link className="btn btn-primario btn-lg" href="/para-professores">Conhecer e contratar</Link>
                <span className="nota">Sem taxa de adesão · sem fidelidade</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {plataforma && (
        <section className="secao clara" id="empresas">
          <div className="container">
            <div className="secao-titulo">
              <span className="chip chip-marca chip-sm">
                <Icone nome="handshake" tamanho={16} /> Aprimore Empresas · em implantação
              </span>
              <h2>Universidade corporativa &amp; <em>treinamentos para RH</em></h2>
              <p>
                Vídeos de integração, treinamentos internos, compliance e desenvolvimento
                contínuo da equipe num portal exclusivo, fechado e com a identidade da sua marca.
              </p>
            </div>

            <div className="grade-4" style={{ marginBottom: 'clamp(32px, 4vw, 48px)' }}>
              {RECURSOS_EMPRESA.map((r) => (
                <div className="cartao cartao-recurso" key={r.titulo}>
                  <span className="selo"><Icone nome={r.icone} tamanho={22} /></span>
                  <h3>{r.titulo}</h3>
                  <p>{r.texto}</p>
                </div>
              ))}
            </div>

            {/* Os cartões seguem o desenho dos planos de aluno; o destaque
                usa `recomendado`, e não `destaque`, para o preço do aluno
                continuar sendo o único `.plano.destaque .valor` da página. */}
            <div className="planos">
              {PLANOS_EMPRESA.map((p) => (
                <div className={`cartao cartao-plano plano${p.recomendado ? ' recomendado' : ''}`} key={p.id}>
                  {p.recomendado && <span className="fita">Mais recomendado</span>}
                  <div className="nome">{p.publico}</div>
                  <div className="promessa">{p.nome}</div>
                  <p className="resumo">{p.resumo}</p>
                  <div className="valor">
                    {p.centavosMes === null ? 'Sob proposta' : <>{brl(p.centavosMes)}<small>/mês</small></>}
                  </div>
                  <p className="periodo">{p.cobranca}</p>
                  <p className="inclui">{p.tituloLista}</p>
                  <ul>
                    {p.itens.map((item) => (
                      <li key={item}><Icone nome="check_circle" tamanho={20} /> {item}</li>
                    ))}
                  </ul>
                  <Link className={`btn ${p.recomendado ? 'btn-primario' : 'btn-contorno'} btn-bloco`}
                        href={`/empresas?plano=${p.id}#contato`}>
                    {p.centavosMes === null ? 'Falar com o time' : `Pedir proposta ${p.nome.split(' ').at(-1)}`}
                  </Link>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--on-surface-variant)', marginTop: '1.4rem' }}>
              Preços de referência da proposta. A contratação fecha por porte e trilhas, sem cobrança antes do contrato.
            </p>

            <div className="cartao convite-empresa" style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="monograma" aria-hidden="true">RH</span>
                <div>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
                    Precisa de um diagnóstico do treinamento da sua equipe?
                  </strong>
                  <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                    Apresentação guiada e gratuita de 30 minutos com os seus gestores.
                  </p>
                </div>
              </div>
              <Link className="btn btn-contorno" href="/empresas#contato">Agendar apresentação</Link>
            </div>
          </div>
        </section>
      )}

      <section className="secao tinta">
        <div className="container">
          <div className="secao-titulo">
            <h2>O que dá para fazer <em>sem pagar nada</em></h2>
            <p>Boa parte da plataforma é aberta. Isso não é isca: é o conteúdo que traz gente para cá.</p>
          </div>
          <div className="grade-4">
            <div className="cartao">
              <h3>Sem cadastro</h3>
              <p>Ementas de todos os cursos, <strong>biblioteca completa</strong> e a 1ª aula de cada assunto.</p>
            </div>
            <div className="cartao">
              <h3>Teste de 7 dias</h3>
              <p>Um curso, ~20% das aulas, até 30 exercícios. Um por CPF, sem cartão, sem renovação automática.</p>
            </div>
            <div className="cartao">
              <h3>Licença promocional</h3>
              <p>Por código, parceria ou campanha: acesso <strong>total</strong> a um curso pelo período da promoção.</p>
            </div>
            <div className="cartao">
              <h3>Licença paga</h3>
              <p>Por curso ou passe completo. As licenças somam: comprou o passe tendo um curso? Os dois seguem valendo.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="secao" id="legal">
        <div className="container">
          <div className="secao-titulo">
            <h2>Pagamento e cancelamento <em>sem pegadinha</em></h2>
          </div>
          <div className="grade-3">
            <div className="cartao">
              <h3>Pix ou cartão</h3>
              <p>Pix por QR ou copia-e-cola libera o acesso em segundos. No cartão, a renovação é automática — e avisamos 3 dias antes de cada cobrança.</p>
            </div>
            <div className="cartao">
              <h3>7 dias para desistir</h3>
              <p>Comprou e não era o que esperava? Devolução integral em até 7 dias, sem justificativa, mesmo que já tenha assistido (CDC, art. 49).</p>
            </div>
            <div className="cartao">
              <h3>Cancela em 2 cliques</h3>
              <p>No painel, com protocolo. O acesso continua até o fim do período já pago — e seu progresso fica guardado se você voltar.</p>
            </div>
          </div>

          <div className="sabia" style={{ marginTop: '1.6rem' }}>
            👨‍👩‍👧 <strong>Menor de 18 anos?</strong> Pode estudar aqui, mas o cadastro precisa do aceite
            do responsável legal, e a compra é sempre feita no CPF do adulto responsável. Contas de
            menores não recebem publicidade dirigida por comportamento.
          </div>
        </div>
      </section>
    </Pagina>
  );
}

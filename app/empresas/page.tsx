import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../componentes.tsx';
import FormEmpresa from './FormEmpresa.tsx';
import { acaoRegistrarInteresse } from './acoes.ts';
import { PLANOS_EMPRESA, PLANOS, PORTES, ROTULO_PORTE, type PlanoEmpresa } from '../../lib/empresas.ts';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { brl } from '../../lib/precos.ts';
import { planosDeEmpresa } from '../../lib/empresa.ts';

export const metadata: Metadata = {
  title: 'Empresas & RH — treinamento da equipe na sua marca',
  description: 'Universidade corporativa com trilhas por departamento, progresso por pessoa e '
    + 'certificado de conclusão. Contrate em dois minutos ou peça uma apresentação.',
};
export const dynamic = 'force-dynamic';

/**
 * §5.11 — Starter e Pro passaram a ser autosserviço: a empresa contrata
 * em /empresas/contratar e o portal nasce do pagamento, como o do
 * professor. O formulário desta página continua existindo para o
 * ENTERPRISE, que fecha por proposta, e para quem quer conversar antes.
 */
const PASSOS = [
  { icone: 'shopping_cart', titulo: 'Você contrata em dois minutos',
    texto: 'Escolhe o plano pelo tamanho da equipe, informa o CNPJ e paga a 1ª mensalidade.' },
  { icone: 'video_library', titulo: 'Sobe as trilhas',
    texto: 'Vídeo, material e exercício por aula, e uma avaliação final com nota mínima.' },
  { icone: 'group_add', titulo: 'Cadastra a equipe',
    texto: 'Um a um, por planilha ou por link de convite. Cada pessoa recebe as trilhas do setor dela.' },
  { icone: 'insights', titulo: 'Acompanha quem concluiu',
    texto: 'Progresso por pessoa, nota da avaliação e certificado com a chancela da empresa.' },
];

/**
 * A vitrine corporativa (§12-B.1, §5.11) — só no site principal, como a
 * do professor: dentro do portal de um cliente não se vende outra coisa.
 *
 * A página tem dois caminhos, e é de propósito. Starter e Pro levam à
 * contratação (§5.11, etapa 1): a empresa escolhe, paga e o portal
 * nasce. O Enterprise, e quem prefere conversar antes, seguem pelo
 * formulário de interesse, que grava o lead e passa a bola ao comercial.
 */
export default async function Empresas(
  { searchParams }: { searchParams: Promise<{ plano?: string }> },
) {
  if ((await portalIdAtual()) !== 0) redirect('/');
  const { plano = 'pro' } = await searchParams;
  const planoInicial = PLANOS.includes(plano as PlanoEmpresa) ? plano : 'pro';

  // §5.11 — o preço vem do banco: mudar em /admin/portais muda esta
  // página. Os planos em autosserviço casam com o texto de venda pelo
  // nome; o Enterprise não tem linha no banco de propósito — ele não tem
  // checkout, e preço sem checkout não é preço vigente (lib/empresas.ts).
  const doBanco = new Map(
    (await planosDeEmpresa()).map((p) => [p.nome.replace(/^Empresa /, ''), p]),
  );
  const NOME_NO_BANCO: Record<PlanoEmpresa, string> = {
    starter: 'Starter', pro: 'Pro', enterprise: '—',
  };

  return (
    <Pagina ativo="planos">
      <section className="cabeca-materia">
        <div className="container">
          <div className="trilha-topo">
            <Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} />
            <Link href="/planos#empresas">Planos</Link><Icone nome="chevron_right" tamanho={16} />
            <span>Empresas &amp; RH</span>
          </div>
          <h1>Treinamento da equipe, <em className="cor-marca">na sua marca</em></h1>
          <p className="sub">
            Integração, compliance e desenvolvimento contínuo num portal fechado da empresa,
            com progresso por pessoa e certificado ao fim de cada trilha. Deixe o contato e
            receba a proposta.
          </p>
        </div>
      </section>

      <section className="secao" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          <div className="grade-2" style={{ alignItems: 'start', gap: 32 }}>
            <div className="pilha-lg">
              <div className="cartao" style={{ background: 'var(--surface-marca)' }}>
                <h2 className="headline-md" style={{ marginBottom: 6 }}>
                  Comece hoje, sem esperar proposta
                </h2>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 14 }}>
                  Os planos Starter e Pro são contratados aqui mesmo: você escolhe pelo
                  tamanho da equipe, paga a 1ª mensalidade e o portal entra no ar. O
                  Enterprise, para equipes acima de 250 pessoas ou com integração ao
                  sistema de RH, continua fechando por proposta — é para isso que serve
                  o formulário ao lado.
                </p>
                <Link className="btn btn-primario btn-lg" href="/empresas/contratar">
                  Contratar agora
                </Link>
              </div>

              <div>
                <h2 className="headline-md" style={{ marginBottom: 16 }}>Como funciona</h2>
                <div className="pilha-md">
                  {PASSOS.map((p, i) => (
                    <div className="cartao" key={p.titulo} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <span className="chip chip-sm chip-secundaria" style={{ flexShrink: 0 }}>{i + 1}</span>
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                          <Icone nome={p.icone} tamanho={18} /> {p.titulo}
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>{p.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="headline-md" style={{ marginBottom: 16 }}>Planos</h2>
                <div className="pilha-sm">
                  {PLANOS_EMPRESA.map((p) => {
                    const linha = doBanco.get(NOME_NO_BANCO[p.id]);
                    return (
                      <div className="cartao" key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{p.nome}</strong>
                          <br />
                          <span className="caption suave">
                            {linha?.limiteContas
                              ? `Até ${linha.limiteContas} colaboradores`
                              : p.publico}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--primary-texto)', whiteSpace: 'nowrap' }}>
                            {linha ? `${brl(linha.licencaMensalCentavos)}/mês` : 'Sob proposta'}
                          </strong>
                          {linha && (
                            <Link className="btn btn-primario btn-sm"
                                  href={`/empresas/contratar?plano=${linha.id}`}>
                              Contratar
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="caption suave" style={{ marginTop: 10 }}>
                  Detalhe de cada plano em <Link href="/planos#empresas" style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>Planos › Empresas &amp; RH</Link>.
                </p>
              </div>
            </div>

            <div className="cartao" id="contato">
              <h2 className="headline-md" style={{ marginBottom: 6 }}>Pedir uma apresentação</h2>
              <p className="caption suave" style={{ marginBottom: 16 }}>
                Para o Enterprise, ou se preferir ver a plataforma antes de contratar:
                30 minutos com os seus gestores, sem custo. Respondemos em até 2 dias úteis.
              </p>
              <FormEmpresa
                acao={acaoRegistrarInteresse}
                planoInicial={planoInicial}
                planos={PLANOS_EMPRESA.map((p) => ({ valor: p.id, rotulo: `${p.nome} — ${p.publico}` }))}
                portes={PORTES.map((p) => ({ valor: p, rotulo: ROTULO_PORTE[p] }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="secao tinta">
        <div className="container">
          <div className="grade-3">
            <div className="cartao">
              <h3>De quem são os dados dos colaboradores?</h3>
              <p>Da empresa, que responde por eles como controladora (LGPD). Nós somos o operador:
                guardamos e processamos só para entregar o treinamento e o relatório ao RH.</p>
            </div>
            <div className="cartao">
              <h3>O certificado vale como curso reconhecido?</h3>
              <p>Não — é certificado de conclusão de curso livre, com a chancela da empresa, próprio
                para registro interno e auditoria de treinamento. Não somos instituição credenciada pelo MEC.</p>
            </div>
            <div className="cartao">
              <h3>E se a empresa quiser sair?</h3>
              <p>Sem fidelidade além do período contratado. Os relatórios ficam com o RH, e os
                colaboradores concluem as trilhas em andamento até o fim do prazo pago.</p>
            </div>
          </div>
        </div>
      </section>
    </Pagina>
  );
}

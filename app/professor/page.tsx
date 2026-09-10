import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../ui.tsx';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalDoProfessor } from '../../lib/professor.ts';
import { listarFaturas } from '../../lib/portal-financeiro.ts';
import { enderecoDoPortal } from '../../lib/portal-consultas.ts';
import { brl } from '../../lib/precos.ts';
import VisaoGeralCatalogo from './catalogo/VisaoGeral.tsx';

export const metadata: Metadata = { title: 'Painel do professor' };

const CHIP: Record<string, string> = {
  ATIVO: 'chip-secundaria', RASCUNHO: 'chip-neutra', SUSPENSO: 'chip-erro', ENCERRADO: 'chip-neutra',
  APROVADA: 'chip-secundaria', EM_ANALISE: 'chip-terciaria', PENDENTE: 'chip-neutra', RECUSADA: 'chip-erro',
};
const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function VisaoGeralProfessor() {
  const u = (await alunoAtual())!;
  const portal = await portalDoProfessor(u.id);
  // Sem portal = professor do catálogo (etapa 5): outro painel, mesma rota.
  if (!portal) return <VisaoGeralCatalogo u={u} />;
  const faturas = (await listarFaturas(portal.id)).filter((f) => f.status !== 'PAGA' && f.status !== 'CANCELADA');
  const endereco = await enderecoDoPortal(portal.mascara);
  const visivel = endereco.replace(/^https?:\/\//, '');

  /**
   * A checklist só serve se o "feito" for o mesmo fato que a frase
   * promete. Antes ela marcava "página personalizada" com a chamada
   * preenchida (propósito e contato podiam estar vazios) e "primeira
   * aula publicada, com exercício" sem olhar exercício nenhum — e o
   * professor via verde com o portal ainda vazio. Cada passo abaixo
   * mostra, embaixo da frase, o número que veio do cadastro.
   */
  const p = portal.personalizacao;
  const faltaNaPagina = ([
    !p.chamada?.trim() && 'chamada',
    !p.proposito?.trim() && 'propósito',
    !p.contato?.trim() && 'contato',
  ].filter(Boolean)) as string[];

  const passos = [
    {
      feito: portal.status === 'ATIVO',
      texto: 'Portal no ar',
      detalhe: portal.status === 'ATIVO'
        ? `publicado em ${DATA(portal.publicadoEm)}`
        : `hoje está em ${portal.status.toLowerCase()} — a 1ª mensalidade abre o portal`,
      href: '/professor/financeiro',
    },
    {
      feito: portal.subcontaSituacao === 'APROVADA',
      texto: 'Conta de recebimento aprovada — é o que abre a venda',
      detalhe: `situação atual: ${portal.subcontaSituacao.toLowerCase().replace('_', ' ')}`,
    },
    {
      feito: faltaNaPagina.length === 0,
      texto: 'Página personalizada (chamada, propósito e contato)',
      detalhe: faltaNaPagina.length === 0
        ? 'os três campos preenchidos'
        : `falta preencher: ${faltaNaPagina.join(', ')}`,
      href: '/professor/site',
    },
    {
      feito: portal.materias > 0,
      texto: 'Primeiro curso criado',
      detalhe: portal.materias === 0
        ? 'nenhum curso cadastrado'
        : `${plural(portal.materias, 'curso cadastrado', 'cursos cadastrados')} · ${portal.materiasPublicadas} publicado(s)`,
      href: '/professor/cursos',
    },
    {
      feito: portal.aulasComExercicio > 0,
      texto: 'Primeira aula publicada, com exercício',
      detalhe: portal.aulasPublicadas === 0
        ? 'nenhuma aula publicada'
        : `${plural(portal.aulasPublicadas, 'aula publicada', 'aulas publicadas')} · ${portal.aulasComExercicio} com exercício`,
      href: '/professor/cursos',
    },
    {
      feito: portal.aulasPublicadas > 0 && portal.aulasComVideo === portal.aulasPublicadas,
      texto: 'Vídeo anexado nas aulas publicadas',
      detalhe: portal.aulasPublicadas === 0
        ? 'nenhuma aula publicada ainda'
        : portal.aulasComVideo === portal.aulasPublicadas
          ? `${plural(portal.aulasComVideo, 'aula com gravação', 'aulas com gravação')}`
          : `${portal.aulasComVideo} de ${portal.aulasPublicadas} com gravação — a aula sem vídeo vai ao ar com resumo e exercício, mas o vídeo é o produto`,
      href: '/professor/videos',
    },
    {
      feito: portal.materiasNoAr > 0,
      texto: 'Curso aparecendo na página do portal',
      detalhe: portal.materiasNoAr > 0
        ? `${plural(portal.materiasNoAr, 'curso visível', 'cursos visíveis')} para o visitante`
        : portal.materiasVazias > 0
          ? `${plural(portal.materiasVazias, 'curso publicado', 'cursos publicados')} sem nenhuma aula no ar — o portal só mostra curso que já tem aula publicada`
          : 'publique um curso e ao menos uma aula dele',
      href: '/professor/cursos',
    },
  ];
  const aFazer = passos.filter((x) => !x.feito).length;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Olá, {u.nome.split(' ')[0]}</h1>
          <p className="suave">
            <a href={endereco} target="_blank" rel="noreferrer"><code>{visivel}</code></a>
            {' '}· plano {portal.planoNome ?? '—'}
          </p>
        </div>
        <div className="acoes">
          <a className="btn btn-primario" href={endereco} target="_blank" rel="noreferrer">Ver meu portal</a>
        </div>
      </div>

      {portal.status === 'SUSPENSO' && (
        <p className="alerta alerta-erro">
          <strong>Seu portal está suspenso por fatura em atraso.</strong> Visitantes não veem
          o catálogo e novas vendas estão bloqueadas; seus alunos com licença continuam
          assistindo. Pague a fatura em <Link href="/professor/financeiro">Financeiro</Link> e
          o portal volta ao ar na hora.
        </p>
      )}
      {portal.subcontaSituacao === 'RECUSADA' && (
        <p className="alerta alerta-erro">
          <strong>Sua conta de recebimento foi recusada pelo meio de pagamento.</strong> Fale
          com o suporte para entender o motivo — sem ela o portal não vende.
        </p>
      )}
      {portal.materiasVazias > 0 && (
        <p className="alerta alerta-erro">
          <strong>
            {plural(portal.materiasVazias, 'curso publicado não aparece', 'cursos publicados não aparecem')}{' '}
            no seu portal.
          </strong>{' '}
          A página do portal só mostra curso que já tem <em>aula publicada</em> — publicar o
          curso não basta. Abra o curso em <Link href="/professor/cursos">Cursos e aulas</Link>,
          crie um assunto, crie a aula, envie o vídeo dentro dela e publique a aula.
        </p>
      )}

      <div className="grade-4" style={{ marginBottom: 24 }}>
        <div className="cartao">
          <span className="label-md suave">PORTAL</span>
          <div><span className={`chip ${CHIP[portal.status]}`}>{portal.status.toLowerCase()}</span></div>
          <p className="caption suave">no ar desde {DATA(portal.publicadoEm)}</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">RECEBIMENTO</span>
          <div><span className={`chip ${CHIP[portal.subcontaSituacao]}`}>{portal.subcontaSituacao.toLowerCase().replace('_', ' ')}</span></div>
          <p className="caption suave">
            {portal.subcontaSituacao === 'APROVADA'
              ? `retenção de ${portal.escrowDias} dias (prazo de reembolso do aluno)`
              : 'a venda abre quando aprovar'}
          </p>
        </div>
        <div className="cartao">
          <span className="label-md suave">ACERVO</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{portal.aulasPublicadas}</div>
          <p className="caption suave">
            {plural(portal.aulasPublicadas, 'aula no ar', 'aulas no ar')} em{' '}
            {plural(portal.materiasNoAr, 'curso visível', 'cursos visíveis')}
            {portal.materias !== portal.materiasNoAr && ` · ${portal.materias} cadastrado(s)`}
          </p>
        </div>
        <div className="cartao">
          <span className="label-md suave">ALUNOS</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{portal.alunos}</div>
          <p className="caption suave">na sua base — ela é sua</p>
        </div>
      </div>

      <div className="grade-2">
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 4 }}>Próximos passos</h2>
          <p className="caption suave" style={{ marginBottom: 14 }}>
            {aFazer === 0
              ? 'Tudo cumprido — o portal está completo.'
              : `${plural(aFazer, 'passo pendente', 'passos pendentes')} de ${passos.length}. Embaixo de cada frase está o que foi conferido no seu cadastro.`}
          </p>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
            {passos.map((x) => (
              <li key={x.texto} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span className={`chip chip-sm ${x.feito ? 'chip-secundaria' : 'chip-neutra'}`}
                      style={{ flex: '0 0 auto' }}>
                  <Icone nome={x.feito ? 'check' : 'schedule'} tamanho={14} />
                  {x.feito ? 'feito' : 'a fazer'}
                </span>
                <span>
                  {x.href && !x.feito ? <Link href={x.href}>{x.texto}</Link> : x.texto}
                  <br /><span className="caption suave">{x.detalhe}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 12 }}>Seu contrato</h2>
          {portal.contrato ? (
            <>
              <p>
                <strong>{brl(portal.contrato.licencaMensalCentavos)}/mês</strong> de licença +{' '}
                <strong>{Number(portal.contrato.percentualBase)}%</strong> de comissão sobre cada
                venda feita no seu portal.
                <br /><span className="caption suave">aceito em {DATA(portal.contrato.aceitoEm)}</span>
              </p>
              <p className="caption suave" style={{ marginTop: 12 }}>
                <strong>Exceção — aluno que a plataforma trouxe.</strong> Quando o aluno chega ao
                seu portal por um anúncio nosso, a comissão da <em>primeira</em> compra dele sobe{' '}
                {Number(portal.contrato.acrescimoIndicacaoPp)} pontos percentuais (p.p.): passa de{' '}
                {Number(portal.contrato.percentualBase)}% para{' '}
                <strong>
                  {Number(portal.contrato.percentualBase) + Number(portal.contrato.acrescimoIndicacaoPp)}%
                </strong>{' '}
                naquela compra. Da segunda em diante, volta a{' '}
                {Number(portal.contrato.percentualBase)}%.
              </p>
              <p className="caption suave" style={{ marginTop: 10 }}>
                <strong>Curso seu vendido na vitrine da plataforma:</strong> a venda é nossa e
                você recebe <strong>{Number(portal.contrato.comissaoVitrinePp)}%</strong> do valor,
                repassado no fechamento mensal (Financeiro).
              </p>
            </>
          ) : <p className="suave">Sem contrato vigente — fale com o suporte.</p>}
          {faturas.length > 0 && (
            <p className="aviso" style={{ marginTop: 14 }}>
              <strong>{faturas.length} fatura(s) em aberto.</strong>{' '}
              <Link href="/professor/financeiro">Ver e pagar</Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

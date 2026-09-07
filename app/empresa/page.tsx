import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../ui.tsx';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalDaEmpresa } from '../../lib/empresa.ts';
import { listarFaturas } from '../../lib/portal-financeiro.ts';
import { enderecoDoPortal } from '../../lib/portal-consultas.ts';
import { brl } from '../../lib/precos.ts';

export const metadata: Metadata = { title: 'Painel da empresa' };

const CHIP: Record<string, string> = {
  ATIVO: 'chip-secundaria', RASCUNHO: 'chip-neutra',
  SUSPENSO: 'chip-erro', ENCERRADO: 'chip-neutra',
};
const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * A visão geral do RH — §5.11, etapa 2.
 *
 * A checklist segue a regra que o painel do professor aprendeu na
 * prática: o "feito" tem de ser o MESMO FATO que a frase promete, e
 * embaixo de cada passo vai o número que veio do banco. Marcar verde com
 * o portal vazio é pior do que não ter checklist — o gestor confia,
 * cadastra a equipe e a equipe não encontra nada.
 */
export default async function VisaoGeralEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const faturas = (await listarFaturas(portal.id))
    .filter((f) => f.status !== 'PAGA' && f.status !== 'CANCELADA');
  const endereco = await enderecoDoPortal(portal.mascara);
  const visivel = endereco.replace(/^https?:\/\//, '');

  const p = portal.personalizacao;
  const faltaNaPagina = ([
    !p.chamada?.trim() && 'mensagem de boas-vindas',
    !p.contato?.trim() && 'contato do RH',
  ].filter(Boolean)) as string[];

  const passos = [
    {
      feito: portal.status === 'ATIVO',
      texto: 'Portal no ar',
      detalhe: portal.status === 'ATIVO'
        ? `publicado em ${DATA(portal.publicadoEm)}`
        : `hoje está em ${portal.status.toLowerCase()} — a 1ª mensalidade abre o portal`,
    },
    {
      feito: faltaNaPagina.length === 0,
      texto: 'Página de entrada com a sua marca',
      detalhe: faltaNaPagina.length === 0
        ? 'é o que o colaborador vê antes de entrar'
        : `falta preencher: ${faltaNaPagina.join(' e ')}`,
      href: '/empresa/site',
    },
    {
      feito: portal.trilhas > 0,
      href: '/empresa/trilhas',
      texto: 'Primeira trilha criada',
      detalhe: portal.trilhas === 0
        ? 'nenhuma trilha cadastrada'
        : `${plural(portal.trilhas, 'trilha cadastrada', 'trilhas cadastradas')} · ${portal.trilhasPublicadas} publicada(s)`,
    },
    {
      feito: portal.trilhasNoAr > 0,
      texto: 'Trilha visível para o colaborador',
      detalhe: portal.trilhasNoAr > 0
        ? `${plural(portal.trilhasNoAr, 'trilha visível', 'trilhas visíveis')}`
        : portal.trilhasVazias > 0
          ? `${plural(portal.trilhasVazias, 'trilha publicada', 'trilhas publicadas')} sem nenhuma aula no ar — o portal só mostra trilha que já tem aula publicada`
          : 'publique uma trilha e ao menos uma aula dela',
    },
    {
      feito: portal.colaboradoresAtivos > 0,
      href: '/empresa/colaboradores',
      texto: 'Equipe cadastrada',
      detalhe: portal.colaboradoresAtivos === 0
        ? 'nenhum colaborador ativo'
        : `${plural(portal.colaboradoresAtivos, 'pessoa com acesso', 'pessoas com acesso')}`
          + (portal.limiteContas ? ` de ${portal.limiteContas} do plano` : ''),
    },
    {
      feito: portal.atribuicoes > 0,
      href: '/empresa/atribuicoes',
      texto: 'Trilha atribuída a alguém',
      detalhe: portal.atribuicoes === 0
        ? 'ninguém recebeu trilha ainda — cadastrar não libera acesso, atribuir é que libera'
        : `${plural(portal.atribuicoes, 'atribuição', 'atribuições')} · ${portal.conclusoes} conclusão(ões)`,
    },
  ];
  const aFazer = passos.filter((x) => !x.feito).length;

  const ocupacao = portal.limiteContas === null
    ? null
    : Math.round((portal.colaboradoresAtivos / portal.limiteContas) * 100);

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
          <a className="btn btn-primario" href={endereco} target="_blank" rel="noreferrer">
            Ver o portal
          </a>
        </div>
      </div>

      {portal.status === 'SUSPENSO' && (
        <p className="alerta alerta-erro">
          <strong>O portal está suspenso por fatura em atraso.</strong> Sua equipe não
          consegue entrar para começar trilhas novas; quem já tem acesso liberado continua
          assistindo. Pague a fatura e o portal volta ao ar na hora.
        </p>
      )}

      {portal.trilhasVazias > 0 && (
        <p className="alerta alerta-erro">
          <strong>
            {plural(portal.trilhasVazias, 'trilha publicada não aparece', 'trilhas publicadas não aparecem')}
            {' '}no portal.
          </strong>{' '}
          O portal só mostra trilha que já tem <em>aula publicada</em> — publicar a trilha
          não basta. Abra a trilha, crie um módulo, crie a aula, envie o vídeo dentro dela
          e publique a aula.
        </p>
      )}

      <div className="grade-4" style={{ marginBottom: 24 }}>
        <div className="cartao">
          <span className="label-md suave">PORTAL</span>
          <div><span className={`chip ${CHIP[portal.status]}`}>{portal.status.toLowerCase()}</span></div>
          <p className="caption suave">no ar desde {DATA(portal.publicadoEm)}</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">PESSOAS COM ACESSO</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
            {portal.colaboradoresAtivos}
            {portal.limiteContas !== null && (
              <span className="suave" style={{ fontSize: 16, fontWeight: 600 }}> / {portal.limiteContas}</span>
            )}
          </div>
          <p className="caption suave">
            {ocupacao === null
              ? 'sem teto no seu plano'
              : ocupacao >= 90
                ? 'seu plano está quase cheio'
                : `${100 - ocupacao}% do plano ainda livre`}
          </p>
        </div>
        <div className="cartao">
          <span className="label-md suave">TRILHAS NO AR</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
            {portal.trilhasNoAr}
          </div>
          <p className="caption suave">
            {plural(portal.aulasPublicadas, 'aula publicada', 'aulas publicadas')}
            {portal.avaliacoesPublicadas > 0 && ` · ${portal.avaliacoesPublicadas} avaliação(ões)`}
          </p>
        </div>
        <div className="cartao">
          <span className="label-md suave">CONCLUSÕES</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
            {portal.conclusoes}
          </div>
          <p className="caption suave">
            {plural(portal.atribuicoes, 'trilha atribuída', 'trilhas atribuídas')}
          </p>
        </div>
      </div>

      {faturas.length > 0 && (
        <div className="cartao" style={{ marginBottom: 24 }}>
          <h2 className="headline-md" style={{ marginBottom: 8 }}>
            <Icone nome="receipt_long" /> Fatura em aberto
          </h2>
          {faturas.map((f) => (
            <p key={f.id} className="suave">
              {f.referencia} · {brl(f.centavosTotal)} · vence em {DATA(f.vencimento)}
              {f.status === 'EM_ATRASO' && <strong style={{ color: 'var(--error)' }}> · em atraso</strong>}
            </p>
          ))}
        </div>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          {aFazer === 0 ? 'Tudo pronto' : `Faltam ${aFazer} passo(s) para a equipe começar`}
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Cada passo mostra o número que veio do cadastro, e não uma promessa.
        </p>
        <div className="pilha-sm">
          {passos.map((s) => (
            <div key={s.texto} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Icone nome={s.feito ? 'check_circle' : 'radio_button_unchecked'} tamanho={20} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontWeight: s.feito ? 500 : 700 }}>{s.texto}</strong>
                <br />
                <span className="caption suave">{s.detalhe}</span>
              </div>
              {s.href && !s.feito && (
                <Link className="btn btn-contorno btn-sm" href={s.href}>Abrir</Link>
              )}
            </div>
          ))}
        </div>
        <p className="caption suave" style={{ marginTop: 16 }}>
          O caminho: <Link href="/empresa/trilhas">trilhas</Link> → <Link href="/empresa/colaboradores">colaboradores</Link> → <Link href="/empresa/atribuicoes">liberar trilhas</Link> → <Link href="/empresa/acompanhamento">acompanhamento</Link>.
        </p>
      </div>
    </>
  );
}

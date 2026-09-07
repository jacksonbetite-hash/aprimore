import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../../componentes.tsx';
import CopiarCodigo from './CopiarCodigo.tsx';
import { alunoAtual } from '../../../lib/sessao.ts';
import { buscarPedidoPorReferencia } from '../../../lib/checkout.ts';
import { provedorAtual } from '../../../lib/pagamento.ts';
import { brl } from '../../../lib/precos.ts';
import { recusarNoPortalDeEmpresa } from '../../guarda-empresa.ts';

export const metadata: Metadata = { title: 'Pagamento' };
export const dynamic = 'force-dynamic';

export default async function Checkout({ params }: { params: Promise<{ referencia: string }> }) {
  // §5.11 — na empresa ninguém compra: quem libera acesso é o RH.
  await recusarNoPortalDeEmpresa();
  const { referencia } = await params;
  const aluno = await alunoAtual();
  if (!aluno) redirect(`/entrar?destino=/checkout/${referencia}`);

  const pedido = await buscarPedidoPorReferencia(referencia, aluno.id);
  if (!pedido) notFound();

  const detalhe = (pedido.detalhe ?? {}) as { idExterno?: string; copiaECola?: string | null; linkPagamento?: string | null };
  const provedor = provedorAtual();
  const pago = pedido.status === 'PAGO';
  // O código guardado é o do gateway; a reconstrução é só para pedidos do
  // simulado anteriores a este campo.
  const copiaECola = pedido.meio === 'PIX'
    ? (detalhe.copiaECola
       ?? `00020126580014BR.GOV.BCB.PIX0136${detalhe.idExterno ?? referencia}5204000053039865802BR5916APRIMORE O SABER6009SAO PAULO62070503***6304`)
    : null;
  const linkPagamento = detalhe.linkPagamento ?? null;

  return (
    <Pagina ativo="planos">
      <section className="secao caixa-auth">
        <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
          {pago ? (
            <>
              <h1>Pagamento confirmado</h1>
              <p className="sub">
                Sua licença já está ativa. Bons estudos —
                e lembre-se: toda alternativa dos exercícios vem comentada.
              </p>
              <Link className="btn btn-primario" href="/painel">Ir para o meu painel</Link>
            </>
          ) : (
            <>
              <h1>Falta pouco</h1>
              <p className="sub">
                Pedido <strong>{pedido.referencia}</strong> ·{' '}
                {pedido.escopo === 'CATALOGO' ? 'Passe completo' : pedido.materiaNome} ·{' '}
                plano {pedido.periodo}
              </p>

              <div className="cartao" style={{ background: 'var(--surface-container-low)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="label-md suave">TOTAL</span>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--primary)' }}>
                    {brl(pedido.centavos)}
                  </strong>
                </div>
              </div>

              {!provedor.cobraDeVerdade && (
                <p className="aviso" style={{ marginBottom: 20 }}>
                  <strong>Ambiente de demonstração.</strong> O provedor de pagamento é o
                  simulado: <strong>nenhuma cobrança real acontece</strong>. Ao ligar um
                  gateway de verdade (§8.2), esta tela não muda — só o provedor.
                </p>
              )}

              {copiaECola ? (
                <>
                  <h2 className="headline-md" style={{ marginBottom: 8 }}>
                    <Icone nome="payments" /> Pague com Pix
                  </h2>
                  <p className="caption suave" style={{ marginBottom: 12 }}>
                    Copie o código e cole no aplicativo do seu banco. A liberação é em segundos.
                  </p>
                  <CopiarCodigo codigo={copiaECola} />
                </>
              ) : (
                <>
                  <h2 className="headline-md" style={{ marginBottom: 8 }}>
                    <Icone nome="payments" /> Pagamento no cartão
                  </h2>
                  <p className="caption suave" style={{ marginBottom: 16 }}>
                    Os dados do cartão são capturados pelo gateway, nunca pelo nosso servidor
                    (PCI-DSS SAQ-A). A renovação é automática e avisamos 3 dias antes de cada
                    cobrança.
                  </p>
                  {linkPagamento && (
                    <a className="btn btn-primario btn-bloco" href={linkPagamento} target="_blank" rel="noreferrer">
                      Pagar com cartão na página segura
                    </a>
                  )}
                </>
              )}

              <div className="sabia" style={{ marginTop: 20 }}>
                <div className="titulo"><Icone nome="lightbulb" tamanho={20} /> Como confirmar aqui</div>
                Este ambiente não tem gateway ligado. Para simular a confirmação que o banco
                enviaria, rode no terminal, na pasta do projeto:
                <code style={{ display: 'block', marginTop: 8, fontSize: 13, wordBreak: 'break-all' }}>
                  npm run confirmar-pagamento {pedido.referencia}
                </code>
              </div>

              <p className="caption suave" style={{ marginTop: 20 }}>
                Arrependeu? Devolvemos 100% em até 7 dias, sem justificativa (CDC, art. 49).
              </p>
            </>
          )}
        </div>
      </section>
    </Pagina>
  );
}

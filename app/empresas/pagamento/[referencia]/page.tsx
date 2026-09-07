import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../../../componentes.tsx';
import CopiarCodigo from '../../../checkout/[referencia]/CopiarCodigo.tsx';
import { alunoAtual } from '../../../../lib/sessao.ts';
import { faturaDoProfessor } from '../../../../lib/portal-assinatura.ts';
import { provedorAtual } from '../../../../lib/pagamento.ts';
import { dominioBase } from '../../../../lib/portal.ts';
import { brl } from '../../../../lib/precos.ts';

export const metadata: Metadata = { title: 'Pagamento do portal da empresa' };
export const dynamic = 'force-dynamic';

/**
 * A tela de pagamento da 1ª mensalidade da empresa — irmã da do
 * professor, com um fim diferente.
 *
 * Lá, o passo seguinte ao pagamento é a conta de recebimento entrar em
 * análise: sem ela o professor não vende. Aqui não há conta de
 * recebimento nenhuma (a empresa paga, não recebe), e o passo seguinte é
 * o que o RH tem de fazer: subir a primeira trilha e cadastrar a equipe.
 *
 * `faturaDoProfessor` serve às duas porque casa a referência com
 * `portal.professor_id` — que na empresa é a conta do responsável. A
 * trava é a mesma e é o ponto da função: a referência sozinha não basta,
 * senão qualquer um com o link veria o CNPJ e a cobrança alheios.
 */
export default async function PagamentoEmpresa(
  { params }: { params: Promise<{ referencia: string }> },
) {
  const { referencia } = await params;
  const responsavel = await alunoAtual();
  if (!responsavel) redirect(`/entrar?destino=/empresas/pagamento/${referencia}`);

  const fatura = await faturaDoProfessor(referencia, responsavel.id);
  if (!fatura) notFound();

  const provedor = provedorAtual();
  const paga = fatura.status === 'PAGA';
  const endereco = `${fatura.mascara}.${dominioBase()}`;
  const copiaECola = fatura.detalhe?.meio === 'PIX' && !paga
    ? fatura.detalhe.copiaECola ?? null
    : null;
  const linkPagamento = fatura.detalhe?.linkPagamento ?? null;

  return (
    <Pagina>
      <section className="secao caixa-auth">
        <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
          {paga ? (
            <>
              <h1>O portal da sua empresa está no ar</h1>
              <p className="sub">
                <strong>{fatura.nomeExibicao}</strong> já responde em{' '}
                <a href={`http://${endereco}`} target="_blank" rel="noreferrer">
                  <strong>{endereco}</strong>
                </a>. Quem chegar lá sem acesso vê a sua marca e o login, nada mais.
              </p>

              <div className="sabia">
                <div className="titulo">
                  <Icone nome="lightbulb" tamanho={20} /> Por onde começar
                </div>
                Crie a primeira trilha e publique ao menos uma aula — o portal só mostra
                trilha que já tem aula no ar. Depois cadastre a equipe e atribua a trilha:
                cada pessoa recebe o acesso na hora.
              </div>

              <div className="pilha-sm" style={{ marginTop: 20 }}>
                <Link className="btn btn-primario btn-bloco" href="/empresa">
                  Ir para o painel da empresa
                </Link>
                <Link className="btn btn-contorno btn-bloco" href={`http://${endereco}`}>
                  Ver o portal
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1>Falta só o pagamento</h1>
              <p className="sub">
                Fatura <strong>{fatura.referencia}</strong> · 1ª mensalidade de{' '}
                <strong>{fatura.nomeExibicao}</strong> ({endereco})
              </p>

              <div className="cartao" style={{ background: 'var(--surface-container-low)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="label-md suave">TOTAL</span>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--primary)' }}>
                    {brl(fatura.centavosTotal)}
                  </strong>
                </div>
              </div>

              {!provedor.cobraDeVerdade && (
                <p className="aviso" style={{ marginBottom: 20 }}>
                  <strong>Ambiente de demonstração.</strong> O provedor de pagamento é o
                  simulado: <strong>nenhuma cobrança real acontece</strong>.
                </p>
              )}

              {copiaECola ? (
                <>
                  <h2 className="headline-md" style={{ marginBottom: 8 }}>
                    <Icone nome="payments" /> Pague com Pix
                  </h2>
                  <p className="caption suave" style={{ marginBottom: 12 }}>
                    Copie o código e cole no aplicativo do banco da empresa. O portal vai
                    ao ar assim que o pagamento confirmar.
                  </p>
                  <CopiarCodigo codigo={copiaECola} />
                </>
              ) : (
                <>
                  <h2 className="headline-md" style={{ marginBottom: 8 }}>
                    <Icone nome="payments" /> Pagamento no cartão
                  </h2>
                  <p className="caption suave" style={{ marginBottom: 16 }}>
                    Os dados do cartão são capturados pelo gateway, nunca pelo nosso
                    servidor (PCI-DSS SAQ-A). A mensalidade renova sozinha.
                  </p>
                  {linkPagamento && (
                    <a className="btn btn-primario btn-bloco" href={linkPagamento}
                       target="_blank" rel="noreferrer">
                      Pagar com cartão na página segura
                    </a>
                  )}
                </>
              )}

              {!provedor.cobraDeVerdade && (
                <div className="sabia" style={{ marginTop: 20 }}>
                  <div className="titulo">
                    <Icone nome="lightbulb" tamanho={20} /> Como confirmar aqui
                  </div>
                  Este ambiente não tem gateway ligado. Para simular a confirmação que o
                  banco enviaria, rode no terminal, na pasta do projeto:
                  <code style={{ display: 'block', marginTop: 8, fontSize: 13, wordBreak: 'break-all' }}>
                    npm run confirmar-pagamento {fatura.referencia}
                  </code>
                </div>
              )}

              <p className="caption suave" style={{ marginTop: 20 }}>
                Arrependeu? Devolução integral em até 7 dias (CDC, art. 49).
              </p>
            </>
          )}
        </div>
      </section>
    </Pagina>
  );
}

import { NextResponse } from 'next/server';
import { provedorAtual } from '../../../lib/pagamento.ts';
import { confirmarPagamento } from '../../../lib/checkout.ts';
import { confirmarPagamentoFatura } from '../../../lib/portal-assinatura.ts';
import { abrirSubconta, processarEventoSubconta } from '../../../lib/portal-subconta.ts';

/**
 * Webhook do gateway (§8.3).
 *
 * Três garantias, nesta ordem:
 * 1. Assinatura conferida — sem isso, qualquer um libera licença de graça.
 * 2. Idempotência — o mesmo evento pode chegar duas vezes e nunca emite
 *    duas licenças (a guarda está em confirmarPagamento).
 * 3. Sempre 200 para evento já processado, para o gateway parar de
 *    reenviar; erro só quando há de fato algo a corrigir.
 */
export async function POST(req: Request) {
  const provedor = provedorAtual();
  const corpoBruto = await req.text();

  // Cada gateway assina de um jeito: o simulado com HMAC em `x-assinatura`;
  // o Asaas mandando o authToken do webhook em `asaas-access-token`. O
  // provedor confere o seu; a rota só entrega o que veio.
  const assinatura = req.headers.get('x-assinatura') ?? req.headers.get('x-signature')
    ?? req.headers.get('asaas-access-token');
  if (!provedor.validarAssinatura(corpoBruto, assinatura)) {
    return NextResponse.json({ erro: 'assinatura inválida' }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ erro: 'json inválido' }, { status: 400 });
  }

  const evento = provedor.interpretarEvento(corpo);
  if (!evento) return NextResponse.json({ erro: 'evento não reconhecido' }, { status: 400 });

  // Ciclo de vida da subconta do professor (§5.10.2, etapa 2): aprovação
  // e recusa chegam por aqui, identificadas pelo TIPO do evento.
  if (evento.tipo === 'subconta.aprovada' || evento.tipo === 'subconta.recusada') {
    const r = await processarEventoSubconta(evento, provedor.nome, corpo);
    if (!r.ok) return NextResponse.json({ processado: false, motivo: r.motivo });
    return NextResponse.json({
      processado: true, portalId: r.portalId,
      subconta: r.situacao, jaProcessado: r.jaProcessado,
    });
  }

  // O prefixo da referência diz de que fluxo é a cobrança: 'PF-' é fatura
  // de portal de professor (§5.10.2), o resto é pedido de aluno. Mesma
  // idempotência nos dois — evento_gateway é um só.
  if (evento.referencia.startsWith('PF-')) {
    const r = await confirmarPagamentoFatura(evento, provedor.nome, corpo);
    if (!r.ok) return NextResponse.json({ processado: false, motivo: r.motivo });

    // Portal recém-ativado já sai pedindo a subconta: é o passo que o
    // separa de poder vender. Falha aqui não derruba o webhook — a
    // ativação valeu, e a abertura é idempotente (dá para repetir).
    // §5.11 — portal de empresa não abre subconta: ele paga, não recebe.
    let subconta: string | undefined;
    if (r.portalAtivado && r.portalTipo !== 'EMPRESA') {
      try {
        subconta = (await abrirSubconta(r.portalId)).situacao;
      } catch (err) {
        console.error('abertura de subconta falhou', r.portalId, err);
        subconta = 'FALHOU';
      }
    }
    return NextResponse.json({
      processado: true, faturaId: r.faturaId,
      portalAtivado: r.portalAtivado, subconta, jaProcessado: r.jaProcessado,
    });
  }

  const r = await confirmarPagamento(evento, provedor.nome, corpo);
  if (!r.ok) {
    // 200 de propósito: o gateway não deve reenviar um evento que já não
    // tem o que fazer. O motivo fica registrado em evento_gateway.
    return NextResponse.json({ processado: false, motivo: r.motivo });
  }
  return NextResponse.json({
    processado: true, licencaId: r.licencaId, jaProcessado: r.jaProcessado,
  });
}

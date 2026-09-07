'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { desserializarCaso, serializarCaso } from '../../lib/penas/url.ts';
import { calcular, ErroDeCalculo } from '../../lib/penas/calcular.ts';
import { salvarCalculo, apagarCalculo } from '../../lib/calculo-pena.ts';

/**
 * Salvar e apagar cálculos (§5.12). O cálculo em si não passa por aqui:
 * a URL carrega o caso, e é ela que se guarda — recalculada no servidor
 * antes de gravar, para que o resultado salvo seja o que o motor
 * produziria, e não o que um formulário adulterado mandasse.
 */
export async function acaoSalvarCalculo(dados: FormData): Promise<void> {
  const u = await alunoAtual();
  const param = String(dados.get('c') ?? '');
  if (!u) redirect(`/entrar?destino=${encodeURIComponent(`/calculadora-penal?c=${param}`)}`);

  const caso = desserializarCaso(param);
  if (!caso) redirect('/calculadora-penal');
  let resultado;
  try {
    resultado = calcular(caso);
  } catch (e) {
    if (e instanceof ErroDeCalculo) redirect(`/calculadora-penal?c=${param}`);
    throw e;
  }
  const portalId = await portalIdAtual();
  await salvarCalculo(u.id, portalId, String(dados.get('titulo') ?? ''), caso, resultado);
  revalidatePath('/calculadora-penal');
  redirect(`/calculadora-penal?c=${serializarCaso(caso)}&salvo=1#meus-calculos`);
}

export async function acaoApagarCalculo(dados: FormData): Promise<void> {
  const u = await alunoAtual();
  if (!u) redirect('/entrar?destino=%2Fcalculadora-penal');
  const id = Number(dados.get('id'));
  if (Number.isInteger(id)) await apagarCalculo(id, u.id);
  revalidatePath('/calculadora-penal');
  const volta = String(dados.get('c') ?? '');
  redirect(volta ? `/calculadora-penal?c=${volta}#meus-calculos` : '/calculadora-penal#meus-calculos');
}

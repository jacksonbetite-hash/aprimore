import { NextResponse } from 'next/server';
import { dominioBase, mascaraDoHost, dominioProprioDoHost } from '../../../lib/portal.ts';
import { buscarPortalPorMascara } from '../../../lib/portal-consultas.ts';
import { buscarPortalPorDominio } from '../../../lib/portal-dominio.ts';

export const dynamic = 'force-dynamic';

/**
 * A pergunta do Caddy antes de emitir um certificado (TLS sob demanda,
 * caddy/Caddyfile): "posso emitir para este domínio?" — `?domain=`.
 *
 * 200 = sim; 403 = não. Sem esta porta, qualquer um que apontasse um DNS
 * para a VPS faria o Caddy pedir certificado em nome dele, e a cota do
 * Let's Encrypt (50 por semana) acabaria nas mãos de um estranho.
 *
 * Sim para: o nosso domínio (e www), o subdomínio de um portal que está
 * no ar (ATIVO ou SUSPENSO — o aluno com licença continua assistindo) e o
 * domínio próprio VERIFICADO de um portal (§5.10, Fase 2). Portal que
 * ainda não pagou não existe na rua — nem para o certificado.
 */
export async function GET(req: Request) {
  const dominio = (new URL(req.url).searchParams.get('domain') ?? '').trim().toLowerCase();
  if (!dominio) return new NextResponse('informe ?domain=', { status: 400 });

  const base = dominioBase();
  if (dominio === base || dominio === `www.${base}`) return sim('plataforma');

  const mascara = mascaraDoHost(dominio, base);
  if (mascara) {
    return (await buscarPortalPorMascara(mascara)) ? sim('portal') : nao();
  }
  const proprio = dominioProprioDoHost(dominio, base);
  if (proprio && (await buscarPortalPorDominio(proprio))) return sim('dominio-proprio');
  return nao();
}

const sim = (motivo: string) => new NextResponse(motivo, { status: 200 });
const nao = () => new NextResponse('dominio nao autorizado', { status: 403 });

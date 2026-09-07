import { alunoAtual } from '../../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../../lib/empresa.ts';
import { progressoPorPessoa, paraCsv } from '../../../../lib/empresa-relatorio.ts';
import { portalIdAtual } from '../../../../lib/portal-consultas.ts';

/**
 * Exportação do acompanhamento (§5.11, etapa 6 — e o art. 18 da LGPD:
 * a empresa é controladora e pode levar os dados dela embora).
 *
 * Rota em vez de ação de servidor porque o navegador precisa BAIXAR um
 * arquivo; e a guarda é a mesma do painel: o portal vem da sessão, e um
 * gestor sem vínculo não passa daqui.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if ((await portalIdAtual()) !== 0) return new Response('não encontrado', { status: 404 });
  const u = await alunoAtual();
  if (!u || (u.papel !== 'gestor' && u.papel !== 'admin')) {
    return new Response('sem permissão', { status: 403 });
  }
  const portal = await portalDaEmpresa(u.id);
  if (!portal) return new Response('sem permissão', { status: 403 });

  const p = new URL(req.url).searchParams;
  const numero = (v: string | null) => (v && Number.isInteger(Number(v)) ? Number(v) : null);
  const linhas = await progressoPorPessoa(portal.id, {
    setorId: numero(p.get('setor')), materiaId: numero(p.get('trilha')), busca: p.get('q') ?? '',
  });

  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(paraCsv(linhas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="acompanhamento-${portal.mascara}-${hoje}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

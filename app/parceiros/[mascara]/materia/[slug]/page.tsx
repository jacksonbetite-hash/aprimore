import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ConteudoMateria from '../../../../materia/[slug]/ConteudoMateria.tsx';
import { buscarMateria } from '../../../../../lib/catalogo.ts';
import { portalAtual, buscarPortalPorMascara } from '../../../../../lib/portal-consultas.ts';
import { PLATAFORMA } from '../../../../../lib/portal.ts';
import { espectadorAtual } from '../../../../../lib/sessao.ts';
import { licencaVigente } from '../../../../../lib/licenca.ts';
import { portalVendeNaVitrine } from '../../../../../lib/vitrine.ts';

export const dynamic = 'force-dynamic';

/**
 * Curso de professor parceiro na NOSSA vitrine (§5.10.2, etapa 5).
 *
 * Só existe na plataforma. O curso aparece se o professor o marcou para a
 * vitrine — ou se quem olha já tem licença dele: tirar o curso da vitrine
 * não pode fechar a porta de quem comprou. A venda, porém, exige as duas
 * coisas: vitrine ligada e portal do professor ATIVO.
 */
async function resolver(mascara: string, slug: string) {
  const aqui = await portalAtual();
  // db/047 — dentro do portal de uma EMPRESA a rota serve o curso DA
  // PLATAFORMA comprado como vaga: só a máscara da plataforma, e só com
  // a licença do próprio colaborador. Sem sessão ou sem vaga: 404.
  const naEmpresa = aqui.tipo === 'EMPRESA';
  if (aqui.id !== 0 && !(naEmpresa && mascara === PLATAFORMA.mascara)) return null;
  const portal = mascara === PLATAFORMA.mascara ? PLATAFORMA : await buscarPortalPorMascara(mascara);
  if (!portal) return null;
  const materia = await buscarMateria(portal.id, slug);
  if (!materia) return null;

  const licenciado = (await espectadorAtual()).licencas.some((l) =>
    l.escopo === 'MATERIA' && Number(l.materiaId) === Number(materia.id) && licencaVigente(l, new Date()));
  if (naEmpresa) return licenciado ? { portal, materia, vende: false } : null;

  const naVitrine = materia.naVitrinePlataforma && materia.status === 'publicado';
  if (!naVitrine && !licenciado) return null;

  return { portal, materia, vende: naVitrine && await portalVendeNaVitrine(portal.id) };
}

export async function generateMetadata(
  { params }: { params: Promise<{ mascara: string; slug: string }> },
): Promise<Metadata> {
  const { mascara, slug } = await params;
  const r = await resolver(mascara, slug);
  return r
    ? { title: `${r.materia.nome} — ${r.portal.nomeExibicao}`, description: r.materia.ementa }
    : { title: 'Curso não encontrado' };
}

export default async function CursoParceiro(
  { params }: { params: Promise<{ mascara: string; slug: string }> },
) {
  const { mascara, slug } = await params;
  const r = await resolver(mascara, slug);
  if (!r) notFound();
  return (
    <ConteudoMateria
      slug={slug} portalDoCurso={r.portal.id} base={`/parceiros/${r.portal.mascara}`}
      parceiro={{ mascara: r.portal.mascara, nome: r.portal.nomeExibicao, vende: r.vende }}
    />
  );
}

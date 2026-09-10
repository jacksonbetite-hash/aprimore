import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ConteudoAula from '../../../../aula/[slug]/ConteudoAula.tsx';
import { buscarAula, buscarMateria } from '../../../../../lib/catalogo.ts';
import { portalAtual, buscarPortalPorMascara } from '../../../../../lib/portal-consultas.ts';
import { PLATAFORMA } from '../../../../../lib/portal.ts';
import { espectadorAtual } from '../../../../../lib/sessao.ts';
import { licencaVigente } from '../../../../../lib/licenca.ts';

export const dynamic = 'force-dynamic';

/** Aula de curso parceiro na nossa vitrine — mesma regra da página do curso. */
async function resolver(mascara: string, slug: string) {
  const aqui = await portalAtual();
  // db/047 — no portal de uma EMPRESA, só o curso da plataforma comprado
  // como vaga, e só com a licença de quem está olhando (ver a página do curso).
  const naEmpresa = aqui.tipo === 'EMPRESA';
  if (aqui.id !== 0 && !(naEmpresa && mascara === PLATAFORMA.mascara)) return null;
  const portal = mascara === PLATAFORMA.mascara ? PLATAFORMA : await buscarPortalPorMascara(mascara);
  if (!portal) return null;
  const aula = await buscarAula(portal.id, slug);
  if (!aula) return null;
  const materia = await buscarMateria(portal.id, aula.materiaSlug);
  if (!materia) return null;

  const licenciado = (await espectadorAtual()).licencas.some((l) =>
    l.escopo === 'MATERIA' && Number(l.materiaId) === Number(materia.id) && licencaVigente(l, new Date()));
  if (naEmpresa) return licenciado ? { portal, aula } : null;
  const naVitrine = materia.naVitrinePlataforma && materia.status === 'publicado';
  if (!naVitrine && !licenciado) return null;
  return { portal, aula };
}

export async function generateMetadata(
  { params }: { params: Promise<{ mascara: string; slug: string }> },
): Promise<Metadata> {
  const { mascara, slug } = await params;
  const r = await resolver(mascara, slug);
  if (!r) return { title: 'Aula não encontrada' };
  return { title: r.aula.titulo, description: r.aula.resumo.split('\n')[0].slice(0, 160) };
}

export default async function AulaParceiro(
  { params }: { params: Promise<{ mascara: string; slug: string }> },
) {
  const { mascara, slug } = await params;
  const r = await resolver(mascara, slug);
  if (!r) notFound();
  const base = `/parceiros/${r.portal.mascara}`;
  return (
    <ConteudoAula slug={slug} portalDoCurso={r.portal.id} base={base}
                  oferta={`${base}/materia/${r.aula.materiaSlug}`} />
  );
}

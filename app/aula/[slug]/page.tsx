import type { Metadata } from 'next';
import ConteudoAula from './ConteudoAula.tsx';
import { buscarAula } from '../../../lib/catalogo.ts';
import { portalIdAtual } from '../../../lib/portal-consultas.ts';
import { exigirPortalAberto } from '../../guarda-empresa.ts';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const aula = await buscarAula(await portalIdAtual(), slug);
  if (!aula) return { title: 'Aula não encontrada' };
  // o resumo é público mesmo com a aula bloqueada — é o motor de SEO (§5.3)
  return { title: aula.titulo, description: aula.resumo.split('\n')[0].slice(0, 160) };
}

/** Aula do próprio portal em que se está. A tela mora em ConteudoAula. */
export default async function PaginaAula({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await exigirPortalAberto(`/aula/${slug}`);
  return <ConteudoAula slug={slug} portalDoCurso={await portalIdAtual()} base="" oferta={null} />;
}

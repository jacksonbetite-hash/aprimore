import type { Metadata } from 'next';
import ConteudoMateria from './ConteudoMateria.tsx';
import { buscarMateria } from '../../../lib/catalogo.ts';
import { portalIdAtual } from '../../../lib/portal-consultas.ts';
import { exigirPortalAberto } from '../../guarda-empresa.ts';

export const dynamic = 'force-dynamic';   // o cadeado depende de quem olha

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const m = await buscarMateria(await portalIdAtual(), slug);
  return m ? { title: m.nome, description: m.ementa } : { title: 'Curso não encontrado' };
}

/** Curso do próprio portal em que se está. A tela mora em ConteudoMateria. */
export default async function PaginaMateria({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await exigirPortalAberto(`/materia/${slug}`);
  return <ConteudoMateria slug={slug} portalDoCurso={await portalIdAtual()} base="" parceiro={null} />;
}

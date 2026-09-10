import { exigirTela } from '../guarda.ts';

/**
 * Tudo sob /admin/cursos é conteúdo (docs/plano-perfis-e-acessos.md, §2.3):
 * quem não publica não entra — o financeiro e o suporte são mandados de
 * volta à visão geral com o aviso, em vez de verem formulários cujas
 * ações recusariam um a um.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirTela('conteudo.agir');
  return children;
}

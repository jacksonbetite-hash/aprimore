import { redirect } from 'next/navigation';
import BarraLateral, { type GrupoLateral } from '../BarraLateral.tsx';
import BotaoSair from '../BotaoSair.tsx';
import { Icone } from '../componentes.tsx';
import { sair } from '../acoes-auth.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalDoProfessor } from '../../lib/professor.ts';
import { ehProfessorDoCatalogo } from '../../lib/professor-catalogo.ts';
import { portalIdAtual, enderecoDoPortal } from '../../lib/portal-consultas.ts';

export const dynamic = 'force-dynamic';

/**
 * O painel do professor — §5.10: autonomia para gerir site, acervo,
 * alunos e faturamento. Vive no site principal (o professor é usuário da
 * plataforma) e abre para quem tem um portal — ou, desde a etapa 5 do
 * plano de perfis, para o professor SEM portal, que publica no catálogo
 * da plataforma: menu menor (sem página, vídeos por aula, alunos), mesmas
 * rotas.
 */
export default async function LayoutProfessor({ children }: { children: React.ReactNode }) {
  if ((await portalIdAtual()) !== 0) redirect('/');
  const u = await alunoAtual();
  if (!u) redirect('/entrar?destino=/professor');
  if (u.papel !== 'professor' && u.papel !== 'admin') redirect('/painel?sem-acesso=1');
  const portal = await portalDoProfessor(u.id);
  if (!portal && !(await ehProfessorDoCatalogo(u.id))) redirect('/para-professores');

  const GRUPOS: GrupoLateral[] = portal
    ? [
        {
          itens: [
            { href: '/professor', icone: 'dashboard', texto: 'Visão geral' },
            { href: '/professor/perfil', icone: 'person', texto: 'Meu perfil' },
          ],
        },
        {
          titulo: 'Meu portal',
          itens: [
            { href: '/professor/site', icone: 'web', texto: 'Minha página' },
            { href: '/professor/cursos', icone: 'menu_book', texto: 'Cursos e aulas' },
            { href: '/professor/videos', icone: 'movie', texto: 'Vídeos das aulas' },
            { href: '/professor/alunos', icone: 'group', texto: 'Alunos' },
            { href: '/professor/financeiro', icone: 'payments', texto: 'Financeiro' },
          ],
        },
        {
          titulo: 'Sai do painel',
          itens: [
            { href: await enderecoDoPortal(portal.mascara), icone: 'public', texto: 'Ver meu portal', saiDoPainel: true },
            { href: '/', icone: 'arrow_forward', texto: 'Site principal', saiDoPainel: true },
          ],
        },
      ]
    : [
        {
          itens: [
            { href: '/professor', icone: 'dashboard', texto: 'Visão geral' },
            { href: '/professor/perfil', icone: 'person', texto: 'Meu perfil' },
          ],
        },
        {
          titulo: 'No catálogo',
          itens: [
            { href: '/professor/cursos', icone: 'menu_book', texto: 'Meus cursos' },
            { href: '/professor/financeiro', icone: 'payments', texto: 'Financeiro' },
          ],
        },
        {
          titulo: 'Sai do painel',
          itens: [
            { href: '/catalogo', icone: 'public', texto: 'Ver o catálogo', saiDoPainel: true },
            { href: '/', icone: 'arrow_forward', texto: 'Site principal', saiDoPainel: true },
          ],
        },
      ];

  return (
    <div className="app">
      <BarraLateral
        titulo={portal ? portal.nomeExibicao : u.nome}
        subtitulo={portal ? 'Painel do professor' : 'Professor do catálogo'}
        grupos={GRUPOS}
        rodape={
          <form action={sair}>
            <button className="item-lateral saida" type="submit">
              <Icone nome="logout" /> Sair
            </button>
          </form>
        }
      />
      <div className="conteudo">
        <BotaoSair className="sair-topo" />
        <div className="miolo">{children}</div>
      </div>
    </div>
  );
}

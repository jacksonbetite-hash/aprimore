import { redirect } from 'next/navigation';
import BarraLateral, { type GrupoLateral } from '../BarraLateral.tsx';
import { Icone } from '../componentes.tsx';
import { sair } from '../acoes-auth.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalDaEmpresa } from '../../lib/empresa.ts';
import { portalIdAtual, enderecoDoPortal } from '../../lib/portal-consultas.ts';

export const dynamic = 'force-dynamic';

/**
 * O painel da empresa — §5.11, etapa 2.
 *
 * Mora no site principal (portal 0), como o do professor: o gestor é
 * usuário da plataforma e opera o portal do cliente de fora dele. Dentro
 * do endereço da empresa só existe colaborador — e é por isso que a
 * primeira linha redireciona quem tentar abrir /empresa lá de dentro.
 *
 * Quem entra: gestor com vínculo em `portal_gestor`, ou admin (suporte).
 * O papel sozinho não basta — é o vínculo que diz QUAL portal, e é ele
 * que as ações reconferem no servidor.
 */
export default async function LayoutEmpresa({ children }: { children: React.ReactNode }) {
  if ((await portalIdAtual()) !== 0) redirect('/');
  const u = await alunoAtual();
  if (!u) redirect('/entrar?destino=/empresa');
  if (u.papel !== 'gestor' && u.papel !== 'admin') redirect('/painel?sem-acesso=1');
  const portal = await portalDaEmpresa(u.id);
  if (!portal) redirect('/empresas');

  const endereco = await enderecoDoPortal(portal.mascara);

  // O menu lista só o que existe (§5.11, etapas 2 a 7). Item morto é pior
  // que menu curto: o gestor clica, cai em nada e passa a desconfiar do resto.
  const GRUPOS: GrupoLateral[] = [
    {
      itens: [
        { href: '/empresa', icone: 'dashboard', texto: 'Visão geral' },
      ],
    },
    {
      titulo: 'Treinamento',
      itens: [
        { href: '/empresa/trilhas', icone: 'route', texto: 'Trilhas e aulas' },
        { href: '/empresa/colaboradores', icone: 'groups', texto: 'Colaboradores' },
        { href: '/empresa/atribuicoes', icone: 'assignment_turned_in', texto: 'Liberar trilhas' },
        { href: '/empresa/acompanhamento', icone: 'monitoring', texto: 'Acompanhamento' },
      ],
    },
    {
      titulo: 'O portal',
      itens: [
        { href: '/empresa/site', icone: 'web', texto: 'Minha página' },
        { href: '/empresa/gestores', icone: 'admin_panel_settings', texto: 'Quem administra' },
        { href: '/empresa/financeiro', icone: 'receipt_long', texto: 'Financeiro' },
        { href: '/empresa/perfil', icone: 'person', texto: 'Meu perfil' },
      ],
    },
    {
      titulo: 'Sai do painel',
      itens: [
        { href: endereco, icone: 'public', texto: 'Ver o portal', saiDoPainel: true },
        { href: '/', icone: 'arrow_forward', texto: 'Site principal', saiDoPainel: true },
      ],
    },
  ];

  return (
    <div className="app">
      <BarraLateral
        titulo={portal.nomeExibicao}
        subtitulo="Painel da empresa"
        grupos={GRUPOS}
        rodape={
          <form action={sair}>
            <button className="item-lateral saida" type="submit">
              <Icone nome="logout" /> Sair
            </button>
          </form>
        }
      />
      <div className="conteudo"><div className="miolo">{children}</div></div>
    </div>
  );
}

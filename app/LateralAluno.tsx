import BarraLateral, { type GrupoLateral } from './BarraLateral.tsx';
import { Icone } from './ui.tsx';
import { sair } from './acoes-auth.ts';
import { daEquipe } from '../lib/permissoes.ts';

/**
 * A barra lateral da área do aluno — a mesma em `/painel` e em `/conta`,
 * que antes mantinham duas cópias divergentes (a de `/conta` nem sequer
 * tinha "Planos" nem o atalho de administração).
 *
 * Catálogo, Biblioteca e Planos são páginas do site público: têm
 * cabeçalho, rodapé e vivem de busca orgânica. Continuam sendo — trazê-las
 * para dentro do painel resolveria o sumiço da barra ao preço de esconder
 * as três páginas que mais precisam ser encontradas. Em vez disso elas vão
 * para um grupo próprio, com marcador de saída: o menu passa a avisar que
 * o destino é fora do painel.
 */
export default function LateralAluno({ papel }: { papel: string }) {
  const grupos: GrupoLateral[] = [
    {
      itens: [
        { href: '/painel', icone: 'dashboard', texto: 'Minha jornada' },
        { href: '/painel#caderno', icone: 'edit_note', texto: 'Caderno de erros' },
        { href: '/conta', icone: 'payments', texto: 'Minha conta' },
      ],
    },
    {
      titulo: 'No site',
      itens: [
        { href: '/catalogo', icone: 'menu_book', texto: 'Catálogo', saiDoPainel: true },
        { href: '/vademecum', icone: 'gavel', texto: 'Biblioteca', saiDoPainel: true },
        { href: '/planos', icone: 'loyalty', texto: 'Planos', saiDoPainel: true },
      ],
    },
  ];

  // Admin, financeiro e suporte: o caminho de volta para a retaguarda.
  if (daEquipe(papel)) {
    grupos.push({
      titulo: 'Equipe',
      itens: [{ href: '/admin', icone: 'settings', texto: 'Administração' }],
    });
  }

  return (
    <BarraLateral
      titulo="Minha Jornada"
      subtitulo={daEquipe(papel) ? 'Equipe da plataforma' : 'Área do aluno'}
      grupos={grupos}
      rodape={
        <form action={sair}>
          <button className="item-lateral saida" type="submit">
            <Icone nome="logout" /> Sair
          </button>
        </form>
      }
    />
  );
}

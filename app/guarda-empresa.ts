import { redirect } from 'next/navigation';
import { portalAtual } from '../lib/portal-consultas.ts';
import { alunoAtual } from '../lib/sessao.ts';

/**
 * A guarda do Portal da Empresa — §5.11.
 *
 * No portal de um professor, a página pública é a vitrine: é dela que vem
 * a venda, e escondê-la seria tirar o produto do ar. No portal de uma
 * empresa, a MESMA página seria o treinamento interno de um cliente
 * exposto na rua — não é falha de estilo, é vazamento de dado do cliente.
 *
 * Por isso a regra mora aqui, num arquivo só, e é chamada no topo de toda
 * rota pública. `Pagina` (app/componentes.tsx) a repete como segunda
 * linha de defesa, para o caso de uma rota nova esquecer de chamá-la: o
 * conteúdo não chega à tela de qualquer jeito.
 *
 * Vive em `app/` e não em `lib/` porque redireciona — depende de
 * `next/navigation`, que o executor de testes do Node não carrega. O
 * domínio da empresa (planos, teto de contas, gestores) fica em
 * `lib/empresa.ts`, que os testes carregam.
 */

/** O portal desta requisição é de empresa? */
export async function noPortalDeEmpresa(): Promise<boolean> {
  return (await portalAtual()).tipo === 'EMPRESA';
}

/**
 * Portal de empresa sem sessão: não há o que mostrar. Devolve `true`
 * quando a página deve parar de renderizar — quem chama decide entre
 * redirecionar e mostrar o portão.
 */
export async function portalFechadoParaVisitante(): Promise<boolean> {
  if (!(await noPortalDeEmpresa())) return false;
  return !(await alunoAtual());
}

/**
 * A guarda na forma que a maioria das rotas quer: manda para o login e
 * não volta. `destino` preserva para onde a pessoa ia, para que ela caia
 * no lugar certo depois de entrar.
 */
export async function exigirPortalAberto(destino?: string): Promise<void> {
  if (await portalFechadoParaVisitante()) {
    redirect(destino ? `/entrar?destino=${encodeURIComponent(destino)}` : '/entrar');
  }
}

/**
 * As rotas que a empresa não tem, COM ou SEM sessão: comprar, ver preço,
 * criar conta sozinho. Numa empresa quem libera acesso é o RH — uma
 * página de planos ali seria oferta ao colaborador de algo que ele não
 * pode contratar, e um cadastro aberto seria qualquer um entrando.
 *
 * `paraOColaborador` diz onde a mesma pergunta é respondida DENTRO do
 * painel. Sem isso, quem clicava em "Planos" caía na home sem explicação
 * nenhuma — a recusa estava certa, o destino é que não dizia nada.
 */
export async function recusarNoPortalDeEmpresa(paraOColaborador = '/'): Promise<void> {
  if (await noPortalDeEmpresa()) redirect(paraOColaborador);
}

/**
 * O contrário da guarda acima: rotas que só existem DENTRO do portal de
 * uma empresa — o painel do colaborador (`/painel/...`).
 *
 * Na plataforma e no portal de um professor as mesmas telas já existem,
 * em endereço próprio e com a casca do site. Quem chega ali por link
 * antigo ou por engano vai para a versão que vale no portal dele, em vez
 * de tomar um 404 — que é o que uma rota inexistente daria.
 */
export async function exigirColaborador(equivalenteFora: string): Promise<void> {
  if (!(await noPortalDeEmpresa())) redirect(equivalenteFora);
  // Segunda linha de defesa: quem guarda a sessão do subpainel é
  // `app/painel/layout.tsx`, e é dele que sai o `destino` — repetido
  // aqui com o mesmo valor para que a ordem de renderização entre layout
  // e página não mude para onde a pessoa vai parar.
  if (!(await alunoAtual())) redirect('/entrar?destino=/painel');
}

import type { Metadata } from 'next';
import ConteudoConta from '../../conta/ConteudoConta.tsx';
import { alunoAtual } from '../../../lib/sessao.ts';
import { exigirColaborador } from '../../guarda-empresa.ts';

export const metadata: Metadata = { title: 'Minha conta' };
export const dynamic = 'force-dynamic';

/**
 * "Minha conta" do colaborador — o mesmo conteúdo de `/conta`, dentro do
 * painel, com o menu da empresa em volta (o layout cuida da casca).
 *
 * O colaborador não compra nada, então as seções de assinatura, pedido e
 * reembolso vêm vazias — e é assim que devem vir: a tela diz "nenhuma
 * compra ainda", que é a verdade, em vez de esconder e deixar a pessoa
 * sem onde conferir. O que ele usa aqui é o alto da tela: nome, e-mail e
 * senha, e os direitos de LGPD no pé.
 */
export default async function ContaDoColaborador() {
  await exigirColaborador('/conta');
  const aluno = (await alunoAtual())!;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Minha conta</h1>
          <p className="suave">Seus dados de acesso e seus direitos sobre eles.</p>
        </div>
      </div>

      <ConteudoConta aluno={aluno} />
    </>
  );
}

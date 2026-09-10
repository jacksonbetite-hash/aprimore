import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import LateralAluno from '../LateralAluno.tsx';
import BotaoSair from '../BotaoSair.tsx';
import ConteudoConta from './ConteudoConta.tsx';
import { alunoAtual } from '../../lib/sessao.ts';
import { noPortalDeEmpresa } from '../guarda-empresa.ts';

export const metadata: Metadata = { title: 'Minha conta' };
export const dynamic = 'force-dynamic';

/**
 * "Minha conta" na plataforma e no portal de um professor — a casca com
 * o menu do aluno em volta de `ConteudoConta`.
 *
 * No portal de uma empresa esta rota não tem tela própria: a mesma conta
 * mora em `/painel/conta`, dentro do painel do colaborador. Sem o
 * redirecionamento, quem clicava em "Minha conta" via o menu inteiro
 * trocar para o da plataforma — com caderno de erros, vade-mécum e
 * planos de venda, nada disso existente na empresa.
 */
export default async function Conta() {
  const aluno = await alunoAtual();
  if (!aluno) redirect('/entrar?destino=/conta');
  if (await noPortalDeEmpresa()) redirect('/painel/conta');

  return (
    <div className="app">
      <LateralAluno papel={aluno.papel} />

      <div className="conteudo">
        <div className="barra-superior">
          <h1>Minha conta</h1>
          <div className="usuario">
            <span className="avatar">{aluno.nome.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
            <strong className="label-md">{aluno.nome.split(' ')[0]}</strong>
            <BotaoSair />
          </div>
        </div>

        <div className="miolo">
          <ConteudoConta aluno={aluno} />
        </div>
      </div>
    </div>
  );
}

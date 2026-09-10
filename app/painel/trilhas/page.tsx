import type { Metadata } from 'next';
import FiltroCursos from '../../catalogo/FiltroCursos.tsx';
import type { CursoCartao } from '../../catalogo/CartaoCurso.tsx';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalAtual } from '../../../lib/portal-consultas.ts';
import { cursosDoPortal } from '../../../lib/catalogo-cartoes.ts';
import { exigirColaborador } from '../../guarda-empresa.ts';

export const metadata: Metadata = { title: 'Todas as trilhas' };
export const dynamic = 'force-dynamic';

/**
 * "Todas as trilhas" — o acervo inteiro do portal da empresa, DENTRO do
 * painel.
 *
 * É a mesma tela que `/catalogo` mostrava, e é de propósito: no portal de
 * uma empresa não existe um segundo acervo para o "Catálogo" mostrar (a
 * vitrine compartilhada é proibida por CHECK no banco, §5.11). O que
 * mudou é só a casca — antes ela vinha com o cabeçalho e o rodapé do
 * site, e a barra lateral sumia no caminho. `/catalogo` agora redireciona
 * para cá.
 *
 * O que a distingue de "Minhas trilhas": lá está o que a empresa mandou
 * fazer, na ordem do prazo; aqui está tudo o que existe, para folhear. O
 * cartão de quem já tem a trilha liberada mostra o andamento.
 */
export default async function TodasAsTrilhas() {
  await exigirColaborador('/catalogo');
  const [portal, aluno] = await Promise.all([portalAtual(), alunoAtual()]);
  const { areas, cursos } = await cursosDoPortal(portal, aluno?.id ?? null);

  const liberadas = cursos.filter((c) => c.progresso).length;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Todas as trilhas</h1>
          <p className="suave">
            O acervo de treinamento da {portal.nomeExibicao}.{' '}
            {liberadas > 0
              ? `${liberadas === 1 ? '1 trilha está liberada' : `${liberadas} trilhas estão liberadas`} para você — as demais dependem do setor responsável.`
              : 'Quem libera o acesso é o setor responsável pelo treinamento.'}
          </p>
        </div>
      </div>

      {cursos.length === 0 ? (
        <p className="vazio">
          Nenhuma trilha publicada ainda.
          {portal.personalizacao.contato && <> Fale com {portal.personalizacao.contato}.</>}
        </p>
      ) : (
        <FiltroCursos
          areas={areas}
          cursos={cursos as CursoCartao[]}
          substantivo={{ um: 'trilha', varios: 'trilhas', onde: 'no portal', feminino: true }}
        />
      )}
    </>
  );
}

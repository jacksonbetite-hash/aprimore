import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../ui.tsx';
import FormAtribuir from './FormAtribuir.tsx';
import { acaoAtribuir, acaoRemoverAtribuicao } from '../acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';
import {
  listarAtribuicoes, listarSetores, listarColaboradores,
} from '../../../lib/empresa-equipe.ts';
import { listarMaterias } from '../../../lib/admin-cursos.ts';

export const metadata: Metadata = { title: 'Liberar trilhas — Painel da empresa' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

/**
 * Liberar trilhas — §5.11, etapa 4.
 *
 * Aqui mora a distinção que o discovery insiste em manter visível: a
 * ATRIBUIÇÃO é a intenção do RH ("o setor Vendas faz LGPD até 30/10") e a
 * LICENÇA é o acesso de cada pessoa. Atribuir ao setor alcança quem
 * entrar depois; por isso a coluna "pessoas" mostra quantas já receberam
 * de fato, e não uma promessa.
 */
export default async function AtribuicoesDaEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const [atribuicoes, setores, pessoas, trilhas] = await Promise.all([
    listarAtribuicoes(portal.id), listarSetores(portal.id),
    listarColaboradores(portal.id), listarMaterias(portal.id),
  ]);
  const ativas = pessoas.filter((p) => p.statusConta !== 'ENCERRADA');
  const publicadas = trilhas.filter((t) => t.status === 'publicado');
  const hoje = new Date();

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Liberar trilhas</h1>
          <p className="suave">
            {atribuicoes.length} atribuição(ões) · {ativas.length} pessoa(s) com acesso ao portal
          </p>
        </div>
      </div>

      <p className="aviso" style={{ marginBottom: 24 }}>
        <strong>Atribuir é o que libera o conteúdo.</strong> Cadastrar dá conta; a trilha só
        aparece para quem a recebeu aqui. Atribuindo a um <strong>setor</strong>, quem entrar
        nele depois recebe automaticamente — é o caminho recomendado para treinamento
        obrigatório.
      </p>

      {trilhas.length === 0 && (
        <p className="alerta alerta-erro">
          Você ainda não tem trilha nenhuma. Comece em <Link href="/empresa/trilhas">Trilhas e aulas</Link>.
        </p>
      )}
      {trilhas.length > 0 && publicadas.length === 0 && (
        <p className="alerta alerta-erro">
          <strong>Nenhuma trilha está publicada.</strong> Dá para atribuir desde já, mas
          ninguém vê o conteúdo antes de você publicar a trilha e ao menos uma aula.
        </p>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>
          <Icone nome="assignment_turned_in" /> Quem tem o quê
        </h2>
        <table className="tabela">
          <thead>
            <tr><th>Trilha</th><th>Para quem</th><th>Pessoas</th><th>Obrigatória</th><th>Prazo</th><th>Liberada em</th><th></th></tr>
          </thead>
          <tbody>
            {atribuicoes.map((a) => {
              const atrasada = a.prazoEm && new Date(a.prazoEm) < hoje;
              return (
                <tr key={a.id}>
                  <td><strong>{a.materiaNome}</strong></td>
                  <td>
                    {a.setorNome
                      ? <><Icone nome="account_tree" tamanho={16} /> setor {a.setorNome}</>
                      : <><Icone nome="person" tamanho={16} /> {a.alvoNome}</>}
                  </td>
                  <td className="apertado">{a.pessoas}</td>
                  <td>{a.obrigatoria
                    ? <span className="chip chip-sm chip-primaria">obrigatória</span>
                    : <span className="suave">opcional</span>}</td>
                  <td className="apertado">
                    {a.prazoEm ? DATA(a.prazoEm) : <span className="suave">sem prazo</span>}
                    {atrasada && <><br /><span className="chip chip-sm chip-erro">vencido</span></>}
                  </td>
                  <td className="apertado suave">{DATA(a.criadaEm)}</td>
                  <td className="apertado">
                    <form action={acaoRemoverAtribuicao}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn btn-contorno btn-sm" type="submit">Tirar</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {atribuicoes.length === 0 && (
              <tr><td colSpan={7}><div className="vazio">
                Ninguém recebeu trilha ainda. Libere a primeira no formulário abaixo.
              </div></td></tr>
            )}
          </tbody>
        </table>
        <p className="caption suave" style={{ marginTop: 12 }}>
          Tirar a atribuição cancela o acesso das pessoas que a receberam por ela — e só
          delas. Quem tem a mesma trilha por outro caminho (o setor, ou uma atribuição
          nominal) continua com acesso.
        </p>
      </div>

      {trilhas.length > 0 && (ativas.length > 0 || setores.length > 0) && (
        <div className="cartao" style={{ marginBottom: 0 }}>
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Liberar uma trilha</h2>
          <FormAtribuir acao={acaoAtribuir} trilhas={trilhas} setores={setores} pessoas={ativas} />
        </div>
      )}
      {trilhas.length > 0 && ativas.length === 0 && setores.length === 0 && (
        <p className="alerta alerta-erro">
          Não há ninguém nem setor nenhum para receber a trilha. Comece em{' '}
          <Link href="/empresa/colaboradores">Colaboradores</Link>.
        </p>
      )}
    </>
  );
}

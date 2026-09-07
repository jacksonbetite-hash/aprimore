import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone, BotaoIcone, EdicaoNaLinha } from '../../ui.tsx';
import FormColaborador, { FormSetor } from './FormColaborador.tsx';
import FormConvite from './FormConvite.tsx';
import FormImportar from './FormImportar.tsx';
import EdicaoColaborador from './EdicaoColaborador.tsx';
import {
  acaoCadastrarColaborador, acaoEditarColaborador, acaoDesativarColaborador,
  acaoReativarColaborador, acaoSalvarSetor, acaoEditarSetorLinha, acaoExcluirSetor,
  acaoConvidar, acaoCancelarConvite, acaoImportar,
} from '../acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa, ocupacaoDeContas } from '../../../lib/empresa.ts';
import {
  listarColaboradores, listarSetores, listarConvites,
} from '../../../lib/empresa-equipe.ts';
import { listarMaterias } from '../../../lib/admin-cursos.ts';

export const metadata: Metadata = { title: 'Colaboradores — Painel da empresa' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const CHIP_CONVITE: Record<string, string> = {
  pendente: 'chip-terciaria', aceito: 'chip-secundaria',
  expirado: 'chip-neutra', cancelado: 'chip-neutra',
};

/**
 * A equipe — §5.11, etapa 4.
 *
 * A tela repete, em três lugares, a distinção que o RH mais confunde:
 * **cadastrar não é liberar**. Aqui a pessoa ganha conta; a trilha ela
 * ganha em "Liberar trilhas" — ou junto, se o setor dela já tiver
 * atribuição, e é por isso que o setor aparece antes do cadastro.
 */
export default async function ColaboradoresDaEmpresa(
  { searchParams }: { searchParams: Promise<{ q?: string; setor?: string }> },
) {
  const { q = '', setor = '' } = await searchParams;
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const setorId = setor ? Number(setor) : null;
  const [pessoas, setores, convites, trilhas, ocupacao] = await Promise.all([
    listarColaboradores(portal.id, q, setorId), listarSetores(portal.id),
    listarConvites(portal.id), listarMaterias(portal.id), ocupacaoDeContas(portal.id),
  ]);
  const ativas = pessoas.filter((p) => p.statusConta !== 'ENCERRADA');
  const pendentes = convites.filter((c) => c.situacao === 'pendente');

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Colaboradores</h1>
          <p className="suave">
            {ocupacao.usadas} pessoa(s) com acesso
            {ocupacao.limite !== null && ` de ${ocupacao.limite} do plano`}
            {pendentes.length > 0 && ` · ${pendentes.length} convite(s) pendente(s)`}
          </p>
        </div>
      </div>

      <p className="aviso" style={{ marginBottom: 24 }}>
        <strong>Cadastrar dá conta; liberar trilha é outro passo.</strong> Quem entra sem
        trilha atribuída vê o portal vazio. Se o setor da pessoa já tem trilha atribuída, ela
        recebe na hora do cadastro — senão, use <Link href="/empresa/atribuicoes">Liberar trilhas</Link>.
        Pela LGPD, a sua empresa é a <strong>controladora</strong> desses dados.
      </p>

      {ocupacao.cheio && (
        <p className="alerta alerta-erro">
          <strong>O plano está cheio</strong> ({ocupacao.usadas} de {ocupacao.limite}). Desative
          quem saiu da empresa, ou mude de plano em <Link href="/empresa/financeiro">Financeiro</Link>.
        </p>
      )}

      {/* ---------- Setores ---------- */}
      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="account_tree" /> Setores
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          O setor é o atalho do RH: atribuir uma trilha ao setor libera para todo mundo dele —
          inclusive para quem entrar depois.
        </p>
        <FormSetor acao={acaoSalvarSetor} />
        <table className="tabela" style={{ marginTop: 16 }}>
          <thead><tr><th>Setor</th><th>Ordem</th><th>Pessoas</th><th>Ações</th></tr></thead>
          <tbody>
            {setores.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.nome}</strong></td>
                <td className="apertado">{s.ordem}</td>
                <td>{s.pessoas || <span className="suave">nenhuma</span>}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoNaLinha acao={acaoEditarSetorLinha} nome={s.nome} ordem={s.ordem}
                                   oQue={`o setor ${s.nome}`}>
                      <input type="hidden" name="id" value={s.id} />
                    </EdicaoNaLinha>
                    {s.pessoas === 0 && (
                      <form action={acaoExcluirSetor}>
                        <input type="hidden" name="id" value={s.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {setores.length === 0 && <tr><td colSpan={4}><div className="vazio">Nenhum setor ainda. Sem setor, a atribuição é pessoa a pessoa.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {/* ---------- Quem já tem acesso ---------- */}
      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="groups" /> Quem tem acesso ({ativas.length})
        </h2>
        <form className="form-linha" method="get" style={{ margin: '12px 0 20px' }}>
          <div className="campos">
            <label>
              Buscar
              <input name="q" defaultValue={q} placeholder="nome, e-mail ou matrícula" />
            </label>
            <label>
              Setor
              <select name="setor" defaultValue={setor}>
                <option value="">todos</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </label>
            <button className="btn btn-contorno" type="submit">Filtrar</button>
          </div>
        </form>
        <table className="tabela">
          <thead>
            <tr><th>Pessoa</th><th>Setor</th><th>Matrícula</th><th>Trilhas</th><th>Último acesso</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {pessoas.map((p) => (
              <tr key={p.id} style={p.statusConta === 'ENCERRADA' ? { opacity: 0.55 } : undefined}>
                <td>
                  <strong>{p.nome}</strong>
                  {p.statusConta === 'ENCERRADA' && <span className="chip chip-sm chip-neutra" style={{ marginLeft: 8 }}>desativada</span>}
                  <br /><span className="suave">{p.email}</span>
                </td>
                <td>{p.setorNome ?? <span className="suave">sem setor</span>}</td>
                <td className="apertado">{p.matricula ?? '—'}</td>
                <td className="apertado">
                  {p.trilhas || <span className="suave">nenhuma</span>}
                  {p.concluidas > 0 && <span className="chip chip-sm chip-secundaria" style={{ marginLeft: 6 }}>{p.concluidas} concluída(s)</span>}
                </td>
                <td className="apertado suave">{DATA(p.ultimoLoginEm)}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoColaborador acao={acaoEditarColaborador} pessoa={p} setores={setores} />
                    {p.statusConta === 'ENCERRADA' ? (
                      <form action={acaoReativarColaborador}>
                        <input type="hidden" name="id" value={p.id} />
                        <BotaoIcone icone="person_add" rotulo="Reativar" variante="primario" />
                      </form>
                    ) : (
                      <form action={acaoDesativarColaborador}>
                        <input type="hidden" name="id" value={p.id} />
                        <BotaoIcone icone="person_off" rotulo="Desativar (libera a vaga do plano)" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pessoas.length === 0 && (
              <tr><td colSpan={6}><div className="vazio">
                {q || setor ? 'Ninguém com esse filtro.' : 'Ninguém cadastrado ainda — comece pelo convite, logo abaixo.'}
              </div></td></tr>
            )}
          </tbody>
        </table>
        <p className="caption suave" style={{ marginTop: 12 }}>
          Desativar tira o acesso na hora e devolve a vaga ao plano. O progresso fica guardado:
          quem voltar, volta de onde parou. Para trocar o setor de alguém, use o lápis — as
          trilhas do setor antigo saem e as do novo entram.
        </p>
      </div>

      {/* ---------- Convites ---------- */}
      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="link" /> Convidar por link
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          O convite é um link que você copia e manda por onde quiser (e-mail, chat, crachá
          digital). Vale 7 dias, serve só para aquele e-mail, e é a pessoa que escolhe a
          própria senha. Convite pendente já ocupa vaga no plano.
        </p>
        <FormConvite acao={acaoConvidar} setores={setores} trilhas={trilhas} />

        {convites.length > 0 && (
          <table className="tabela" style={{ marginTop: 20 }}>
            <thead><tr><th>Convidado</th><th>Setor</th><th>Trilhas</th><th>Criado</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {convites.slice(0, 30).map((c) => (
                <tr key={c.id}>
                  <td>{c.nome ?? <span className="suave">sem nome</span>}<br /><span className="suave">{c.email}</span></td>
                  <td>{c.setorNome ?? <span className="suave">—</span>}</td>
                  <td className="apertado">{c.trilhas || <span className="suave">só as do setor</span>}</td>
                  <td className="apertado suave">{DATA(c.criadoEm)}</td>
                  <td>
                    <span className={`chip chip-sm ${CHIP_CONVITE[c.situacao]}`}>{c.situacao}</span>
                    {c.situacao === 'pendente' && <><br /><span className="caption suave">expira {DATA(c.expiraEm)}</span></>}
                  </td>
                  <td className="apertado">
                    {c.situacao === 'pendente' && (
                      <form action={acaoCancelarConvite}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="btn btn-contorno btn-sm" type="submit">Cancelar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---------- Importação ---------- */}
      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="upload_file" /> Importar a equipe de uma vez
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Cole as linhas no formato <code>nome;e-mail;setor</code> — uma por pessoa. Cada linha
          boa vira um convite por link; as com problema aparecem listadas, com o motivo, e o
          resto da importação segue.
        </p>
        <FormImportar acao={acaoImportar} trilhas={trilhas} />
      </div>

      {/* ---------- Cadastro individual ---------- */}
      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="person_add" /> Cadastrar com senha provisória
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Para quem não tem e-mail corporativo à mão. Você define a senha, passa por um canal
          seguro e pede que a pessoa troque em Minha conta.
        </p>
        <FormColaborador acao={acaoCadastrarColaborador} setores={setores} />
      </div>
    </>
  );
}

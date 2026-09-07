import type { Metadata } from 'next';
import FormConceder from './FormConceder.tsx';
import { BotaoIcone } from '../../ui.tsx';
import { acaoConcederLicenca, acaoEstender, acaoSuspender } from '../acoes.ts';
import { listarLicencas, listarAlunos, listarMateriasSimples } from '../../../lib/admin.ts';

export const metadata: Metadata = { title: 'Licenças — Administração' };

const DATA = (d: Date) => new Date(d).toLocaleDateString('pt-BR');

export default async function Licencas() {
  const [licencas, alunos, materias] = await Promise.all([
    listarLicencas(), listarAlunos('', 200), listarMateriasSimples(),
  ]);

  return (
    <>
      <h1 className="headline-lg">Licenças</h1>
      <p className="suave">
        Conceder cortesia, estender e suspender. Toda ação fica registrada na auditoria.
      </p>

      <div className="cartao">
        <h2 className="headline-md">Conceder cortesia</h2>
        <FormConceder acao={acaoConcederLicenca} alunos={alunos} materias={materias} />
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md">Licenças emitidas</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Aluno</th><th>Escopo</th><th>Origem</th><th>Vigência</th>
              <th>Situação</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {licencas.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.usuarioNome}</strong>
                  <br /><span className="suave">{l.usuarioEmail}</span>
                </td>
                <td>{l.escopo === 'CATALOGO' ? 'Passe completo' : l.materiaNome}</td>
                <td><span className="chip chip-neutra">{l.origem.toLowerCase()}</span></td>
                <td className="suave apertado">{DATA(l.inicioEm)} → {DATA(l.fimEm)}</td>
                <td>
                  <span className={`chip ${l.vigente ? 'chip-secundaria' : 'chip-neutra'}`}>
                    {l.vigente ? 'vigente' : l.status.toLowerCase()}
                  </span>
                </td>
                <td>
                  <div className="acoes-linha">
                    <form action={acaoEstender}>
                      <input type="hidden" name="licencaId" value={l.id} />
                      <input type="hidden" name="dias" value="30" />
                      <BotaoIcone icone="more_time" rotulo="Estender por 30 dias" />
                    </form>
                    <form action={acaoSuspender}>
                      <input type="hidden" name="licencaId" value={l.id} />
                      <input type="hidden" name="status" value={l.status === 'SUSPENSA' ? 'ATIVA' : 'SUSPENSA'} />
                      <BotaoIcone
                        icone={l.status === 'SUSPENSA' ? 'replay' : 'block'}
                        rotulo={l.status === 'SUSPENSA' ? 'Reativar' : 'Suspender'}
                        variante={l.status === 'SUSPENSA' ? 'contorno' : 'perigo'} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

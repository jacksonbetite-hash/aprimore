import Link from 'next/link';
import type { Metadata } from 'next';
import { FormPortal, FormPlano, FormProfessor } from './Formularios.tsx';
import { BotaoIcone, LinkIcone } from '../../ui.tsx';
import { acaoCriarPortal, acaoSalvarPlano, acaoCriarProfessor, acaoStatusPortal } from './acoes.ts';
import { listarPortais, listarPlanos, listarProfessores } from '../../../lib/admin-portais.ts';
import { brl } from '../../../lib/precos.ts';
import { permissoesDaTela } from '../guarda.ts';

export const metadata: Metadata = { title: 'Portais de professor — Administração' };
export const dynamic = 'force-dynamic';

const CHIP: Record<string, string> = {
  ATIVO: 'chip-secundaria', RASCUNHO: 'chip-neutra',
  SUSPENSO: 'chip-terciaria', ENCERRADO: 'chip-erro',
};

export default async function Portais() {
  const [portais, planos, professores, pode] = await Promise.all([
    listarPortais(), listarPlanos(), listarProfessores(),
    permissoesDaTela('cadastros.agir', 'financeiro.agir'),
  ]);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Portais de professor</h1>
          <p className="suave">
            O modelo white-label do §5.10: o professor opera site, acervo, base de alunos e
            faturamento próprios sobre a nossa infraestrutura. {portais.length} portal(is).
          </p>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Portais</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Portal</th><th>Responsável</th><th>Plano</th>
              <th>Acervo</th><th>Situação</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {portais.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/portais/${p.id}`}
                    style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                    {p.nomeExibicao}
                  </Link>
                  {/* §5.11 — sem esta etiqueta, a lista mistura dois
                      produtos que se administram de forma diferente: um
                      vende e tem repasse, o outro só paga mensalidade. */}
                  <span className={`chip chip-sm ${p.tipo === 'EMPRESA' ? 'chip-terciaria' : 'chip-neutra'}`}
                        style={{ marginLeft: 8 }}>
                    {p.tipo === 'EMPRESA' ? 'empresa' : 'professor'}
                  </span>
                  <br /><span className="suave mono">{p.mascara}.aprimoreosaber.com.br</span>
                </td>
                <td>
                  {p.professorNome}
                  <br /><span className="suave">{p.professorEmail}</span>
                </td>
                <td>{p.planoNome ?? <span className="suave">—</span>}</td>
                <td className="apertado">
                  {p.tipo === 'EMPRESA'
                    ? <>{p.materias} trilha(s) · {p.alunos}
                        {p.limiteContas !== null && <> de {p.limiteContas}</>} pessoa(s)</>
                    : <>{p.materias} curso(s) · {p.alunos} aluno(s)</>}
                </td>
                <td>
                  <span className={`chip chip-sm ${CHIP[p.status]}`}>{p.status.toLowerCase()}</span>
                  {!p.contratoAceito && (
                    <><br /><span className="chip chip-sm chip-erro">sem contrato aceito</span></>
                  )}
                </td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/admin/portais/${p.id}`} icone="edit"
                               rotulo="Abrir o portal" />
                    <LinkIcone href={`/admin/cursos?portal=${p.id}`} icone="menu_book"
                               rotulo="Acervo do portal" />
                    {!pode['cadastros.agir'] ? null : p.status === 'ATIVO' ? (
                      <form action={acaoStatusPortal}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="SUSPENSO" />
                        <BotaoIcone icone="block" rotulo="Suspender" variante="perigo" />
                      </form>
                    ) : p.status !== 'ENCERRADO' && (
                      <form action={acaoStatusPortal}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="ATIVO" />
                        <BotaoIcone icone="visibility" variante="primario"
                          desabilitado={!p.contratoAceito}
                          rotulo={p.contratoAceito ? 'Publicar' : 'Publicar (falta o contrato aceito)'} />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {portais.length === 0 && (
              <tr><td colSpan={6}><div className="vazio">Nenhum portal ainda.</div></td></tr>
            )}
          </tbody>
        </table>
        <p className="dica" style={{ marginTop: '.8rem' }}>
          <strong>Suspender não corta o aluno.</strong> O portal sai do ar para visitantes, mas
          quem tem licença vigente continua assistindo até o fim da vigência (§5.10) — por isso a
          suspensão mexe no portal, e nunca na licença.
        </p>
      </div>

      {pode['cadastros.agir'] && <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Novo portal</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Nasce em rascunho. Só vai ao ar depois do contrato registrado e aceito (§5.6).
        </p>
        {professores.length === 0 || planos.length === 0 ? (
          <div className="vazio">
            {professores.length === 0 && 'Cadastre um professor abaixo. '}
            {planos.length === 0 && 'Crie um plano comercial abaixo.'}
          </div>
        ) : (
          <FormPortal acao={acaoCriarPortal} planos={planos} professores={professores} />
        )}
      </div>}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Professores</h2>
        {pode['cadastros.agir'] && <FormProfessor acao={acaoCriarProfessor} />}
        <table className="tabela" style={{ marginTop: 16 }}>
          <thead><tr><th>Professor</th><th>E-mail</th><th>Portais</th></tr></thead>
          <tbody>
            {professores.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.nome}</strong></td>
                <td className="suave">{p.email}</td>
                <td>{p.portais || <span className="suave">nenhum</span>}</td>
              </tr>
            ))}
            {professores.length === 0 && (
              <tr><td colSpan={3}><div className="vazio">Nenhum professor cadastrado.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Planos comerciais</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Licença mensal fixa + percentual sobre as vendas — duas linhas na mesma fatura (§5.10).
        </p>
        <table className="tabela" style={{ marginBottom: 24 }}>
          <thead>
            <tr>
              <th>Plano</th><th>Licença/mês</th><th>Percentual</th>
              <th>Cotas</th><th>Excedente</th><th>Em uso</th>
            </tr>
          </thead>
          <tbody>
            {planos.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.nome}</strong>
                  {!p.ativo && <span className="chip chip-sm chip-neutra" style={{ marginLeft: 8 }}>fora de oferta</span>}
                </td>
                <td>{brl(p.licencaMensalCentavos)}</td>
                <td className="apertado">
                  {p.percentualBase}% <span className="suave">+{p.acrescimoIndicacaoPp} p.p. por indicação</span>
                </td>
                <td className="apertado">{p.gbArmazenamento} GB · {p.gbBandaMes} GB/mês</td>
                <td className="apertado">
                  {brl(p.centavosPorGbExcedente)}/GB
                  {p.centavosDominioProprio != null && (
                    <span className="suave"> · domínio {brl(p.centavosDominioProprio)}/mês</span>
                  )}
                </td>
                <td>{p.portais || <span className="suave">nenhum</span>}</td>
              </tr>
            ))}
            {planos.length === 0 && (
              <tr><td colSpan={6}><div className="vazio">Nenhum plano ainda.</div></td></tr>
            )}
          </tbody>
        </table>
        {pode['financeiro.agir'] && <>
          <h3 className="headline-md" style={{ marginBottom: 16 }}>Novo plano</h3>
          <FormPlano acao={acaoSalvarPlano} />
        </>}
      </div>
    </>
  );
}

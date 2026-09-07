import type { Metadata } from 'next';
import { Icone } from '../../ui.tsx';
import FormGestor from './FormGestor.tsx';
import { acaoAdicionarGestor, acaoRemoverGestor } from '../acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa, listarGestores } from '../../../lib/empresa.ts';

export const metadata: Metadata = { title: 'Quem administra — Painel da empresa' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : 'nunca entrou');

/**
 * Quem administra o portal — §5.11, etapa 2.
 *
 * A diferença que justifica esta tela existir: o professor é um, a
 * empresa tem RH. Sem ela, o portal ficaria refém de uma pessoa — quem
 * assinou o contrato —, e férias ou desligamento dessa pessoa travariam
 * o treinamento de todo mundo.
 *
 * Duas regras aparecem na tela porque o gestor precisa entendê-las, não
 * só obedecê-las:
 *  - só o responsável pelo contrato mexe aqui;
 *  - o responsável não se remove, porque é quem responde pela fatura.
 */
export default async function GestoresDaEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const gestores = await listarGestores(portal.id);
  const podeMexer = portal.papelNoPortal === 'RESPONSAVEL' || u.papel === 'admin';

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Quem administra</h1>
          <p className="suave">
            {gestores.length === 1
              ? 'Só você administra este portal.'
              : `${gestores.length} pessoas administram este portal.`}
          </p>
        </div>
      </div>

      <p className="aviso" style={{ marginBottom: 24 }}>
        <strong>Quem administra vê os dados de toda a equipe</strong> — nome, e-mail,
        progresso e notas. Pela LGPD a empresa é a controladora dessa base: dê acesso a
        quem precisa dele para o trabalho, e tire quando a pessoa mudar de função.
      </p>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <table className="tabela">
          <thead>
            <tr><th>Pessoa</th><th>Papel</th><th>Desde</th><th>Último acesso</th><th></th></tr>
          </thead>
          <tbody>
            {gestores.map((g) => (
              <tr key={g.id}>
                <td>{g.nome}<br /><span className="suave">{g.email}</span></td>
                <td>
                  <span className={`chip chip-sm ${g.papelNoPortal === 'RESPONSAVEL' ? 'chip-primaria' : 'chip-neutra'}`}>
                    {g.papelNoPortal === 'RESPONSAVEL' ? 'responsável' : 'gestor'}
                  </span>
                </td>
                <td className="suave apertado">{DATA(g.criadoEm)}</td>
                <td className="suave apertado">{DATA(g.ultimoLoginEm)}</td>
                <td className="apertado">
                  {podeMexer && g.papelNoPortal !== 'RESPONSAVEL' && (
                    <form action={acaoRemoverGestor}>
                      <input type="hidden" name="usuarioId" value={g.id} />
                      <button className="btn btn-contorno btn-sm" type="submit">
                        Tirar acesso
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="caption suave" style={{ marginTop: 12 }}>
          O responsável pelo contrato não pode ser removido: é quem responde pela fatura.
          Para trocar quem responde pela empresa, fale com o suporte.
        </p>
      </div>

      {podeMexer ? (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>
            <Icone nome="person_add" /> Dar acesso a mais alguém do RH
          </h2>
          <p className="caption suave" style={{ marginBottom: 16 }}>
            A conta é criada na hora, com a senha que você definir. Passe-a por um canal
            seguro e peça que a pessoa troque no primeiro acesso.
          </p>
          <FormGestor acao={acaoAdicionarGestor} />
        </div>
      ) : (
        <p className="suave">
          Só quem assinou o contrato pode mudar quem administra o portal.
        </p>
      )}
    </>
  );
}

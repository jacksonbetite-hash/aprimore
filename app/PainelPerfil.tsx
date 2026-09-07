import FormPerfil from './FormPerfil.tsx';
import { acaoSalvarPerfil } from './acoes-perfil.ts';
import { alunoAtual } from '../lib/sessao.ts';
import { portalIdAtual } from '../lib/portal-consultas.ts';
import { lerPerfil } from '../lib/perfil.ts';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const PAPEL: Record<string, string> = {
  admin: 'Administrador da plataforma',
  professor: 'Professor com portal próprio',
  revisor: 'Revisor de conteúdo',
  gestor: 'Gestor do portal da empresa',
  aluno: 'Aluno',
};

/**
 * O miolo da tela de perfil, um só para os dois painéis: `/admin/perfil`
 * e `/professor/perfil` só emprestam a barra lateral do layout de cada
 * um. Duplicar a tela para trocar o menu era como as três barras laterais
 * divergentes de antes (ver BarraLateral) começaram.
 */
export default async function PainelPerfil() {
  const u = (await alunoAtual())!;
  const perfil = (await lerPerfil(u.id, await portalIdAtual()))!;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Meu perfil</h1>
          <p className="suave">
            {PAPEL[perfil.papel] ?? perfil.papel} · conta criada em {DATA(perfil.criadoEm)} ·
            último acesso em {DATA(perfil.ultimoLoginEm)}
          </p>
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Seus dados</h2>
        <FormPerfil acao={acaoSalvarPerfil} nome={perfil.nome} email={perfil.email}
                    temSenha={perfil.temSenha} />
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 8 }}>O que não se muda aqui</h2>
        <p className="suave">
          <strong>Papel e situação da conta</strong> são da retaguarda: uma tela de perfil que
          promovesse o próprio dono seria um buraco de segurança, não um recurso.
          {perfil.papel === 'professor' && (
            <> O nome público do seu portal, a foto e a cor ficam em <strong>Minha página</strong>;
            aqui é a sua conta de acesso.</>
          )}
          {perfil.papel === 'gestor' && (
            <> A marca, a cor e o endereço do portal da empresa ficam em <strong>Minha página</strong>;
            aqui é a sua conta de acesso.</>
          )}
        </p>
      </div>
    </>
  );
}

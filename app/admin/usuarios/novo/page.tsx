import Link from 'next/link';
import type { Metadata } from 'next';
import FormNovoUsuario from './FormNovoUsuario.tsx';
import { acaoCriarUsuario } from '../acoes.ts';
import { exigirTela } from '../../guarda.ts';
import { portaisParaCadastro, setoresPorPortal } from '../../../../lib/admin-usuarios.ts';
import { pode } from '../../../../lib/permissoes.ts';

export const metadata: Metadata = { title: 'Novo usuário — Administração' };
export const dynamic = 'force-dynamic';

export default async function NovoUsuario() {
  const u = await exigirTela('cadastros.agir');
  const [portais, setores] = await Promise.all([portaisParaCadastro(), setoresPorPortal()]);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Novo usuário</h1>
          <p className="suave">
            Aluno, colaborador, professor, gestor de empresa ou alguém da equipe. Um portal com
            endereço próprio se cria em{' '}
            <Link href="/admin/portais" style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>Portais</Link>.
          </p>
        </div>
      </div>

      <div className="cartao">
        <FormNovoUsuario acao={acaoCriarUsuario} portais={portais} setores={setores}
                         podeCriarEquipe={pode(u.papel, 'equipe.agir')} />
      </div>
    </>
  );
}

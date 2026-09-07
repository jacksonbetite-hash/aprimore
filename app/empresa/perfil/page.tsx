import type { Metadata } from 'next';
import PainelPerfil from '../../PainelPerfil.tsx';

export const metadata: Metadata = { title: 'Meu perfil — Painel da empresa' };
export const dynamic = 'force-dynamic';

/** A conta de acesso de quem administra. A marca do portal fica em Minha página. */
export default function PerfilDaEmpresa() {
  return <PainelPerfil />;
}

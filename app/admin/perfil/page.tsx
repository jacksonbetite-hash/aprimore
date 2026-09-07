import type { Metadata } from 'next';
import PainelPerfil from '../../PainelPerfil.tsx';

export const metadata: Metadata = { title: 'Meu perfil — Administração' };
export const dynamic = 'force-dynamic';

/** A guarda é a do layout de /admin: aqui só se empresta a barra lateral. */
export default function PerfilAdmin() {
  return <PainelPerfil />;
}

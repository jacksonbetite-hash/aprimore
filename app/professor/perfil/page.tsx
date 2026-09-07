import type { Metadata } from 'next';
import PainelPerfil from '../../PainelPerfil.tsx';

export const metadata: Metadata = { title: 'Meu perfil — Painel do professor' };
export const dynamic = 'force-dynamic';

/** A guarda é a do layout de /professor: aqui só se empresta a barra lateral. */
export default function PerfilProfessor() {
  return <PainelPerfil />;
}

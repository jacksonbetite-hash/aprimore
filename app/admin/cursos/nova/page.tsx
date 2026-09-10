import Link from 'next/link';
import type { Metadata } from 'next';
import FormMateria from '../FormMateria.tsx';
import { acaoCriarMateria } from '../acoes.ts';
import { listarAreas, niveisDoPortal } from '../../../../lib/admin-cursos.ts';
import { PORTAL_PLATAFORMA } from '../../../../lib/portal.ts';

export const metadata: Metadata = { title: 'Novo curso — Administração' };
export const dynamic = 'force-dynamic';

export default async function NovoCurso(
  { searchParams }: { searchParams: Promise<{ portal?: string }> },
) {
  const { portal = '' } = await searchParams;
  const portalId = portal !== '' && Number.isInteger(Number(portal))
    ? Number(portal) : PORTAL_PLATAFORMA;
  const [areas, niveis] = await Promise.all([listarAreas(portalId), niveisDoPortal(portalId)]);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Novo curso</h1>
          <p className="suave">
            O endereço público vem do nome. Depois de criado, os assuntos e as aulas são
            cadastrados dentro do curso.
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href={`/admin/cursos?portal=${portalId}`}>Voltar</Link>
        </div>
      </div>

      {areas.length === 0 ? (
        <div className="cartao">
          <div className="vazio">
            Este acervo não tem nenhuma área, e todo curso pertence a uma.{' '}
            <Link href={`/admin/cursos?portal=${portalId}`}
              style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
              Criar a primeira
            </Link>.
          </div>
        </div>
      ) : (
        <div className="cartao">
          <FormMateria acao={acaoCriarMateria} areas={areas} portalId={portalId}
            ehPlataforma={portalId === PORTAL_PLATAFORMA} niveis={niveis} />
        </div>
      )}
    </>
  );
}

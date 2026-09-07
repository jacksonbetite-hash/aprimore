import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../../componentes.tsx';
import FormAceitar from './FormAceitar.tsx';
import { acaoAceitarConvite } from './acoes.ts';
import { portalAtual } from '../../../lib/portal-consultas.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { lerConvite } from '../../../lib/empresa-equipe.ts';

export const metadata: Metadata = {
  title: 'Convite para o treinamento',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const RECUSA: Record<string, string> = {
  aceito: 'Este convite já foi usado. Se a conta é sua, entre com a sua senha.',
  cancelado: 'Este convite foi cancelado pela empresa.',
  expirado: 'Este convite expirou. Peça um novo a quem administra o treinamento.',
};

/**
 * Aceitar o convite — §5.11, etapa 4.
 *
 * É uma das poucas páginas que TÊM de responder sem sessão dentro do
 * portal fechado de uma empresa (por isso `<Pagina aberta>`): sem ela, o
 * portão não teria maçaneta. O que a torna segura é o token — nominal,
 * de uso único, com prazo, e guardado no banco só como hash.
 */
export default async function PaginaConvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = await portalAtual();
  if (portal.tipo !== 'EMPRESA') notFound();
  if (await alunoAtual()) redirect('/painel');

  const convite = await lerConvite(portal.id, token);
  if (!convite) notFound();

  if (convite.situacao !== 'pendente') {
    return (
      <Pagina aberta>
        <section className="secao caixa-auth">
          <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
            <h1>{convite.empresaNome}</h1>
            <p className="sub">{RECUSA[convite.situacao]}</p>
            <Link className="btn btn-primario" href="/entrar">Entrar na minha conta</Link>
          </div>
        </section>
      </Pagina>
    );
  }

  return (
    <Pagina aberta>
      <section className="secao caixa-auth">
        <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
          <span className="chip chip-secundaria">{convite.empresaNome}</span>
          <h1 style={{ marginTop: 12 }}>Você foi convidado para o treinamento</h1>
          <p className="sub">
            Crie a sua senha para começar. O acesso é da conta{' '}
            <strong>{convite.email}</strong>
            {convite.setorNome && <> · setor {convite.setorNome}</>}.
          </p>

          {convite.trilhas.length > 0 && (
            <div className="aviso" style={{ marginBottom: 16 }}>
              <strong>Trilhas liberadas para você:</strong>
              <ul style={{ marginTop: 6 }}>
                {convite.trilhas.map((t) => (
                  <li key={t} className="caption"><Icone nome="play_circle" tamanho={16} /> {t}</li>
                ))}
              </ul>
            </div>
          )}

          <FormAceitar acao={acaoAceitarConvite} token={token} nome={convite.nome ?? ''} />

          <p className="caption suave" style={{ marginTop: 16 }}>
            Ao criar a conta você passa a fazer parte do portal de treinamento da{' '}
            {convite.empresaNome}, que é a <strong>controladora</strong> dos seus dados de
            progresso (LGPD, art. 5º). A plataforma Aprimore o Saber apenas hospeda e opera o
            portal.
          </p>
        </div>
      </section>
    </Pagina>
  );
}

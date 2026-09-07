import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../componentes.tsx';

export const metadata: Metadata = { title: 'Conferir certificado' };
export const dynamic = 'force-dynamic';

/**
 * A porta de entrada da conferência: quem recebeu um certificado
 * impresso digita o código e cai na página dele. Aberta sem sessão —
 * inclusive dentro do portal de uma empresa —, porque quem confere
 * costuma ser de fora: o RH da empresa seguinte, uma faculdade, um
 * auditor.
 */
async function conferir(dados: FormData) {
  'use server';
  const codigo = String(dados.get('codigo') ?? '').trim().toUpperCase();
  if (!codigo) redirect('/certificado?vazio=1');
  redirect(`/certificado/${encodeURIComponent(codigo)}`);
}

export default async function ConferirCertificado(
  { searchParams }: { searchParams: Promise<{ vazio?: string }> },
) {
  const { vazio } = await searchParams;
  return (
    <Pagina aberta>
      <section className="secao caixa-auth">
        <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
          <h1>Conferir um certificado</h1>
          <p className="sub">
            Digite o código impresso no certificado. A conferência mostra o nome de quem
            concluiu, a trilha, a data e a carga horária.
          </p>
          {vazio && <p className="alerta alerta-erro" role="alert">Digite o código.</p>}
          <form action={conferir} className="formulario">
            <label>
              Código de verificação
              <input name="codigo" required autoComplete="off" placeholder="ABCDE-FGHJK"
                     style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: 2 }} />
            </label>
            <button className="btn btn-primario btn-bloco" type="submit">
              <Icone nome="search" tamanho={20} /> Conferir
            </button>
          </form>
          <p className="caption suave" style={{ marginTop: 16 }}>
            Certificados de curso livre, emitidos pela empresa responsável pelo treinamento.
          </p>
        </div>
      </section>
    </Pagina>
  );
}

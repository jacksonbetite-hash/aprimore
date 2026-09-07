import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Pagina } from '../componentes.tsx';
import { FormEntrar } from '../FormAuth.tsx';
import { entrar } from '../acoes-auth.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalAtual, portalIdAtual } from '../../lib/portal-consultas.ts';
import { paginaInicial } from '../../lib/navegacao.ts';

export const metadata: Metadata = { title: 'Entrar' };
export const dynamic = 'force-dynamic';

export default async function Entrar(
  { searchParams }: { searchParams: Promise<{ destino?: string }> },
) {
  const { destino = '' } = await searchParams;
  // Quem já está logado não vê tela de login: vai para o painel do papel
  // dele — o admin caía em "Minha jornada" e tinha de se achar sozinho.
  const logado = await alunoAtual();
  if (logado) redirect(paginaInicial(logado.papel, await portalIdAtual(), destino));

  // §5.11 — no portal de uma empresa a tela de login é a ÚNICA porta, e
  // ela não oferece cadastro: quem libera acesso ali é o RH.
  const portal = await portalAtual();
  const empresa = portal.tipo === 'EMPRESA';
  return (
    <Pagina aberta>
      <section className="secao caixa-auth">
        <div className="cartao cartao-auth">
          <h1>{empresa ? portal.nomeExibicao : 'Bom te ver de novo'}</h1>
          <p className="sub">
            {empresa
              ? 'Entre com o e-mail que a sua empresa cadastrou.'
              : 'Entre para continuar de onde parou.'}
          </p>
          <FormEntrar acao={entrar} destino={destino} semCadastro={empresa} />
        </div>
      </section>
    </Pagina>
  );
}

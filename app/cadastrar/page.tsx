import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Pagina } from '../componentes.tsx';
import { FormCadastro } from '../FormAuth.tsx';
import { criarConta } from '../acoes-auth.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalAtual } from '../../lib/portal-consultas.ts';

export const metadata: Metadata = { title: 'Criar conta' };
export const dynamic = 'force-dynamic';

export default async function Cadastrar() {
  if (await alunoAtual()) redirect('/painel');
  const portal = await portalAtual();

  // §5.11 — o cadastro aberto é da vitrine. No portal de uma empresa, a
  // porta só existe se o RH autorizou um domínio de e-mail (etapa 4);
  // sem isso, entra quem foi convidado, e a tela seria uma promessa
  // falsa. A conferência do domínio é refeita no servidor, na ação.
  const empresa = portal.tipo === 'EMPRESA';
  if (empresa && portal.dominiosEmail.length === 0) redirect('/entrar');

  return (
    <Pagina aberta={empresa}>
      <section className="secao caixa-auth">
        <div className="cartao cartao-auth">
          <h1>{empresa ? `Criar seu acesso · ${portal.nomeExibicao}` : 'Criar conta grátis'}</h1>
          <p className="sub">
            {empresa
              ? `Use o seu e-mail corporativo — ${portal.dominiosEmail.map((d) => `@${d}`).join(' ou ')}.`
              : 'Dá acesso à biblioteca completa, à 1ª aula de cada assunto e ao teste de 7 dias.'}
          </p>
          <FormCadastro acao={criarConta} />
          {empresa && (
            <p className="caption suave" style={{ marginTop: 16 }}>
              Criando a conta, você entra no portal de treinamento da {portal.nomeExibicao}, que
              é a <strong>controladora</strong> dos seus dados de progresso (LGPD, art. 5º). As
              trilhas são liberadas por quem administra o treinamento — se nada aparecer depois
              de entrar, é com essa pessoa que você fala
              {portal.personalizacao.contato && <> ({portal.personalizacao.contato})</>}.
            </p>
          )}
        </div>
      </section>
    </Pagina>
  );
}

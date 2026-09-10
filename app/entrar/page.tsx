import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pagina, Icone } from '../componentes.tsx';
import { FormEntrar, type ContextoAuth } from '../FormAuth.tsx';
import { entrar } from '../acoes-auth.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import {
  portalAtual, portalIdAtual, enderecoDaPlataforma,
} from '../../lib/portal-consultas.ts';
import { paginaInicial } from '../../lib/navegacao.ts';

export const metadata: Metadata = { title: 'Entrar' };
export const dynamic = 'force-dynamic';

/**
 * Duas linhas no pé do cartão. As duas são verificáveis no código, e por
 * isso são só estas duas: o layout de referência trazia "criptografia de
 * ponta a ponta" e "proteção DRM", que aqui seriam propaganda de coisa
 * que não existe — o vídeo é servido com URL assinada por tempo
 * (lib/video.ts), que não é DRM, e a senha é derivada com scrypt
 * (lib/auth.ts), que não é criptografia de ponta a ponta. Selo de
 * confiança que exagera é o primeiro a virar reclamação (CDC, art. 37).
 */
const CONFIANCA = [
  {
    i: 'lock',
    t: 'Acesso protegido',
    p: 'A senha nunca é guardada em texto, e "Sair" encerra a sessão deste aparelho na hora.',
  },
  {
    i: 'devices',
    t: 'Começou aqui, continua no celular',
    p: 'A mesma conta no computador, no tablet e no celular — a aula retoma onde você parou.',
  },
];

export default async function Entrar(
  { searchParams }: { searchParams: Promise<{ destino?: string; 'ja-tem-conta'?: string }> },
) {
  const { destino = '', 'ja-tem-conta': jaTemConta } = await searchParams;
  // Quem já está logado não vê tela de login: vai para o painel do papel
  // dele — o admin caía em "Minha jornada" e tinha de se achar sozinho.
  const logado = await alunoAtual();
  if (logado) redirect(paginaInicial(logado.papel, await portalIdAtual(), destino));

  // §5.11 — no portal de uma empresa a tela de login é a ÚNICA porta, e
  // ela não oferece cadastro: quem libera acesso ali é o RH.
  const portal = await portalAtual();
  const plataforma = portal.id === 0;
  const contexto: ContextoAuth = plataforma
    ? 'plataforma'
    : portal.tipo === 'EMPRESA' ? 'empresa' : 'professor';

  // Só dentro do portal de um professor: é a porta de serviço da aba
  // "sou professor", que aponta para a conta dele no site principal.
  const enderecoPlataforma = contexto === 'professor'
    ? await enderecoDaPlataforma()
    : undefined;

  return (
    <Pagina aberta>
      <section className="secao caixa-auth">
        <div className="auth-pilha">
          {/* A trilha de migalhas responde "onde eu estou" para quem
              chegou aqui de um link e não do menu — e devolve a saída
              para a página inicial sem depender do topo. */}
          <nav className="migalhas" aria-label="Você está em">
            <Link href="/"><Icone nome="home" tamanho={15} /> Início</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Meu acesso</span>
          </nav>

          <div className="cartao cartao-auth">
            <span className="auth-fita" aria-hidden="true" />

            <div className="auth-cabeca">
              <span className="auth-selo"><Icone nome="school" tamanho={26} /></span>
              {/* No portal de uma empresa o título é o nome dela: ali a
                  tela é a fachada inteira, e "bom te ver" sob marca de
                  fornecedor nenhum colaborador reconhece. */}
              <h1>{contexto === 'empresa' ? portal.nomeExibicao : 'Bom te ver por aqui'}</h1>
            </div>

            <FormEntrar
              acao={entrar}
              destino={destino}
              contexto={contexto}
              nomePortal={plataforma ? undefined : portal.nomeExibicao}
              enderecoPlataforma={enderecoPlataforma}
              jaTemConta={Boolean(jaTemConta)}
            />

            <ul className="auth-confianca">
              {CONFIANCA.map((c) => (
                <li key={c.t}>
                  <span className="selo"><Icone nome={c.i} tamanho={20} /></span>
                  <div>
                    <strong>{c.t}</strong>
                    <span>{c.p}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* §5.10.2, etapa 3 — o convite "monte o seu portal" só existe
              no site principal. Dentro do portal de um professor ele
              seria concorrência na casa dele, e é a mesma regra que já
              tira "Para professores" do menu e do rodapé de lá. */}
          {plataforma && (
            <div className="cartao faixa-professor">
              <span className="selo"><Icone nome="web" tamanho={22} /></span>
              <div>
                <h2>É professor e quer o seu próprio portal?</h2>
                <p>Endereço seu, acervo seu e o repasse caindo na sua conta.</p>
              </div>
              <Link className="faixa-professor-link" href="/para-professores">
                Saiba mais <Icone nome="chevron_right" tamanho={16} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </Pagina>
  );
}

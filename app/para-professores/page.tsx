import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../componentes.tsx';
import FormContratar from './FormContratar.tsx';
import { acaoContratar } from './acoes.ts';
import { planoDeLancamento } from '../../lib/portal-assinatura.ts';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { dominioBase } from '../../lib/portal.ts';
import { brl } from '../../lib/precos.ts';
import { COMISSAO_PADRAO_PP } from '../../lib/professor-catalogo.ts';

export const metadata: Metadata = {
  title: 'Seu site de aulas — Portal do Professor',
  description: 'Monte seu site de aulas em vídeo com endereço próprio, checkout, '
    + 'vade-mécum e exercícios. Você grava, publica e recebe; a tecnologia é conosco.',
};
export const dynamic = 'force-dynamic';

/**
 * A vitrine do Portal do Professor (§5.10.2, etapa 3) — só existe no site
 * principal: anunciar "monte seu portal" dentro do portal de um professor
 * seria vender concorrência no site dele.
 */
export default async function ParaProfessores() {
  if ((await portalIdAtual()) !== 0) redirect('/');

  const plano = await planoDeLancamento();
  const dominio = dominioBase();

  const PASSOS = [
    { icone: 'edit_note', titulo: 'Contrate em minutos',
      texto: 'Escolha o endereço, aceite o contrato e pague a 1ª mensalidade. O portal nasce sozinho, sem fila.' },
    { icone: 'verified_user', titulo: 'Conta de recebimento',
      texto: 'Abrimos sua conta no meio de pagamento com o seu CNPJ. É para ela que o dinheiro das suas vendas vai, direto.' },
    { icone: 'videocam', titulo: 'Publique suas aulas',
      texto: 'Suba os vídeos organizados por área e assunto. Publicação direta: a responsabilidade pelo conteúdo é sua.' },
    { icone: 'payments', titulo: 'Venda e receba',
      texto: 'Aluno paga por Pix ou cartão e o valor é dividido na hora: a sua parte cai na sua conta, retemos só o percentual.' },
  ];

  const INCLUI = [
    { titulo: 'Site com endereço próprio', texto: 'Sua página em seunome.' + dominio + ', com sua marca e sua base de alunos — separada da nossa.' },
    { titulo: 'Player e proteção de vídeo', texto: 'Streaming assinado, sem link público: quem não pagou, não assiste.' },
    { titulo: 'Checkout pronto', texto: 'Pix e cartão, reembolso do CDC e nota do caminho todo — sem você montar cobrança.' },
    { titulo: 'Vade-mécum e exercícios', texto: 'A lei ao lado da aula e exercício ao final: o método da plataforma, na sua marca.' },
    { titulo: 'Base de alunos sua', texto: 'Os alunos do portal são seus — cadastro, progresso e faturamento à parte.' },
    { titulo: 'Extrato transparente', texto: 'Cada venda, cada percentual, cada dedução: transparência é contrato, não cortesia.' },
  ];

  return (
    <Pagina>
      <section className="cabeca-materia">
        <div className="container">
          <div className="trilha-topo">
            <Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} /><span>Para professores</span>
          </div>
          <h1>Seu site de aulas, <em className="cor-marca">no ar hoje</em></h1>
          <p className="sub">
            Você grava e ensina; nós cuidamos do site, do player, da cobrança e da entrega.
            Endereço próprio, base de alunos sua e o dinheiro das vendas caindo direto na
            sua conta.
          </p>
        </div>
      </section>

      <section className="secao" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          <div className="secao-titulo">
            <h2>Como <em>funciona</em></h2>
          </div>
          <div className="grade-4">
            {PASSOS.map((p, i) => (
              <div className="cartao" key={p.titulo}>
                <span className="chip chip-sm chip-secundaria">passo {i + 1}</span>
                <h3 style={{ margin: '10px 0 8px' }}><Icone nome={p.icone} /> {p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="secao tinta">
        <div className="container">
          <div className="secao-titulo">
            <h2>O que está <em>incluído</em></h2>
            <p>Tudo que a plataforma usa para vender os próprios cursos, na sua marca.</p>
          </div>
          <div className="grade-3">
            {INCLUI.map((c) => (
              <div className="cartao" key={c.titulo}><h3>{c.titulo}</h3><p>{c.texto}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Etapa 5 do plano de perfis: a segunda porta. Quem não quer site
          próprio publica no catálogo da casa e recebe comissão. */}
      <section className="secao">
        <div className="container">
          <div className="cartao faixa-professor">
            <span className="selo"><Icone nome="menu_book" tamanho={22} /></span>
            <div>
              <h2>Prefere vender no nosso catálogo, sem portal?</h2>
              <p>
                Sem mensalidade e sem site para cuidar: você publica os seus cursos no catálogo
                da plataforma, a venda é nossa e você recebe {COMISSAO_PADRAO_PP}% de cada uma,
                com extrato mensal e repasse por Pix.
              </p>
            </div>
            <Link className="faixa-professor-link" href="/para-professores/catalogo">
              Cadastrar-me no catálogo <Icone nome="chevron_right" tamanho={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="secao" id="preco">
        <div className="container">
          <div className="secao-titulo">
            <h2>Um preço, <em>sem letra miúda</em></h2>
            <p>O que está escrito aqui é o que vale no contrato (CDC, art. 30).</p>
          </div>

          {plano ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 420px))', gap: 32, justifyContent: 'center', alignItems: 'start' }}>
              <div className="cartao cartao-plano plano destaque">
                <div className="fita">Plano de lançamento</div>
                <div className="nome">{plano.nome}</div>
                <div className="promessa">Licença + percentual</div>
                <p className="resumo">
                  Mensalidade fixa pela estrutura, percentual só quando você vende.
                  Sem venda, sem percentual.
                </p>
                <div className="valor">{brl(plano.licencaMensalCentavos)}<span style={{ fontSize: 18, fontWeight: 600 }}>/mês</span></div>
                <p className="periodo">
                  + {Number(plano.percentualBase)}% sobre cada venda
                  {' '}· +{Number(plano.acrescimoIndicacaoPp)} p.p. só na 1ª compra de aluno
                  que trouxermos por anúncio nosso
                </p>
                <p className="inclui">Inclui por mês:</p>
                <ul>
                  <li><Icone nome="check_circle" tamanho={20} /> {plano.gbArmazenamento} GB de vídeo armazenado (~{Math.round(plano.gbArmazenamento / 2)} h de aula)</li>
                  <li><Icone nome="check_circle" tamanho={20} /> {plano.gbBandaMes} GB de exibição aos alunos</li>
                  <li><Icone nome="check_circle" tamanho={20} /> Excedente a {brl(plano.centavosPorGbExcedente)}/GB — cobrado, nunca bloqueado</li>
                  <li><Icone nome="check_circle" tamanho={20} /> Checkout, split e retenção do prazo de reembolso</li>
                </ul>
                <p className="caption suave">
                  Requisito: CNPJ ativo. A conta de recebimento é sua, aberta com seus
                  documentos — exigência do Banco Central.
                </p>
              </div>

              <div className="cartao" id="contratar-cartao">
                <h3 className="headline-md" style={{ marginBottom: 6 }}>Contratar agora</h3>
                <p className="caption suave" style={{ marginBottom: 16 }}>
                  Leva menos de cinco minutos. O portal vai ao ar assim que o pagamento confirmar.
                </p>
                <FormContratar acao={acaoContratar} dominio={dominio} />
              </div>
            </div>
          ) : (
            <p className="aviso">Estamos sem vagas nesta turma. Fale com o suporte para entrar na lista de espera.</p>
          )}
        </div>
      </section>

      <section className="secao tinta">
        <div className="container">
          <div className="grade-3">
            <div className="cartao">
              <h3>E se um aluno pedir reembolso?</h3>
              <p>Nos 7 dias do CDC devolvemos ao aluno e o valor sai da retenção da sua conta
                de recebimento — por isso ela existe. Depois do prazo, a venda é sua de vez.</p>
            </div>
            <div className="cartao">
              <h3>De quem são os alunos?</h3>
              <p>Seus. A base do portal é separada da nossa, e você responde por ela como
                controlador (LGPD). Nós somos o operador que guarda e processa.</p>
            </div>
            <div className="cartao">
              <h3>E se eu quiser sair?</h3>
              <p>Sem fidelidade. Você leva seus vídeos e sua base; quem tiver licença vigente
                termina o período dela. Os prazos de saída ficam no contrato.</p>
            </div>
          </div>
        </div>
      </section>
    </Pagina>
  );
}

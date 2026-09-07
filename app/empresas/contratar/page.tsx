import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../../componentes.tsx';
import FormContratarEmpresa, { type PlanoNaTela } from '../FormContratarEmpresa.tsx';
import { acaoContratarEmpresa } from '../acoes.ts';
import { planosDeEmpresa } from '../../../lib/empresa.ts';
import { PLANOS_EMPRESA } from '../../../lib/empresas.ts';
import { portalIdAtual } from '../../../lib/portal-consultas.ts';
import { dominioBase } from '../../../lib/portal.ts';
import { brl } from '../../../lib/precos.ts';

export const metadata: Metadata = {
  title: 'Contratar o portal da empresa',
  description: 'Universidade corporativa no seu endereço, com a sua marca: trilhas em vídeo, '
    + 'avaliação, certificado e acompanhamento por pessoa. No ar no mesmo dia.',
};
export const dynamic = 'force-dynamic';

/**
 * A contratação em autosserviço (§5.11, etapa 1) — o que a decisão desta
 * rodada acrescenta ao §12-B.1: a empresa não espera proposta.
 *
 * Só no site principal, como a do professor: dentro do portal de um
 * cliente, anunciar "monte o seu" seria concorrência na casa dele.
 *
 * O PREÇO VEM DO BANCO. `lib/empresas.ts` guarda a lista de benefícios de
 * cada plano (texto de venda, que muda com a campanha); o valor, o teto
 * de contas e o preço do domínio próprio vêm de `portal_plano` — mudar o
 * preço no admin muda esta página, sem código (mesma regra do §5.10.3).
 */
const PASSOS = [
  { icone: 'shopping_cart', titulo: 'Você contrata aqui',
    texto: 'CNPJ, o endereço do portal e a 1ª mensalidade. Leva dois minutos.' },
  { icone: 'video_library', titulo: 'Sobe as trilhas',
    texto: 'Vídeo, material e exercício por aula, e uma avaliação final com nota mínima.' },
  { icone: 'group_add', titulo: 'Cadastra a equipe',
    texto: 'Um a um, por planilha ou por link de convite. Cada pessoa recebe as trilhas do setor dela.' },
  { icone: 'insights', titulo: 'Acompanha quem concluiu',
    texto: 'Progresso por pessoa e por trilha, nota da avaliação e certificado com a chancela da empresa.' },
];

export default async function ContratarEmpresa(
  { searchParams }: { searchParams: Promise<{ plano?: string }> },
) {
  if ((await portalIdAtual()) !== 0) redirect('/');

  const planos = await planosDeEmpresa();
  if (planos.length === 0) redirect('/empresas');

  const { plano } = await searchParams;
  const escolhido = planos.find((p) => String(p.id) === plano) ?? planos[0];

  // O texto de venda de cada plano casa com a linha do banco pelo nome do
  // produto. Plano novo no admin sem texto correspondente aparece com o
  // que o banco sabe — número, nunca promessa inventada.
  const copia = new Map(PLANOS_EMPRESA.map((p) => [p.nome, p]));
  const naTela: PlanoNaTela[] = planos.map((p) => {
    const c = copia.get(p.nome.replace(/^Empresa /, 'Business ')) ?? copia.get(p.nome);
    return {
      id: p.id,
      nome: p.nome,
      limiteContas: p.limiteContas,
      precoMes: brl(p.licencaMensalCentavos),
      dominioProprio: p.centavosDominioProprio === null
        ? 'sem domínio próprio'
        : p.centavosDominioProprio === 0
          ? 'domínio próprio incluído'
          : `domínio próprio por ${brl(p.centavosDominioProprio)}/mês`,
      itens: (c?.itens ?? []).slice(0, 4),
      recomendado: c?.recomendado,
    };
  });

  return (
    <Pagina ativo="planos">
      <section className="cabeca-materia">
        <div className="container">
          <div className="trilha-topo">
            <Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} />
            <Link href="/empresas">Empresas &amp; RH</Link><Icone nome="chevron_right" tamanho={16} />
            <span>Contratar</span>
          </div>
          <h1>A universidade corporativa da sua empresa, <em className="cor-marca">no ar hoje</em></h1>
          <p className="sub">
            Você sobe os vídeos, cadastra a equipe e libera as trilhas. Cada pessoa entra com
            o e-mail dela, assiste, faz a avaliação e recebe o certificado. Você acompanha
            quem concluiu.
          </p>
        </div>
      </section>

      <section className="secao" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          <div className="grade-2" style={{ alignItems: 'start', gap: 32 }}>
            <div className="pilha-lg">
              <div>
                <h2 className="headline-md" style={{ marginBottom: 16 }}>Como funciona</h2>
                <div className="pilha-md">
                  {PASSOS.map((p, i) => (
                    <div className="cartao" key={p.titulo}
                         style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <span className="chip chip-sm chip-secundaria" style={{ flexShrink: 0 }}>{i + 1}</span>
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                          <Icone nome={p.icone} tamanho={18} /> {p.titulo}
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>{p.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cartao">
                <h3 style={{ marginBottom: 8 }}>
                  <Icone nome="lock" tamanho={18} /> O portal da sua empresa é fechado
                </h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>
                  Quem chega ao endereço sem ter acesso vê a sua marca e um campo de login,
                  mais nada. Não há catálogo público, não há preço na tela e ninguém cria
                  conta sozinho — só entra quem você cadastrou ou convidou. Seu treinamento
                  interno não aparece em busca.
                </p>
              </div>

              <div className="cartao">
                <h3 style={{ marginBottom: 8 }}>
                  <Icone nome="shield_person" tamanho={18} /> Os dados dos colaboradores são seus
                </h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>
                  Pela LGPD a empresa é a <strong>controladora</strong> dessa base; nós somos
                  o <strong>operador</strong>, e só guardamos e processamos para entregar o
                  treinamento e o relatório. A exportação em planilha é sua, a qualquer hora.
                </p>
              </div>

              <div className="cartao">
                <h3 style={{ marginBottom: 8 }}>
                  <Icone nome="workspace_premium" tamanho={18} /> Sobre o certificado
                </h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>
                  É certificado de <strong>curso livre</strong>, com a chancela da sua empresa
                  e um código de verificação — próprio para registro interno e auditoria de
                  treinamento. Não somos instituição credenciada pelo MEC e não emitimos
                  certificado de curso reconhecido.
                </p>
              </div>

              <p className="caption suave">
                Equipe com mais de 250 pessoas, várias unidades ou integração com o sistema
                de RH? Isso é o plano Enterprise, que fecha por proposta —{' '}
                <Link href="/empresas#contato" style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                  peça uma apresentação
                </Link>.
              </p>
            </div>

            <div className="cartao">
              <h2 className="headline-md" style={{ marginBottom: 6 }}>Contratar</h2>
              <p className="caption suave" style={{ marginBottom: 16 }}>
                Sem taxa de adesão e sem fidelidade. O portal entra no ar quando o
                pagamento confirmar.
              </p>
              <FormContratarEmpresa
                acao={acaoContratarEmpresa}
                planos={naTela}
                planoInicial={escolhido.id}
                dominio={dominioBase()}
              />
            </div>
          </div>
        </div>
      </section>
    </Pagina>
  );
}

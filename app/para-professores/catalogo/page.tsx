import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pagina, Icone } from '../../componentes.tsx';
import FormCatalogo from './FormCatalogo.tsx';
import { acaoCadastrarNoCatalogo } from './acoes.ts';
import { portalIdAtual } from '../../../lib/portal-consultas.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { COMISSAO_PADRAO_PP } from '../../../lib/professor-catalogo.ts';

export const metadata: Metadata = {
  title: 'Venda no catálogo — Para professores',
  description: 'Publique os seus cursos no catálogo da plataforma, sem portal e sem mensalidade, e receba comissão por venda.',
};
export const dynamic = 'force-dynamic';

const PASSOS = [
  { icone: 'edit_note', titulo: 'Cadastre-se', texto: 'Nome, e-mail, senha e CPF ou CNPJ. Sem mensalidade, sem cartão.' },
  { icone: 'videocam', titulo: 'Monte o curso', texto: 'Área, ementa, assuntos, aulas com vídeo e exercício comentado — os mesmos formulários da casa.' },
  { icone: 'fact_check', titulo: 'Revisão', texto: 'Marque "em revisão" quando estiver pronto. A plataforma confere e publica no catálogo.' },
  { icone: 'payments', titulo: 'Receba', texto: `A venda é nossa; você recebe ${COMISSAO_PADRAO_PP}% de cada uma, com extrato mensal, nota e Pix até o dia 15.` },
];

/** A segunda porta de /para-professores (etapa 5 do plano de perfis). */
export default async function ProfessorNoCatalogo() {
  if ((await portalIdAtual()) !== 0) redirect('/');
  if (await alunoAtual()) redirect('/professor');

  return (
    <Pagina>
      <section className="cabeca-materia">
        <div className="container">
          <div className="trilha-topo">
            <Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} />
            <Link href="/para-professores">Para professores</Link><Icone nome="chevron_right" tamanho={16} />
            <span>Vender no catálogo</span>
          </div>
          <h1>Seus cursos no <em className="cor-marca">nosso catálogo</em></h1>
          <p className="sub">
            Sem site para cuidar e sem mensalidade: você grava e organiza, a plataforma vende,
            entrega e cobra — e repassa a sua comissão todo mês.
          </p>
        </div>
      </section>

      <section className="secao" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
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
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'start' }}>
          <div>
            <h2 style={{ marginBottom: 12 }}>O que muda em relação ao portal</h2>
            <ul style={{ display: 'grid', gap: 10, paddingLeft: 18, lineHeight: 1.7 }}>
              <li><strong>Sem mensalidade.</strong> Você só ganha; não paga estrutura.</li>
              <li><strong>Sem marca própria.</strong> O curso aparece no catálogo da plataforma, assinado por você.</li>
              <li><strong>Publicação com revisão.</strong> No portal é direta; aqui a casa confere antes de publicar.</li>
              <li><strong>A venda é da plataforma.</strong> Pix e cartão nossos, reembolso do CDC por nossa conta, e {COMISSAO_PADRAO_PP}% para você.</li>
              <li><strong>Repasse por Pix.</strong> Extrato fechado no dia 1, 5 dias para contestar, nota fiscal, pagamento até o dia 15. Abaixo de R$ 100, acumula.</li>
            </ul>
          </div>
          <div className="cartao">
            <h2 style={{ marginBottom: 6 }}>Cadastro</h2>
            <p className="caption suave" style={{ marginBottom: 16 }}>Leva um minuto. Depois é só criar o primeiro curso.</p>
            <FormCatalogo acao={acaoCadastrarNoCatalogo} comissaoPp={COMISSAO_PADRAO_PP} />
          </div>
        </div>
      </section>
    </Pagina>
  );
}

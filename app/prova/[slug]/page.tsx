import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../../componentes.tsx';
import Prova from './Prova.tsx';
import { acaoEntregarProva } from './acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalAtual } from '../../../lib/portal-consultas.ts';
import { provaDaTrilha, questoesDaProva, iniciarTentativa } from '../../../lib/avaliacao.ts';

export const metadata: Metadata = { title: 'Avaliação da trilha' };
export const dynamic = 'force-dynamic';

/**
 * A avaliação final, do lado de quem faz — §5.11, etapa 5.
 *
 * Três guardas antes da prova aparecer: é portal de empresa, a pessoa
 * está logada, e a trilha está liberada para ela (a licença B2B). O
 * gabarito NÃO vem para cá: `questoesDaProva` devolve alternativas sem
 * `correta` nem comentário, e a correção acontece no servidor, na
 * entrega. Fosse diferente, bastaria abrir o código-fonte da página.
 */
export default async function PaginaProva({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portal = await portalAtual();
  if (portal.tipo !== 'EMPRESA') notFound();
  const aluno = await alunoAtual();
  if (!aluno) redirect(`/entrar?destino=/prova/${slug}`);

  const prova = await provaDaTrilha(portal.id, slug, aluno.id);
  if (!prova) notFound();

  // A trilha precisa estar liberada para esta pessoa: a avaliação é a
  // porta do certificado, e certificado de trilha que ninguém atribuiu
  // não vale nada.
  const { podeAcessar } = await import('../../../lib/licenca.ts');
  const { espectadorAtual } = await import('../../../lib/sessao.ts');
  const espectador = await espectadorAtual();
  const liberada = podeAcessar(espectador,
    { id: 0, materiaId: prova.materiaId, amostraGratuita: false, noTrial: false });
  if (!liberada.libera) {
    return (
      <Pagina>
        <section className="secao caixa-auth">
          <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
            <h1>Esta trilha não está liberada para você</h1>
            <p className="sub">
              Quem libera as trilhas é o setor responsável pelo treinamento na sua empresa
              {portal.personalizacao.contato && <> — {portal.personalizacao.contato}</>}.
            </p>
            <Link className="btn btn-primario" href="/painel">Voltar às minhas trilhas</Link>
          </div>
        </section>
      </Pagina>
    );
  }

  const faltam = prova.aulasTotal - prova.aulasConcluidas;
  const esgotou = prova.maxTentativas !== null && prova.tentativas >= prova.maxTentativas;

  const jaConcluida = prova.aprovada && prova.codigoCertificado
    ? { nota: prova.melhorNota, codigo: prova.codigoCertificado }
    : null;

  // Tentativas esgotadas SEM aprovação: não há prova a abrir. Quem já
  // passou cai no resumo do próprio componente, logo abaixo.
  if (esgotou && !jaConcluida) {
    return (
      <Pagina>
        <section className="secao caixa-auth">
          <div className="cartao cartao-auth" style={{ width: 'min(560px, 92vw)' }}>
            <h1>Tentativas esgotadas</h1>
            <p className="sub">
              Você usou as {prova.maxTentativas} tentativas desta avaliação. A melhor nota foi{' '}
              {prova.melhorNota ?? 0}%, e o mínimo é {prova.notaMinima}%. Fale com quem
              administra o treinamento na sua empresa
              {portal.personalizacao.contato && <> — {portal.personalizacao.contato}</>}.
            </p>
            <Link className="btn btn-contorno" href="/painel">Voltar às minhas trilhas</Link>
          </div>
        </section>
      </Pagina>
    );
  }

  // Quem já concluiu não abre tentativa nova: veria a prova de graça e
  // gastaria uma chance sem querer.
  const tentativaId = jaConcluida ? 0 : await iniciarTentativa(portal.id, aluno.id, prova.id);
  const questoes = jaConcluida ? [] : await questoesDaProva(prova.id, prova.embaralhar);

  return (
    <Pagina>
      <div className="container" style={{ maxWidth: 860, paddingTop: 32, paddingBottom: 48 }}>
        <div className="trilha-topo" style={{ marginBottom: 16 }}>
          <Link href="/painel">Minhas trilhas</Link>
          <Icone nome="chevron_right" tamanho={16} />
          <Link href={`/materia/${prova.materiaSlug}`}>{prova.materiaNome}</Link>
          <Icone nome="chevron_right" tamanho={16} />
          <span className="suave">Avaliação</span>
        </div>

        <h1 className="headline-lg">{prova.titulo}</h1>
        {!jaConcluida && (
          <p className="suave" style={{ marginTop: 6 }}>
            {questoes.length} questão(ões) · nota mínima {prova.notaMinima}% ·{' '}
            {prova.maxTentativas === null
              ? 'tentativas ilimitadas'
              : `tentativa ${prova.tentativas + 1} de ${prova.maxTentativas}`}
          </p>
        )}
        {prova.descricao && !jaConcluida && <p className="aviso" style={{ marginTop: 16 }}>{prova.descricao}</p>}

        {faltam > 0 && !jaConcluida && (
          <p className="alerta alerta-erro" style={{ marginTop: 16 }}>
            <strong>Você ainda não concluiu {faltam === 1 ? '1 aula' : `${faltam} aulas`} da trilha.</strong>{' '}
            Dá para fazer a avaliação assim mesmo, mas as questões cobram o conteúdo das aulas.
          </p>
        )}

        {questoes.length === 0 && !jaConcluida ? (
          <div className="vazio" style={{ marginTop: 24 }}>
            Esta avaliação ainda não tem questões. Avise quem administra o treinamento.
          </div>
        ) : (
          <Prova questoes={questoes} avaliacaoId={prova.id} tentativaId={tentativaId}
                 notaMinima={prova.notaMinima} acao={acaoEntregarProva}
                 concluida={jaConcluida} trilha={prova.materiaNome} />
        )}
      </div>
    </Pagina>
  );
}

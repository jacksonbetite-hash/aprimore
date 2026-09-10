import Link from 'next/link';
import { Icone } from '../../ui.tsx';
import { resumoDoProfessor, contratoVigente } from '../../../lib/professor-catalogo.ts';
import type { Aluno } from '../../../lib/sessao.ts';
import { brl } from '../../../lib/precos.ts';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * A visão geral do professor SEM portal (etapa 5): os cursos dele no
 * catálogo, o que está em revisão, o que vendeu e o que tem a receber.
 * A checklist segue a mesma regra do portal — cada "feito" é um número
 * que veio do banco, não uma promessa.
 */
export default async function VisaoGeralCatalogo({ u }: { u: Aluno }) {
  const [r, contrato] = await Promise.all([resumoDoProfessor(u.id), contratoVigente(u.id)]);

  const passos = [
    { feito: r.cursos > 0, texto: 'Primeiro curso criado', href: '/professor/cursos',
      detalhe: r.cursos === 0 ? 'nenhum curso cadastrado' : plural(r.cursos, 'curso cadastrado', 'cursos cadastrados') },
    { feito: r.aulasPublicadas > 0, texto: 'Primeira aula publicada, com exercício', href: '/professor/cursos',
      detalhe: r.aulasPublicadas === 0 ? 'nenhuma aula publicada' : plural(r.aulasPublicadas, 'aula publicada', 'aulas publicadas') },
    { feito: r.aulasPublicadas > 0 && r.aulasComVideo === r.aulasPublicadas, texto: 'Vídeo em todas as aulas publicadas', href: '/professor/cursos',
      detalhe: r.aulasPublicadas === 0 ? 'nenhuma aula ainda' : `${r.aulasComVideo} de ${r.aulasPublicadas} com gravação` },
    { feito: r.emRevisao > 0 || r.publicados > 0, texto: 'Curso enviado para revisão', href: '/professor/cursos',
      detalhe: r.publicados > 0 ? `${r.publicados} publicado(s)` : r.emRevisao > 0 ? `${r.emRevisao} aguardando a plataforma` : 'mude a situação do curso para "em revisão" quando ele estiver pronto' },
    { feito: r.publicados > 0, texto: 'Curso publicado no catálogo',
      detalhe: r.publicados > 0 ? plural(r.publicados, 'curso à venda', 'cursos à venda') : 'quem publica é a revisão da plataforma' },
    { feito: Boolean(contrato?.chavePix), texto: 'Chave Pix para o repasse', href: '/professor/financeiro',
      detalhe: contrato?.chavePix ? `chave: ${contrato.chavePix}` : 'sem chave, o repasse não tem para onde ir' },
  ];
  const aFazer = passos.filter((x) => !x.feito).length;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Olá, {u.nome.split(' ')[0]}</h1>
          <p className="suave">
            Professor do catálogo da plataforma · comissão de {Number(contrato?.comissaoPp ?? 0)}% sobre cada venda
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-primario" href="/professor/cursos">Meus cursos</Link>
        </div>
      </div>

      <div className="grade-4" style={{ marginBottom: 24 }}>
        <div className="cartao">
          <span className="label-md suave">CURSOS</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{r.cursos}</div>
          <p className="caption suave">{r.publicados} publicado(s) · {r.emRevisao} em revisão</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">AULAS NO AR</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{r.aulasPublicadas}</div>
          <p className="caption suave">{r.aulasComVideo} com gravação</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">ALUNOS</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{r.alunos}</div>
          <p className="caption suave">compraram os seus cursos na plataforma</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">A RECEBER (BRUTO)</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{brl(r.aReceber)}</div>
          <p className="caption suave">de {brl(r.vendido)} vendidos · o extrato fecha mês a mês</p>
        </div>
      </div>

      <div className="grade-2">
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 4 }}>Próximos passos</h2>
          <p className="caption suave" style={{ marginBottom: 14 }}>
            {aFazer === 0 ? 'Tudo cumprido.' : `${plural(aFazer, 'passo pendente', 'passos pendentes')} de ${passos.length}.`}
          </p>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
            {passos.map((x) => (
              <li key={x.texto} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span className={`chip chip-sm ${x.feito ? 'chip-secundaria' : 'chip-neutra'}`} style={{ flex: '0 0 auto' }}>
                  <Icone nome={x.feito ? 'check' : 'schedule'} tamanho={14} />
                  {x.feito ? 'feito' : 'a fazer'}
                </span>
                <span>
                  {x.href && !x.feito ? <Link href={x.href}>{x.texto}</Link> : x.texto}
                  <br /><span className="caption suave">{x.detalhe}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 12 }}>Como funciona</h2>
          <ul style={{ display: 'grid', gap: 10, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
            <li><strong>Você publica no nosso catálogo</strong>, sem portal e sem mensalidade. O vídeo fica no nosso volume.</li>
            <li><strong>Publicação com revisão:</strong> você deixa o curso pronto e marca "em revisão"; a plataforma confere e publica. As aulas você publica sozinho — o curso só aparece quando for publicado.</li>
            <li><strong>A venda é da plataforma:</strong> o aluno compra aqui, com Pix ou cartão, e recebe a licença. Você recebe <strong>{Number(contrato?.comissaoPp ?? 0)}%</strong> de cada venda.</li>
            <li><strong>Repasse mensal:</strong> extrato fechado no dia 1, 5 dias para contestar, nota fiscal e Pix até o dia 15. Abaixo de R$ 100, acumula.</li>
          </ul>
          <p className="caption suave" style={{ marginTop: 12 }}>
            Quer o seu próprio site, com sua marca e sua base de alunos?{' '}
            <Link href="/para-professores">Conheça o portal do professor</Link>.
          </p>
        </div>
      </div>
    </>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../componentes.tsx';
import { alunoAtual, licencasDo } from '../../../lib/sessao.ts';
import { portalAtual } from '../../../lib/portal-consultas.ts';
import { trilhasDoColaborador } from '../../../lib/empresa-relatorio.ts';
import { licencaVigente } from '../../../lib/licenca.ts';
import { exigirColaborador } from '../../guarda-empresa.ts';

export const metadata: Metadata = { title: 'Meu acesso' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR');

/**
 * "Meu acesso" — o que o item "Planos" vira no portal de uma empresa.
 *
 * A página de planos não existe aqui, por decisão registrada: "o
 * colaborador não contrata nada, e mostrar oferta a ele seria vender
 * pelas costas do RH" (§5.11, `app/planos/page.tsx`). A recusa estava
 * certa; o destino é que era mudo — quem clicava caía na home sem
 * explicação nenhuma.
 *
 * Então o item passa a responder a pergunta que o colaborador de fato
 * tem: **até quando eu tenho acesso a quê, e quem renova isso.** Sem
 * preço, sem botão de assinar, sem teste de 7 dias. A rota continua
 * `/painel/planos` para nenhum link antigo morrer; o menu chama de "Meu
 * acesso", que é o que a tela entrega.
 */
export default async function MeuAcesso() {
  await exigirColaborador('/planos');
  const [portal, aluno] = await Promise.all([portalAtual(), alunoAtual()]);
  const [licencas, trilhas] = await Promise.all([
    licencasDo(aluno!.id),
    trilhasDoColaborador(portal.id, aluno!.id),
  ]);

  const agora = new Date();
  const comDatas = licencas.map((l) => ({
    ...l, inicioEm: new Date(l.inicioEm), fimEm: new Date(l.fimEm),
  }));
  const vigentes = comDatas.filter((l) => licencaVigente(l, agora));
  const obrigatorias = trilhas.filter((t) => t.obrigatoria);
  const comPrazo = trilhas.filter((t) => t.prazoEm && t.situacao !== 'concluida');

  /* A licença mais curta manda no aviso: é ela que decide quando o
     acesso começa a cair, e é a data que o colaborador precisa levar ao
     RH. Mostrar a mais longa daria uma tranquilidade falsa. */
  const proximaAVencer = vigentes
    .slice()
    .sort((a, b) => a.fimEm.getTime() - b.fimEm.getTime())[0] ?? null;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Meu acesso</h1>
          <p className="suave">
            O que a {portal.nomeExibicao} liberou para você, e até quando.
          </p>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Suas licenças</h2>
        {comDatas.length === 0 ? (
          <p className="vazio">
            Nenhum acesso liberado ainda. Quem libera é o setor responsável pelo
            treinamento na sua empresa
            {portal.personalizacao.contato && <> — {portal.personalizacao.contato}</>}.
          </p>
        ) : comDatas.map((l) => {
          const vigente = licencaVigente(l, agora);
          return (
            <div
              key={l.id}
              style={{
                display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center',
                padding: '14px 0', borderBottom: '1px solid var(--surface-container)', flexWrap: 'wrap',
              }}
            >
              <div>
                <strong className="label-md">
                  {l.escopo === 'CATALOGO' ? 'Todas as trilhas do portal' : l.materiaNome}
                </strong>
                <div className="caption suave">
                  {/* "Origem: b2b" não diz nada a quem lê. Aqui a origem
                      da licença é sempre a empresa — é isso que importa. */}
                  Liberada pela empresa · {vigente ? 'vale até' : 'valeu até'} {DATA(l.fimEm)}
                </div>
              </div>
              <span className={`chip ${vigente ? 'chip-secundaria' : 'chip-neutra'}`}>
                {vigente ? 'ativa' : l.status.toLowerCase()}
              </span>
            </div>
          );
        })}

        {proximaAVencer && (
          <p className="caption suave" style={{ marginTop: 14 }}>
            <Icone nome="timer" tamanho={16} /> O acesso mais próximo de vencer termina em{' '}
            <strong>{DATA(proximaAVencer.fimEm)}</strong>. A renovação é feita pela empresa —
            você não precisa fazer nada.
          </p>
        )}
      </div>

      {comPrazo.length > 0 && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Prazos de conclusão</h2>
          <p className="caption suave" style={{ marginBottom: 16 }}>
            O prazo é da trilha, não da licença: ele diz até quando concluir, e não até
            quando o acesso dura.
          </p>
          {comPrazo.map((t) => (
            <div
              key={t.materiaId}
              style={{
                display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid var(--surface-container)', flexWrap: 'wrap',
              }}
            >
              <span>
                <strong className="label-md">
                  <Link href={`/materia/${t.trilhaSlug}`}>{t.trilha}</Link>
                </strong>
                <div className="caption suave">
                  {t.aulasConcluidas} de {t.aulasTotal} aula(s) · prazo {DATA(t.prazoEm!)}
                </div>
              </span>
              <span className={`chip chip-sm ${t.situacao === 'atrasada' ? 'chip-erro' : 'chip-neutra'}`}>
                {t.situacao === 'atrasada' ? 'prazo vencido' : 'em dia'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 8 }}>Quem libera o acesso</h2>
        <p className="suave" style={{ fontSize: 15 }}>
          Nesta empresa o treinamento é contratado pela {portal.nomeExibicao}, e as trilhas
          são liberadas por pessoa ou por setor. Você não contrata nem paga nada aqui.
          {obrigatorias.length > 0 && (
            <>
              {' '}
              {obrigatorias.length === 1
                ? '1 trilha é obrigatória'
                : `${obrigatorias.length} trilhas são obrigatórias`} para você.
            </>
          )}
          {portal.personalizacao.contato && (
            <> Para pedir uma trilha nova ou tirar dúvidas, fale com {portal.personalizacao.contato}.</>
          )}
        </p>
      </div>

      {portal.personalizacao.sobre && (
        <div className="cartao">
          <h2 className="headline-md">Sobre o programa</h2>
          {portal.personalizacao.sobre.split('\n\n').map((p, i) => (
            <p key={i} style={{ marginTop: 10 }}>{p}</p>
          ))}
        </div>
      )}
    </>
  );
}

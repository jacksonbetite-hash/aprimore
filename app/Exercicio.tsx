'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Icone } from './ui.tsx';
import type { Questao, RespostaDada } from '../lib/exercicio.ts';

/**
 * Exercício da aula (§5.3 e §5.5): correção imediata e comentário em
 * TODAS as alternativas — inclusive nas que o aluno não marcou.
 * O comentário vem no formato "Comentário da Professora" do design
 * system, com o artigo citado ao alcance da mão.
 *
 * Uma questão por vez. As N questões vinham empilhadas numa página só, e
 * o aluno respondia a primeira e tinha de rolar — passando pelo
 * comentário inteiro — até achar a segunda. Agora a tela é um passo a
 * passo: marcadores numerados no alto (clicáveis, para reler qualquer
 * questão já respondida), a questão atual, e "Próxima questão" depois
 * de responder. A última leva ao resultado, que é de onde se segue para
 * a próxima aula. Plano em docs/plano-exercicio-sequencial.md.
 *
 * O que o aluno já respondeu vem do banco (`respondidas`) e abre a tela
 * no estado em que ele a deixou: na primeira questão pendente, ou no
 * resultado se não há pendente. Refazer continua permitido, e de
 * propósito — é assim que a questão errada sai do caderno de erros
 * (§5.2) —, mas é um clique deliberado, não o efeito de recarregar.
 */
export default function Exercicio(
  { questoes, professor, respondidas: jaRespondidas = [], proxima }:
  {
    questoes: Questao[]; professor?: string | null; respondidas?: RespostaDada[];
    /** Para onde ir quando o exercício termina; null na última aula do curso. */
    proxima?: { href: string; titulo: string } | null;
  },
) {
  const [respostas, setRespostas] = useState<Record<number, number>>(
    () => Object.fromEntries(
      jaRespondidas.map((r) => [Number(r.questaoId), Number(r.alternativaId)]),
    ),
  );
  /* Quais vieram do banco: a etiqueta "respondida em tal dia" só vale
     para elas, e sai assim que o aluno refaz a questão nesta visita. */
  const [antigas, setAntigas] = useState<Record<number, string>>(
    () => Object.fromEntries(jaRespondidas.map((r) =>
      [Number(r.questaoId), new Date(r.respondidaEm).toLocaleDateString('pt-BR')])),
  );
  /* Onde a tela abre: primeira pendente; sem pendente, o resultado.
     `atual === questoes.length` é o resultado — um passo depois da última. */
  const [atual, setAtual] = useState<number>(() => {
    const pendente = questoes.findIndex((q) => !jaRespondidas.some((r) => Number(r.questaoId) === q.id));
    return pendente >= 0 ? pendente : questoes.length;
  });
  const topo = useRef<HTMLElement>(null);

  const acertou = (q: Questao) => q.alternativas.some((a) => a.id === respostas[q.id] && a.correta);
  const respondidas = questoes.filter((q) => respostas[q.id]).length;
  const acertos = questoes.filter(acertou).length;
  const erradas = questoes.filter((q) => respostas[q.id] && !acertou(q));
  const pct = questoes.length ? Math.round((acertos / questoes.length) * 100) : 0;

  /* Trocar de passo leva a vista ao topo do exercício: com o comentário
     longo da questão anterior, a próxima nasceria abaixo da dobra e o
     aluno acharia que o clique não fez nada. */
  function irPara(i: number) {
    setAtual(i);
    topo.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function responder(questaoId: number, alternativaId: number) {
    if (respostas[questaoId]) return;                 // uma tentativa por vez
    setRespostas((r) => ({ ...r, [questaoId]: alternativaId }));
    fetch('/api/resposta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questaoId, alternativaId }),
    }).catch(() => {});                                // o feedback não espera a rede
  }

  /** Solta a questão para nova tentativa — só na tela; o histórico fica. */
  function refazer(questaoId: number) {
    setRespostas(({ [questaoId]: _fora, ...resto }) => resto);
    setAntigas(({ [questaoId]: _tambemFora, ...resto }) => resto);
  }

  /** "Refazer as que errei": libera todas as erradas e vai para a primeira. */
  function refazerErradas() {
    const ids = erradas.map((q) => q.id);
    setRespostas((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !ids.includes(Number(k)))));
    setAntigas((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !ids.includes(Number(k)))));
    const primeira = questoes.findIndex((q) => ids.includes(q.id));
    irPara(primeira >= 0 ? primeira : 0);
  }

  if (questoes.length === 0) {
    return (
      <section id="exercicio" ref={topo}>
        <p className="vazio">O exercício desta aula ainda está sendo escrito.</p>
      </section>
    );
  }

  const noResultado = atual >= questoes.length;
  const q = noResultado ? null : questoes[atual];

  return (
    <section id="exercicio" ref={topo} style={{ scrollMarginTop: 88 }}>
      <div className="barra-exercicio">
        <span className="rotulo">Progresso</span>
        <div className="progresso terciaria">
          <i style={{ width: `${(respondidas / questoes.length) * 100}%` }} />
        </div>
        <span className="contador">{respondidas} / {questoes.length}</span>
      </div>

      {/* Os passos: um marcador por questão, mais o do resultado. Clicável
          para reler qualquer questão — a sequência é o caminho de ida,
          não uma tranca. */}
      <ol className="passos-exercicio" aria-label="Questões do exercício">
        {questoes.map((qq, i) => {
          const estado = !respostas[qq.id] ? 'pendente' : acertou(qq) ? 'certa' : 'errada';
          return (
            <li key={qq.id}>
              <button type="button" className={`passo ${estado}${atual === i ? ' atual' : ''}`}
                      aria-current={atual === i ? 'step' : undefined}
                      aria-label={`Questão ${i + 1}${estado === 'pendente' ? '' : estado === 'certa' ? ', acertou' : ', errou'}`}
                      onClick={() => irPara(i)}>
                {estado === 'certa' ? <Icone nome="check" tamanho={16} />
                  : estado === 'errada' ? <Icone nome="close" tamanho={16} /> : i + 1}
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" className={`passo resultado${noResultado ? ' atual' : ''}`}
                  aria-current={noResultado ? 'step' : undefined} aria-label="Resultado"
                  disabled={respondidas === 0} onClick={() => irPara(questoes.length)}>
            <Icone nome="flag" tamanho={16} />
          </button>
        </li>
      </ol>

      {q ? (
        <QuestaoAtual
          key={q.id} q={q} indice={atual} total={questoes.length} professor={professor}
          marcada={respostas[q.id]} antiga={antigas[q.id]}
          responder={(alt) => responder(q.id, alt)} refazer={() => refazer(q.id)}
          anterior={atual > 0 ? () => irPara(atual - 1) : null}
          proxima={() => irPara(atual + 1)} ultima={atual === questoes.length - 1}
        />
      ) : (
        <div className="resultado-exercicio" aria-live="polite">
          <span className="chip chip-sm chip-primaria">Resultado</span>
          <strong style={{ marginTop: 10 }}>
            {respondidas < questoes.length
              ? `${respondidas} de ${questoes.length} respondidas — ${acertos} ${acertos === 1 ? 'acerto' : 'acertos'}`
              : `Exercício concluído — ${acertos} de ${questoes.length} (${pct}%)`}
          </strong>
          <p>
            {respondidas < questoes.length
              ? 'Ainda há questão sem resposta. Volte a ela pelos marcadores acima.'
              : pct >= 80
                ? 'Mandou bem. Pode seguir para a próxima aula com tranquilidade.'
                : 'Vale rever o resumo antes de seguir — as questões erradas já estão no seu caderno de erros.'}
          </p>

          <ol className="lista-resultado">
            {questoes.map((qq, i) => {
              const estado = !respostas[qq.id] ? 'pendente' : acertou(qq) ? 'certa' : 'errada';
              return (
                <li key={qq.id}>
                  <button type="button" onClick={() => irPara(i)}>
                    <span className={`marca ${estado}`}>
                      <Icone nome={estado === 'certa' ? 'check' : estado === 'errada' ? 'close' : 'radio_button_unchecked'} tamanho={16} />
                    </span>
                    <span className="texto">
                      <strong>Questão {i + 1}</strong>
                      <span>{qq.enunciado}</span>
                    </span>
                    <span className="caption suave">
                      {estado === 'certa' ? 'acertou' : estado === 'errada' ? 'errou' : 'sem resposta'}
                      {antigas[qq.id] ? ` · ${antigas[qq.id]}` : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="acoes-linha" style={{ marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
            {erradas.length > 0 && (
              <button className="btn btn-contorno" type="button" onClick={refazerErradas}>
                <Icone nome="replay" tamanho={18} /> Refazer as que errei ({erradas.length})
              </button>
            )}
            {proxima ? (
              <Link className="btn btn-primario" href={proxima.href}>
                Próxima aula: {proxima.titulo} <Icone nome="arrow_forward" tamanho={18} />
              </Link>
            ) : (
              <Link className="btn btn-primario" href="/painel">
                Ver meu progresso <Icone nome="arrow_forward" tamanho={18} />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Uma questão: enunciado, alternativas e, depois de marcar, o comentário e a navegação. */
function QuestaoAtual({
  q, indice, total, professor, marcada, antiga, responder, refazer, anterior, proxima, ultima,
}: {
  q: Questao; indice: number; total: number; professor?: string | null;
  marcada: number | undefined; antiga: string | undefined;
  responder: (alternativaId: number) => void; refazer: () => void;
  anterior: (() => void) | null; proxima: () => void; ultima: boolean;
}) {
  const acertou = q.alternativas.some((a) => a.id === marcada && a.correta);
  const multipla = q.alternativas.length > 2;
  const artigo = /art\.?\s*\d+/i.exec(q.alternativas.find((a) => a.correta)?.comentario ?? '')?.[0];

  return (
    <div className="questao-atual" aria-live="polite">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="chip chip-primaria chip-sm">Questão {indice + 1} de {total}</span>
        <span className="chip chip-neutra chip-sm">{q.origem}</span>
        {marcada && (
          <span className={`chip chip-sm ${acertou ? 'chip-secundaria' : 'chip-erro'}`}>
            <Icone nome={acertou ? 'check_circle' : 'cancel'} tamanho={14} />
            {acertou ? 'você acertou' : 'você errou'}
            {antiga ? ` · em ${antiga}` : ''}
          </span>
        )}
      </div>
      <p className="enunciado">{q.enunciado}</p>

      {q.alternativas.map((a, j) => {
        const letra = String.fromCharCode(65 + j);
        let classe = '';
        if (marcada) {
          if (a.correta) classe = ' certa';
          else if (a.id === marcada) classe = ' errada';
          else classe = ' apagada';
        }
        return (
          <button
            className={`alternativa${classe}`} key={a.id}
            disabled={Boolean(marcada)}
            onClick={() => responder(a.id)}
          >
            <span className="letra">
              {marcada && a.correta ? <Icone nome="check" tamanho={16} /> : letra}
            </span>
            <span>{a.texto}</span>
          </button>
        );
      })}

      {marcada && (
        <div className="comentario">
          <div className="cabeca">
            <div>
              <strong>Comentário {professor?.startsWith('Prof.ª') ? 'da Professora' : 'do Professor'}</strong>
              <span>{professor ?? 'Equipe Aprimore o Saber'}</span>
            </div>
            <span className="xp"><Icone nome="bolt" tamanho={14} /> {acertou ? '+10 XP' : '+3 XP'}</span>
          </div>

          <p style={{ fontWeight: 700, marginBottom: 12, color: acertou ? 'var(--on-secondary-fixed-variant)' : 'var(--on-error-container)' }}>
            {acertou ? 'Excelente escolha!' : 'Não foi dessa vez — e tudo bem, é assim que fixa.'}
          </p>

          {q.alternativas.map((a, j) => (
            <div className="caixa" key={a.id}>
              <b>{multipla ? `${String.fromCharCode(65 + j)}) ` : `${a.texto}: `}</b>
              {a.comentario}
            </div>
          ))}

          <div className="acoes">
            {artigo && (
              <a className="btn btn-primario btn-sm" href={`/vademecum?q=${encodeURIComponent(artigo)}`}>
                <Icone nome="menu_book" tamanho={18} /> Ler {artigo}
              </a>
            )}
            {!acertou && (
              <span className="chip chip-primaria">
                <Icone nome="replay" tamanho={16} /> Foi para o seu caderno de erros
              </span>
            )}
            {/* Refazer é o que tira a questão do caderno de erros (§5.2):
                vale a ÚLTIMA resposta de cada questão. */}
            <button className="btn btn-contorno btn-sm" type="button" onClick={refazer}>
              <Icone nome="replay" tamanho={18} /> Refazer esta questão
            </button>
          </div>
        </div>
      )}

      {/* A navegação só aparece depois de responder: a sequência é o
          método (§5.3 — toda aula termina em exercício, questão a
          questão). Voltar é sempre possível. */}
      <div className="nav-exercicio">
        {anterior
          ? <button className="btn btn-contorno btn-sm" type="button" onClick={anterior}><Icone nome="arrow_back" tamanho={18} /> Anterior</button>
          : <span />}
        {marcada && (
          <button className="btn btn-primario" type="button" onClick={proxima}>
            {ultima ? 'Ver resultado' : 'Próxima questão'} <Icone nome="arrow_forward" tamanho={18} />
          </button>
        )}
      </div>
    </div>
  );
}

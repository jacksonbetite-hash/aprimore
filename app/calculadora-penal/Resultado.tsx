import Link from 'next/link';
import { Icone } from '../ui.tsx';
import BotoesResultado from './BotoesResultado.tsx';
import { partirDispositivo } from '../../lib/vademecum-texto.ts';
import type { Dispositivo } from '../../lib/vademecum.ts';
import type { Caso, Passo, PrescricaoDoCrime, Ref, Resultado as TipoResultado, Trecho } from '../../lib/penas/tipos.ts';
import { chaveRef } from '../../lib/penas/referencias.ts';
import { dataBR, formatarPena, mesesTexto } from '../../lib/penas/tempo.ts';
import { CATALOGO_CONFERIDO_EM } from '../../lib/penas/catalogo/index.ts';

/**
 * O resultado da Calculadora Penal (§5.12), renderizado no servidor.
 *
 * Cada número vem com o dispositivo que o sustenta, e o dispositivo vem
 * do acervo do vade-mécum — com link para ele e para a aula que o
 * explica. É a "memória de cálculo pedagógica" do plano: o resultado sem
 * a explicação seria só um número em que acreditar.
 */

interface Props {
  resultado: TipoResultado;
  caso: Caso;
  dispositivos: Map<string, Dispositivo>;
  aulasPorDispositivo: Map<number, { slug: string; titulo: string }[]>;
  param: string;
}

const FASES: Record<number, string> = { 0: 'Cominada', 1: '1ª fase', 2: '2ª fase', 3: '3ª fase', 4: 'Concurso' };
const NOME_FASE: Record<Trecho['fase'], string> = { INQUERITO: 'Investigação', INSTRUCAO: 'Ação penal', JURI: 'Júri', RECURSO: 'Recurso', EXECUCAO: 'Execução' };
const NOME_MODALIDADE: Record<string, string> = {
  PUNITIVA_ABSTRATA: 'punitiva, pela pena máxima em abstrato', RETROATIVA: 'retroativa, pela pena aplicada',
  INTERCORRENTE: 'intercorrente, pela pena aplicada', EXECUTORIA: 'executória, pela pena aplicada', MULTA: 'da multa', NENHUMA: '—',
};
const NOME_SITUACAO: Record<Trecho['situacao'], string> = {
  PRESCRITO: 'prescrito', CORRENDO: 'em curso', INTERROMPIDO: 'interrompido a tempo', FALTA_DADO: 'falta data',
  IMPRESCRITIVEL: 'imprescritível', NAO_CORRE: 'não corre',
};
const NOME_REGIME = { FECHADO: 'fechado', SEMIABERTO: 'semiaberto', ABERTO: 'aberto' } as const;

export default function Resultado({ resultado: r, caso, dispositivos, aulasPorDispositivo, param }: Props) {
  const ref = (base: Ref) => dispositivos.get(chaveRef(base));
  const RefLei = ({ base, texto }: { base: Ref; texto?: string }) => {
    const d = ref(base);
    const rotulo = texto ?? (d ? `${d.normaSigla}, ${d.rotulo.replace(/^Art\./, 'art.')}` : `${base.norma}, ${base.rotulo}`);
    if (!d) return <span className="calc-ref" style={{ color: 'var(--on-surface-variant)' }}>{rotulo}</span>;
    return <Link className="calc-ref" href={`/vademecum?norma=${d.normaSlug}&artigo=${d.id}#d${d.id}`} title="Abrir no vade-mécum">{rotulo}</Link>;
  };
  const Artigo = ({ base, aberto = false }: { base: Ref; aberto?: boolean }) => {
    const d = ref(base);
    if (!d) return null;
    const aulas = aulasPorDispositivo.get(d.id) ?? [];
    return (
      <details className="calc-artigo" open={aberto}>
        <summary>Texto do {d.rotulo} — {d.normaSigla}</summary>
        <div className="corpo vade-corpo">
          {partirDispositivo(d.texto).map((b, i) => {
            const k = `${b.tipo}-${i}`;
            if (b.tipo === 'inciso' || b.tipo === 'alinea' || b.tipo === 'item') return <p key={k} className={`vade-${b.tipo}`}><span className="marcador">{b.rotulo}{b.tipo === 'inciso' ? ' -' : ')'}</span><span className="texto-lei">{b.texto}</span></p>;
            if (b.tipo === 'paragrafo') return <p key={k} className="vade-paragrafo"><strong>{b.rotulo}</strong> <span className="texto-lei">{b.texto}</span></p>;
            if (b.tipo === 'pena') return <p key={k} className="vade-pena"><strong>{b.rotulo} —</strong> <span className="texto-lei">{b.texto}</span></p>;
            if (b.tipo === 'rubrica') return <p key={k} className="vade-rubrica">{b.texto}</p>;
            return <p key={k} className="texto-lei">{b.texto}</p>;
          })}
        </div>
        <p className="carimbo">
          <Link href={`/vademecum?norma=${d.normaSlug}&artigo=${d.id}#d${d.id}`}>Abrir no vade-mécum</Link>
          {aulas.length > 0 && <> · Explicado na aula: {aulas.map((a, i) => <span key={a.slug}>{i > 0 && ', '}<Link href={`/aula/${a.slug}`}>{a.titulo}</Link></span>)}</>}
        </p>
      </details>
    );
  };
  const Chip = ({ cabivel }: { cabivel: boolean | 'DEPENDE' }) => (
    <span className={`chip chip-sm ${cabivel === true ? 'chip-sim' : cabivel === 'DEPENDE' ? 'chip-depende' : 'chip-nao'}`}>
      {cabivel === true ? 'cabível' : cabivel === 'DEPENDE' ? 'depende' : 'não cabe'}
    </span>
  );

  const u = r.unificacao;
  const q = r.consequencias;
  const especie = u.especiePrevalente === 'RECLUSAO' ? 'reclusão' : u.especiePrevalente === 'DETENCAO' ? 'detenção' : 'prisão simples';
  let n = 0;

  return (
    <>
      <header className="calc-topo">
        <span className="rotulo">Pena definitiva{r.crimes.length > 1 ? ` · ${r.crimes.length} crimes` : ''}</span>
        <div className="pena">
          {formatarPena(u.totalDias)} <small>de {especie}</small>
          {u.diasMultaTotal !== null && (
            <small> · {u.diasMultaTotal} dias-multa{u.multaReais !== null && ` (R$ ${u.multaReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}</small>
          )}
        </div>
        <div className="chips">
          <span className="chip chip-sm chip-primaria">regime inicial {NOME_REGIME[q.regime.inicial]}</span>
          {r.crimes.map((c) => <span key={c.tipoId} className="chip chip-sm chip-contorno">{c.nome} · {formatarPena(c.penaDefinitivaDias)}</span>)}
          <span className="chip chip-sm chip-neutra">fato em {dataBR(caso.datas.fato)} · calculado em {dataBR(r.hoje)}</span>
        </div>
        <BotoesResultado param={param} />
      </header>

      {r.avisos.length > 0 && (
        <ul className="calc-avisos">
          {r.avisos.map((a, i) => <li key={i}><Icone nome="info" tamanho={16} /> <span>{a}</span></li>)}
        </ul>
      )}

      {r.crimes.map((c, i) => (
        <section className="calc-secao" key={`${c.tipoId}-${i}`}>
          <h2><Icone nome="calculate" tamanho={22} /> {++n}. Dosimetria — {c.nome} <small style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}>({c.rotuloCompleto})</small></h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="calc-memoria">
              <thead><tr><th>Fase</th><th>Operação</th><th>Pena</th><th>Base legal</th></tr></thead>
              <tbody>
                {c.memoria.map((p, j) => <LinhaPasso key={j} p={p} RefLei={RefLei} />)}
              </tbody>
            </table>
          </div>
          {c.avisos.length > 0 && <ul className="calc-avisos">{c.avisos.map((a, j) => <li key={j}><Icone nome="info" tamanho={16} /> <span>{a}</span></li>)}</ul>}
          <Artigo base={c.memoria[0].base} aberto={i === 0} />
          <ArtigosCitados passos={c.memoria.slice(1)} Artigo={Artigo} />
        </section>
      ))}

      {u.passos.length > 0 && (
        <section className="calc-secao">
          <h2><Icone nome="balance" tamanho={22} /> {++n}. Concurso de crimes e limite de cumprimento</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="calc-memoria">
              <thead><tr><th>Regra</th><th>Operação</th><th>Pena</th><th>Base legal</th></tr></thead>
              <tbody>{u.passos.map((p, j) => <LinhaPasso key={j} p={p} RefLei={RefLei} />)}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="calc-secao">
        <h2><Icone nome="lock" tamanho={22} /> {++n}. Regime, substituição, sursis e despenalizadores</h2>
        <div className="calc-cartoes">
          <div className="calc-cartao">
            <h3>Regime inicial <RefLei base={q.regime.base} /></h3>
            <span className="destaque">{NOME_REGIME[q.regime.inicial]}</span>
            <p>{q.regime.fundamento}</p>
            {q.regime.avisos.map((a, i) => <p key={i}>{a}</p>)}
          </div>
          <div className="calc-cartao">
            <h3>Substituição por restritiva de direitos <Chip cabivel={q.substituicao.cabivel} /></h3>
            <p>{q.substituicao.motivo} <RefLei base={q.substituicao.base} /></p>
          </div>
          <div className="calc-cartao">
            <h3>Sursis {q.sursis.modalidade === 'ETARIO_HUMANITARIO' ? 'etário/humanitário' : ''} <Chip cabivel={q.sursis.cabivel} /></h3>
            <p>{q.sursis.motivo} <RefLei base={q.sursis.base} /></p>
          </div>
          {q.despenalizadores.map((d) => (
            <div className="calc-cartao" key={d.nome}>
              <h3>{d.nome} <Chip cabivel={d.cabivel} /></h3>
              <p>{d.motivo} <RefLei base={d.base} /></p>
            </div>
          ))}
        </div>
        <Artigo base={q.regime.base} />
        <Artigo base={q.substituicao.base} />
      </section>

      <section className="calc-secao">
        <h2><Icone nome="schedule" tamanho={22} /> {++n}. Execução — progressão e livramento</h2>
        <p className="dica" style={{ color: 'var(--on-surface-variant)', fontSize: 13.5 }}>Redação da LEP aplicada pela data do fato: <strong>{q.execucao.versao}</strong>.</p>
        <div className="calc-cartoes">
          <div className="calc-cartao">
            <h3>Progressão de regime <RefLei base={q.execucao.progressao.base} /></h3>
            <span className="destaque">{q.execucao.progressao.fracaoTexto} · {formatarPena(q.execucao.progressao.diasNecessarios)}</span>
            <p>{q.execucao.progressao.fundamento}</p>
            {q.execucao.progressao.data && <p><strong>Data possível: {dataBR(q.execucao.progressao.data)}</strong></p>}
          </div>
          <div className="calc-cartao">
            <h3>Livramento condicional <Chip cabivel={q.execucao.livramento.cabivel} /></h3>
            {q.execucao.livramento.fracaoTexto && <span className="destaque">{q.execucao.livramento.fracaoTexto} · {formatarPena(q.execucao.livramento.diasNecessarios ?? 0)}</span>}
            <p>{q.execucao.livramento.fundamento} <RefLei base={q.execucao.livramento.base} /></p>
            {q.execucao.livramento.data && <p><strong>Data possível: {dataBR(q.execucao.livramento.data)}</strong></p>}
          </div>
        </div>
        <Artigo base={q.execucao.progressao.base} />
      </section>

      {r.prescricao.map((p, i) => (
        <section className="calc-secao" key={`presc-${i}`}>
          <h2><Icone nome="timeline" tamanho={22} /> {++n}. Prescrição e linha do tempo do processo{r.prescricao.length > 1 ? ` — ${p.nome}` : ''}</h2>
          <LinhaDoTempo p={p} />
          <h3>Prazos deste crime</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="calc-memoria calc-prazos">
              <thead><tr><th>Modalidade</th><th>Pena de referência</th><th>Prazo</th><th>Como se chegou</th></tr></thead>
              <tbody>
                {p.prazos.map((z) => (
                  <tr key={z.modalidade}>
                    <td className="fase">{NOME_MODALIDADE[z.modalidade]}</td>
                    <td className="valor">{z.modalidade === 'MULTA' ? '—' : formatarPena(z.penaReferenciaDias)}</td>
                    <td className="valor">{p.imprescritivel ? 'não prescreve' : mesesTexto(z.prazoMeses)}</td>
                    <td className="detalhe">{z.composicao.join(' ')} <span className="base">{z.base.map((b, k) => <span key={k}>{k > 0 && ' · '}<RefLei base={b} /></span>)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.avisos.length > 0 && <ul className="calc-avisos">{p.avisos.map((a, j) => <li key={j}><Icone nome="info" tamanho={16} /> <span>{a}</span></li>)}</ul>}
          <Artigo base={{ norma: 'cp', rotulo: 'Art. 109' }} />
          <Artigo base={{ norma: 'cp', rotulo: 'Art. 110' }} />
          <Artigo base={{ norma: 'cp', rotulo: 'Art. 117' }} />
        </section>
      ))}

      <section className="calc-secao">
        <h2><Icone nome="fact_check" tamanho={22} /> {++n}. Decadência e perempção</h2>
        <div className="calc-cartoes">
          <div className="calc-cartao">
            <h3>Decadência {r.decadencia.aplicavel ? <span className={`chip chip-sm ${r.decadencia.situacao === 'DECAIU' ? 'chip-nao' : r.decadencia.situacao === 'NO_PRAZO' ? 'chip-depende' : 'chip-sim'}`}>{{ DECAIU: 'decaiu', NO_PRAZO: 'no prazo', EXERCIDA: 'exercida no prazo', FALTA_DADO: 'falta data' }[r.decadencia.situacao ?? 'FALTA_DADO']}</span> : <span className="chip chip-sm chip-neutra">não se aplica</span>}</h3>
            {r.decadencia.aplicavel && r.decadencia.ultimoDia && <span className="destaque">até {dataBR(r.decadencia.ultimoDia)}</span>}
            <p>{r.decadencia.motivo} {r.decadencia.base.map((b, k) => <span key={k}>{k > 0 && ' · '}<RefLei base={b} /></span>)}</p>
          </div>
          <div className="calc-cartao">
            <h3>Perempção {r.perempcao.aplicavel ? <span className="chip chip-sm chip-primaria">ação privada</span> : <span className="chip chip-sm chip-neutra">não se aplica</span>}</h3>
            <p>{r.perempcao.motivo} {r.perempcao.base.map((b, k) => <span key={k}>{k > 0 && ' · '}<RefLei base={b} /></span>)}</p>
            {r.perempcao.hipoteses.length > 0 && (
              <ul className="calc-explica">
                {r.perempcao.hipoteses.map((h) => (
                  <li key={h.inciso}>
                    <strong>Inciso {h.inciso}</strong>{h.situacao && h.situacao !== 'FALTA_DADO' && <> · <span style={{ color: h.situacao === 'PEREMPTA' ? 'var(--error)' : 'var(--tertiary)', fontWeight: 700 }}>{h.situacao === 'PEREMPTA' ? 'perempta' : 'no prazo'}</span></>}
                    {' — '}{h.descricao}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Artigo base={{ norma: 'cp', rotulo: 'Art. 103' }} />
        <Artigo base={{ norma: 'cpp', rotulo: 'Art. 60' }} />
      </section>

      <section className="calc-secao">
        <h2><Icone nome="person" tamanho={22} /> {++n}. Ficha do caso — o que o motor deduziu dos seus dados</h2>
        <table className="calc-ficha">
          <tbody>
            {r.ficha.map((f, i) => (
              <tr key={i}>
                <th>{f.rotulo}</th>
                <td>{f.valor}{f.efeito && <small>{f.efeito}{f.base && <> <RefLei base={f.base} /></>}</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="dica" style={{ fontSize: 12.5, color: 'var(--on-surface-variant)' }}>
          Catálogo de penas e causas conferido no acervo em {dataBR(CATALOGO_CONFERIDO_EM)}. Onde a jurisprudência diverge, o critério aplicado está dito no passo e pode ser trocado em “Critérios de cálculo”.
        </p>
      </section>
    </>
  );
}

function LinhaPasso({ p, RefLei }: { p: Passo; RefLei: (props: { base: Ref }) => React.ReactNode }) {
  return (
    <tr>
      <td className="fase">{FASES[p.fase]}</td>
      <td>
        <strong>{p.titulo}</strong>{p.fracao && <> <span className="chip chip-sm chip-neutra">{p.fracao}</span></>}
        <div className="detalhe">{p.detalhe}</div>
      </td>
      <td className="valor">
        {p.fase === 0
          ? <>{formatarPena(p.deDias)} <span className="de">a</span> {formatarPena(p.paraDias)}</>
          : p.deDias === 0 && p.paraDias === 0
            ? '—'
            : <><span className="de">{formatarPena(p.deDias)} →</span> {formatarPena(p.paraDias)}</>}
      </td>
      <td className="base"><RefLei base={p.base} /></td>
    </tr>
  );
}

function ArtigosCitados({ passos, Artigo }: { passos: Passo[]; Artigo: (props: { base: Ref }) => React.ReactNode }) {
  const vistos = new Set<string>();
  const bases: Ref[] = [];
  for (const p of passos) {
    const k = chaveRef(p.base);
    if (vistos.has(k)) continue;
    vistos.add(k);
    bases.push(p.base);
  }
  return <>{bases.map((b) => <Artigo key={chaveRef(b)} base={b} />)}</>;
}

function LinhaDoTempo({ p }: { p: PrescricaoDoCrime }) {
  return (
    <div className="calc-linha">
      <p style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
        Fase atual: <strong>{p.faseAtual === 'FATO' ? 'fato' : NOME_FASE[p.faseAtual]}</strong>. Em cada trecho corre uma modalidade de prescrição; o marco final interrompe o prazo, que recomeça do zero (art. 117, § 2º).
      </p>
      <div className="calc-trilha" role="list">
        {p.trechos.map((t, i) => {
          const total = t.prazoMeses ? t.prazoMeses * 30 : 0;
          const pct = total && t.diasCorridos !== null ? Math.min(100, Math.round((t.diasCorridos / total) * 100)) : 0;
          return (
            <div className={`calc-trecho ${t.situacao}`} role="listitem" key={i}>
              <span className="fase">{NOME_FASE[t.fase]}</span>
              <span className="datas">{dataBR(t.inicio)} → {t.fim ? dataBR(t.fim) : 'hoje'}</span>
              <span className="modal">{NOME_MODALIDADE[t.modalidade]}</span>
              {t.prazoMeses !== null && <span>prazo {mesesTexto(t.prazoMeses)}{t.vencimento && <> · vence {dataBR(t.vencimento)}</>}</span>}
              {t.prazoMeses !== null && <div className="calc-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>}
              <span className="situacao">
                {NOME_SITUACAO[t.situacao]}
                {t.situacao === 'CORRENDO' && t.diasRestantes !== null && ` · faltam ${t.diasRestantes} dias`}
                {t.situacao === 'INTERROMPIDO' && t.diasCorridos !== null && ` · correu ${t.diasCorridos} dias`}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="calc-explica">
        {p.trechos.map((t, i) => (
          <li key={i}><strong>{t.titulo}:</strong> {t.explicacao} <em style={{ color: 'var(--on-surface-variant)' }}>Marcos: {t.marcoInicial} → {t.marcoFinal}.</em></li>
        ))}
      </ul>
    </div>
  );
}

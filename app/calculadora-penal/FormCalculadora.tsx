'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icone } from '../ui.tsx';
import type { Caso, Causa, Circunstancia59, CrimeDoCaso, Fracao, TipoPenal } from '../../lib/penas/tipos.ts';
import {
  tiposParaEscolha, tipoPorId, causasDoTipo, NORMAS_DO_CATALOGO, AGRAVANTES, ATENUANTES, rotuloCompleto,
} from '../../lib/penas/catalogo/index.ts';
import { calcular, ErroDeCalculo } from '../../lib/penas/calcular.ts';
import { serializarCaso, crimeVazio, casoInicial } from '../../lib/penas/url.ts';
import { formatarPena, fracaoTexto, fracaoValor, fracaoIgual, F, dataBR } from '../../lib/penas/tempo.ts';

/**
 * O formulário da Calculadora Penal (§5.12).
 *
 * Componente de cliente porque o caso é montado aos poucos e a prévia da
 * pena responde a cada clique — o mesmo `calcular` do servidor roda aqui,
 * sem banco. "Ver resultado completo" não envia nada: coloca o caso na
 * URL e navega; a página do servidor faz o resto, com o texto da lei.
 */

const NOMES_59: { chave: Circunstancia59; nome: string; dica: string }[] = [
  { chave: 'culpabilidade', nome: 'Culpabilidade', dica: 'grau de reprovação da conduta, além do normal do tipo' },
  { chave: 'antecedentes', nome: 'Antecedentes', dica: 'condenação definitiva anterior que não configure reincidência (Súmula 444)' },
  { chave: 'conduta_social', nome: 'Conduta social', dica: 'comportamento na comunidade, família e trabalho' },
  { chave: 'personalidade', nome: 'Personalidade', dica: 'exige elementos concretos nos autos' },
  { chave: 'motivos', nome: 'Motivos', dica: 'se não forem elementares nem agravantes' },
  { chave: 'circunstancias', nome: 'Circunstâncias', dica: 'modo, lugar, tempo e meios, além do comum' },
  { chave: 'consequencias', nome: 'Consequências', dica: 'dano que extrapola o resultado natural do crime' },
  { chave: 'comportamento_vitima', nome: 'Comportamento da vítima', dica: 'só pode favorecer o réu (neutra ou favorável)' },
];

/* Vêm dos dados do agente e da vítima; marcar de novo duplicaria. */
const AUTOMATICAS = new Set(['ag-reincidencia', 'at-menoridade', 'at-senilidade', 'at-confissao']);

const FRACOES = [F.UM_SEXTO, F.UM_QUINTO, F.UM_QUARTO, F.UM_TERCO, { num: 3, den: 8 }, { num: 5, den: 12 }, F.METADE, F.DOIS_TERCOS, { num: 3, den: 4 }, F.INTEIRO, F.DOBRO];

function fracoesDe(causa: Causa): Fracao[] {
  if (causa.opcoes) return causa.opcoes;
  const min = fracaoValor(causa.fracaoMin), max = fracaoValor(causa.fracaoMax);
  const lista = FRACOES.filter((f) => fracaoValor(f) >= min && fracaoValor(f) <= max);
  if (!lista.some((f) => fracaoIgual(f, causa.fracaoMin))) lista.unshift(causa.fracaoMin);
  if (!lista.some((f) => fracaoIgual(f, causa.fracaoMax))) lista.push(causa.fracaoMax);
  return lista;
}

const nomeFracao = (f: Fracao, sinal: '+' | '-') =>
  sinal === '+' && fracaoIgual(f, F.INTEIRO) ? 'dobro' : sinal === '+' && fracaoIgual(f, F.DOBRO) ? 'triplo' : fracaoTexto(f);

export default function FormCalculadora({ inicial }: { inicial: Caso }) {
  const [caso, setCaso] = useState<Caso>(inicial);
  const router = useRouter();

  const previa = useMemo(() => {
    if (caso.crimes.length === 0) return { erro: 'Escolha o crime para ver a prévia.' };
    try {
      return { r: calcular(caso) };
    } catch (e) {
      return { erro: e instanceof ErroDeCalculo ? e.message : 'Não foi possível calcular com esses dados.' };
    }
  }, [caso]);

  const mudar = (fn: (c: Caso) => Caso) => setCaso((c) => fn(structuredClone(c)));
  const data = (_grupo: 'datas', chave: keyof Caso['datas']) => (v: string) => mudar((c) => {
    const datas = c.datas as unknown as Record<string, unknown>;
    if (v) datas[chave] = v; else delete datas[chave];
    return c;
  });
  const dataAgente = (chave: 'nascimento' | 'transitoAnterior' | 'extincaoAnterior') => (v: string) => mudar((c) => {
    if (v) c.agente[chave] = v; else delete c.agente[chave];
    return c;
  });

  function ver() {
    router.push(`/calculadora-penal?c=${serializarCaso(caso)}#resultado`);
  }
  function limpar() {
    setCaso(casoInicial());
    router.push('/calculadora-penal');
  }

  return (
    <form className="calc-form" onSubmit={(e) => { e.preventDefault(); ver(); }} aria-label="Dados do caso">
      <fieldset>
        <legend><span className="num">1</span> Data do fato e crime</legend>
        <CampoData rotulo="Data do fato" valor={caso.datas.fato} onChange={data('datas', 'fato')} obrigatoria
          dica="Escolhe a redação da lei aplicável e abre todos os prazos." />
        {caso.crimes.map((crime, i) => (
          <BlocoCrime
            key={i} indice={i} crime={crime} caso={caso}
            onChange={(novo) => mudar((c) => { c.crimes[i] = novo; return c; })}
            onRemove={caso.crimes.length > 1 ? () => mudar((c) => { c.crimes.splice(i, 1); if (c.crimes.length < 2) c.concurso = 'UNICO'; return c; }) : undefined}
          />
        ))}
        <div className="acoes-linha">
          <button type="button" className="btn btn-contorno btn-sm" onClick={() => mudar((c) => { c.crimes.push(crimeVazio(c.crimes[0]?.tipoId ?? 'cp-155')); if (c.crimes.length > 1 && c.concurso === 'UNICO') c.concurso = 'MATERIAL'; return c; })}>
            <Icone nome="edit_note" tamanho={16} /> {caso.crimes.length ? 'Adicionar outro crime' : 'Adicionar crime'}
          </button>
        </div>
        {caso.crimes.length > 1 && (
          <label>
            Concurso de crimes
            <select value={caso.concurso} onChange={(e) => mudar((c) => { c.concurso = e.target.value as Caso['concurso']; return c; })}>
              <option value="MATERIAL">Material (art. 69) — mais de uma ação, penas somadas</option>
              <option value="FORMAL">Formal próprio (art. 70) — uma ação, pena mais grave + 1/6 a 1/2</option>
              <option value="FORMAL_IMPROPRIO">Formal impróprio (art. 70, 2ª parte) — desígnios autônomos, penas somadas</option>
              <option value="CONTINUADO">Crime continuado (art. 71) — pena de um + 1/6 a 2/3</option>
            </select>
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend><span className="num">2</span> O agente</legend>
        <div className="calc-grade">
          <CampoData rotulo="Nascimento do agente" valor={caso.agente.nascimento} onChange={dataAgente('nascimento')}
            dica="Menor de 18: inimputável. Menor de 21 no fato ou maior de 70 na sentença: atenuante e prescrição pela metade." />
          <label className="calc-check" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={caso.agente.confessou ?? false} onChange={(e) => mudar((c) => { c.agente.confessou = e.target.checked; return c; })} />
            <span>Confessou espontaneamente (art. 65, III, d)</span>
          </label>
        </div>
        <label className="calc-check">
          <input type="checkbox" checked={caso.agente.reincidente} onChange={(e) => mudar((c) => { c.agente.reincidente = e.target.checked; return c; })} />
          <span>Tem condenação anterior transitada em julgado (reincidência, arts. 63 e 64)</span>
        </label>
        {caso.agente.reincidente && (
          <div className="calc-grade">
            <CampoData rotulo="Trânsito em julgado da condenação anterior" valor={caso.agente.transitoAnterior} onChange={dataAgente('transitoAnterior')} dica="Tem de ser anterior ao fato (art. 63)." />
            <CampoData rotulo="Pena anterior cumprida ou extinta em" valor={caso.agente.extincaoAnterior} onChange={dataAgente('extincaoAnterior')} dica="Mais de 5 anos antes do fato, a reincidência caduca (art. 64, I)." />
            <label className="calc-check">
              <input type="checkbox" checked={caso.agente.reincidenteDoloso ?? true} onChange={(e) => mudar((c) => { c.agente.reincidenteDoloso = e.target.checked; return c; })} />
              <span>A condenação anterior foi por crime doloso</span>
            </label>
            <label className="calc-check">
              <input type="checkbox" checked={caso.agente.reincidenteEspecifico ?? false} onChange={(e) => mudar((c) => { c.agente.reincidenteEspecifico = e.target.checked; return c; })} />
              <span>Pelo mesmo crime ou crime da mesma natureza (reincidência específica)</span>
            </label>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend><span className="num">3</span> A vítima</legend>
        <div className="calc-grade">
          <CampoData rotulo="Nascimento da vítima" valor={caso.vitima.nascimento} onChange={(v) => mudar((c) => { if (v) c.vitima.nascimento = v; else delete c.vitima.nascimento; return c; })}
            dica="Criança, maior de 60 e menor de 18 mudam agravante e prescrição." />
          <div style={{ display: 'grid', alignSelf: 'end' }}>
            <label className="calc-check">
              <input type="checkbox" checked={caso.vitima.mulher ?? false} onChange={(e) => mudar((c) => { c.vitima.mulher = e.target.checked; return c; })} />
              <span>Vítima mulher</span>
            </label>
            <label className="calc-check">
              <input type="checkbox" checked={caso.vitima.violenciaDomestica ?? false} onChange={(e) => mudar((c) => { c.vitima.violenciaDomestica = e.target.checked; return c; })} />
              <span>Contexto de violência doméstica e familiar (Lei 11.340/06, art. 5º)</span>
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend><span className="num">4</span> Datas do processo</legend>
        <p className="dica">Preencha o que já aconteceu. Cada data abre um trecho da linha do tempo; o que faltar fica marcado como “informe para calcular”.</p>
        <div className="calc-grade">
          <CampoData rotulo="Cessação da permanência" valor={caso.datas.cessacao} onChange={data('datas', 'cessacao')} dica="Só em crime permanente (art. 111, III)." />
          <CampoData rotulo="Conhecimento da autoria" valor={caso.datas.conhecimentoAutoria} onChange={data('datas', 'conhecimentoAutoria')} dica="Abre a decadência (art. 103). Em branco, presume-se a data do fato." />
          <CampoData rotulo="Representação ou queixa" valor={caso.datas.representacao} onChange={data('datas', 'representacao')} />
          <CampoData rotulo="Recebimento da denúncia" valor={caso.datas.recebimentoDenuncia} onChange={data('datas', 'recebimentoDenuncia')} dica="Interrompe a prescrição (art. 117, I)." />
          <CampoData rotulo="Pronúncia" valor={caso.datas.pronuncia} onChange={data('datas', 'pronuncia')} dica="Só no júri (art. 117, II)." />
          <CampoData rotulo="Confirmação da pronúncia" valor={caso.datas.confirmacaoPronuncia} onChange={data('datas', 'confirmacaoPronuncia')} />
          <CampoData rotulo="Sentença condenatória (publicação)" valor={caso.datas.sentenca} onChange={data('datas', 'sentenca')} dica="Art. 117, IV. Também é a data da idade do art. 115." />
          <CampoData rotulo="Trânsito em julgado para a acusação" valor={caso.datas.transitoAcusacao} onChange={data('datas', 'transitoAcusacao')} dica="Abre a retroativa e a intercorrente (art. 110, § 1º)." />
          <CampoData rotulo="Trânsito em julgado para ambos" valor={caso.datas.transitoAmbos} onChange={data('datas', 'transitoAmbos')} dica="Termo inicial da executória (Tema 788 do STF)." />
          <CampoData rotulo="Início do cumprimento da pena" valor={caso.datas.inicioCumprimento} onChange={data('datas', 'inicioCumprimento')} dica="Interrompe a executória (art. 117, V) e data a progressão." />
          <label>
            Prisão provisória (dias)
            <input type="number" min={0} max={14400} value={caso.datas.prisaoProvisoriaDias ?? ''} onChange={(e) => mudar((c) => { const n = Number(e.target.value); if (e.target.value && n >= 0) c.datas.prisaoProvisoriaDias = n; else delete c.datas.prisaoProvisoriaDias; return c; })} />
            <span className="dica">Detração (art. 42) e regime (CPP, art. 387, § 2º).</span>
          </label>
          <CampoData rotulo="Último ato do querelante" valor={caso.datas.ultimoAtoQuerelante} onChange={data('datas', 'ultimoAtoQuerelante')} dica="Perempção, 30 dias (CPP, art. 60, I) — só ação privada." />
          <CampoData rotulo="Morte do querelante" valor={caso.datas.morteQuerelante} onChange={data('datas', 'morteQuerelante')} dica="Perempção, 60 dias (CPP, art. 60, II)." />
        </div>
      </fieldset>

      <fieldset>
        <legend><span className="num">5</span> Critérios de cálculo</legend>
        <details>
          <summary>Onde a jurisprudência diverge, escolha o critério (o padrão é o do STJ)</summary>
          <div className="calc-grade">
            <label>
              1ª fase — fração por circunstância
              <select value={caso.criterios.fase1} onChange={(e) => mudar((c) => { c.criterios.fase1 = e.target.value as Caso['criterios']['fase1']; return c; })}>
                <option value="OITAVO_INTERVALO">1/8 do intervalo entre mínimo e máximo (STJ)</option>
                <option value="SEXTO_MINIMO">1/6 da pena mínima</option>
              </select>
            </label>
            <label>
              2ª fase — fração por agravante/atenuante
              <select value={fracaoTexto(caso.criterios.fase2)} onChange={(e) => mudar((c) => { const [n, d] = e.target.value.split('/').map(Number); c.criterios.fase2 = { num: n, den: d }; return c; })}>
                <option value="1/6">1/6 da pena-base (STJ)</option>
                <option value="1/8">1/8 da pena-base</option>
              </select>
            </label>
            <label>
              3ª fase — incidência das causas
              <select value={caso.criterios.fase3} onChange={(e) => mudar((c) => { c.criterios.fase3 = e.target.value as Caso['criterios']['fase3']; return c; })}>
                <option value="CASCATA">Em cascata: cada causa sobre o resultado da anterior (STJ)</option>
                <option value="SOMA">Somadas: todas sobre a pena da 2ª fase</option>
              </select>
            </label>
            <label>
              Termo inicial da prescrição executória
              <select value={caso.criterios.termoInicialExecutoria} onChange={(e) => mudar((c) => { c.criterios.termoInicialExecutoria = e.target.value as Caso['criterios']['termoInicialExecutoria']; return c; })}>
                <option value="TEMA_788">Trânsito em julgado para ambas as partes (Tema 788 do STF)</option>
                <option value="ART_112_LITERAL">Trânsito para a acusação (art. 112, I, literal)</option>
              </select>
            </label>
            <label>
              Salário mínimo (R$) para o dia-multa
              <input type="number" min={100} max={100000} value={caso.criterios.salarioMinimo} onChange={(e) => mudar((c) => { c.criterios.salarioMinimo = Number(e.target.value) || c.criterios.salarioMinimo; return c; })} />
              <span className="dica">O vigente ao tempo do fato (art. 49, § 1º).</span>
            </label>
            <label>
              Valor do dia-multa
              <select value={fracaoTexto(caso.criterios.valorDiaMulta)} onChange={(e) => mudar((c) => { const [n, d] = e.target.value.split('/').map(Number); c.criterios.valorDiaMulta = { num: n, den: d }; return c; })}>
                {[[1, 30], [1, 10], [1, 5], [1, 2], [1, 1], [5, 1]].map(([n, d]) => (
                  <option key={`${n}/${d}`} value={`${n}/${d}`}>{n}/{d} do salário mínimo{n === 1 && d === 30 ? ' (mínimo legal)' : n === 5 ? ' (máximo legal)' : ''}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="calc-check" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={caso.criterios.art68Unico} onChange={(e) => mudar((c) => { c.criterios.art68Unico = e.target.checked; return c; })} />
            <span>Art. 68, p. ún.: com mais de uma causa da parte especial do mesmo sinal, aplicar só a que mais aumenta ou diminui</span>
          </label>
        </details>
      </fieldset>

      <div className="calc-previa">
        {'r' in previa && previa.r ? (
          <>
            <div className="numero">{formatarPena(previa.r.unificacao.totalDias)}</div>
            <div className="sub">
              {previa.r.unificacao.especiePrevalente === 'RECLUSAO' ? 'reclusão' : 'detenção'} · regime {previa.r.consequencias.regime.inicial.toLowerCase()}
              {previa.r.unificacao.diasMultaTotal ? ` · ${previa.r.unificacao.diasMultaTotal} dias-multa` : ''}
              {' · prescrição em abstrato: '}{Math.round(previa.r.prescricao[0].prazos[0].prazoMeses / 12 * 10) / 10} anos
            </div>
          </>
        ) : (
          <div className="erro">{previa.erro}</div>
        )}
        <div className="acoes">
          <button type="submit" className="btn btn-primario" disabled={!('r' in previa)}>
            Ver resultado completo <Icone nome="arrow_forward" tamanho={16} />
          </button>
          <button type="button" className="btn btn-fantasma" onClick={limpar}>Limpar</button>
        </div>
      </div>
    </form>
  );
}

function CampoData({ rotulo, valor, onChange, dica, obrigatoria }: { rotulo: string; valor?: string; onChange: (v: string) => void; dica?: string; obrigatoria?: boolean }) {
  return (
    <label>
      {rotulo}
      <input type="date" value={valor ?? ''} onChange={(e) => onChange(e.target.value)} required={obrigatoria} min="1940-01-01" max="2099-12-31" />
      {dica && <span className="dica">{dica}</span>}
    </label>
  );
}

function BlocoCrime({ crime, indice, caso, onChange, onRemove }: {
  crime: CrimeDoCaso; indice: number; caso: Caso; onChange: (c: CrimeDoCaso) => void; onRemove?: () => void;
}) {
  const todos = useMemo(() => tiposParaEscolha(), []);
  const atual = tipoPorId(crime.tipoId);
  const [norma, setNorma] = useState(atual?.norma ?? 'cp');
  const [filtro, setFiltro] = useState('');
  const tipos = todos.filter((t) => t.norma === norma && (!filtro || `${t.rotulo} ${t.forma ?? ''} ${t.nome}`.toLowerCase().includes(filtro.toLowerCase())));
  const tipo: TipoPenal | null = tipoPorId(crime.tipoId, caso.datas.fato);
  const causas = tipo ? causasDoTipo(tipo, caso.datas.fato) : [];

  const set = (fn: (c: CrimeDoCaso) => void) => { const novo = structuredClone(crime); fn(novo); onChange(novo); };
  const alternar = (lista: 'agravantes' | 'atenuantes', id: string) => set((c) => {
    c[lista] = c[lista].includes(id) ? c[lista].filter((x) => x !== id) : [...c[lista], id];
  });

  return (
    <div className="calc-crime">
      <div className="calc-crime-cabeca">
        <strong>Crime {caso.crimes.length > 1 ? indice + 1 : ''}</strong>
        {onRemove && <button type="button" className="btn btn-fantasma btn-sm" onClick={onRemove}><Icone nome="close" tamanho={14} /> Remover</button>}
      </div>
      <div className="calc-grade">
        <label>
          Lei
          <select value={norma} onChange={(e) => {
            const n = e.target.value; setNorma(n); setFiltro('');
            const primeiro = todos.find((t) => t.norma === n);
            if (primeiro && atual?.norma !== n) set((c) => { c.tipoId = primeiro.id; c.causas = []; });
          }}>
            {NORMAS_DO_CATALOGO.map((n) => <option key={n.slug} value={n.slug}>{n.nome}</option>)}
          </select>
        </label>
        <label>
          Filtrar por nome ou artigo
          <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="roubo, 157, estelionato…" />
        </label>
      </div>
      <label>
        Tipo penal
        <select value={crime.tipoId} onChange={(e) => set((c) => { c.tipoId = e.target.value; c.causas = []; })} size={Math.min(6, Math.max(2, tipos.length))}>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>{t.rotulo}{t.forma && t.forma !== 'caput' ? `, ${t.forma}` : ''} — {t.nome}</option>
          ))}
          {tipos.length === 0 && <option disabled value="">nenhum tipo com esse filtro</option>}
        </select>
      </label>
      {tipo ? (
        <p className="calc-pena-cominada">
          <b>{rotuloCompleto(tipo)}</b> · {tipo.especie === 'RECLUSAO' ? 'reclusão' : 'detenção'}, de {formatarPena(tipo.penaMinDias)} a {formatarPena(tipo.penaMaxDias)}
          {tipo.multa === 'CUMULATIVA' ? ', e multa' : tipo.multa === 'ALTERNATIVA' ? ', ou multa' : ''}
          {' · '}{{ PUBLICA_INCONDICIONADA: 'ação pública incondicionada', PUBLICA_CONDICIONADA: 'ação pública condicionada', PRIVADA: 'ação privada' }[tipo.acaoPenal]}
          {tipo.hediondo !== 'NAO' && ' · hediondo'}{tipo.vigenciaAte && ` · redação vigente até ${dataBR(tipo.vigenciaAte)}`}
        </p>
      ) : atual ? (
        <p className="calc-pena-cominada" style={{ color: 'var(--error)' }}>Este tipo não existia em {dataBR(caso.datas.fato)} (criado pela lei de {atual.vigenciaDe.slice(0, 4)}).</p>
      ) : null}

      <details>
        <summary>1ª fase — circunstâncias judiciais desfavoráveis (art. 59){crime.circunstancias59.length ? ` · ${crime.circunstancias59.length}` : ''}</summary>
        <div className="calc-checks">
          {NOMES_59.map((c) => (
            <label key={c.chave} className="calc-check" title={c.dica}>
              <input type="checkbox" checked={crime.circunstancias59.includes(c.chave)} disabled={c.chave === 'comportamento_vitima'}
                onChange={() => set((x) => { x.circunstancias59 = x.circunstancias59.includes(c.chave) ? x.circunstancias59.filter((k) => k !== c.chave) : [...x.circunstancias59, c.chave]; })} />
              <span>{c.nome}<br /><small className="dica">{c.dica}</small></span>
            </label>
          ))}
        </div>
      </details>

      <details>
        <summary>2ª fase — agravantes (arts. 61 e 62){crime.agravantes.length ? ` · ${crime.agravantes.length}` : ''}</summary>
        <p className="dica">Reincidência entra sozinha pelos dados do agente; a idade da vítima e a violência doméstica, pelos dados da vítima.</p>
        <div className="calc-checks">
          {AGRAVANTES.filter((a) => !AUTOMATICAS.has(a.id)).map((a) => (
            <label key={a.id} className="calc-check">
              <input type="checkbox" checked={crime.agravantes.includes(a.id)} onChange={() => alternar('agravantes', a.id)} />
              <span>{a.nome}</span>
            </label>
          ))}
        </div>
      </details>

      <details>
        <summary>2ª fase — atenuantes (arts. 65 e 66){crime.atenuantes.length ? ` · ${crime.atenuantes.length}` : ''}</summary>
        <p className="dica">Menoridade, senilidade e confissão entram sozinhas pelos dados do agente.</p>
        <div className="calc-checks">
          {ATENUANTES.filter((a) => !AUTOMATICAS.has(a.id)).map((a) => (
            <label key={a.id} className="calc-check">
              <input type="checkbox" checked={crime.atenuantes.includes(a.id)} onChange={() => alternar('atenuantes', a.id)} />
              <span>{a.nome}</span>
            </label>
          ))}
        </div>
      </details>

      <details open={crime.causas.length > 0}>
        <summary>3ª fase — causas de aumento e de diminuição{crime.causas.length ? ` · ${crime.causas.length}` : ''}</summary>
        {causas.length === 0 && <p className="dica">Nenhuma causa cabível para este tipo nesta data.</p>}
        <div style={{ display: 'grid', gap: 4 }}>
          {causas.map((causa) => {
            const marcada = crime.causas.find((c) => c.id === causa.id);
            const opcoes = fracoesDe(causa);
            return (
              <div key={causa.id} className="calc-causa">
                <label className="calc-check" title={causa.descricao}>
                  <input type="checkbox" checked={Boolean(marcada)} onChange={() => set((c) => {
                    c.causas = marcada ? c.causas.filter((x) => x.id !== causa.id) : [...c.causas, { id: causa.id, fracao: opcoes[0] }];
                  })} />
                  <span>
                    <b style={{ color: causa.sinal === '+' ? 'var(--error)' : 'var(--secondary)' }}>{causa.sinal === '+' ? '+' : '−'}</b>{' '}
                    {causa.nome}
                    {causa.escopo === 'GERAL' && <small className="dica"> · parte geral</small>}
                  </span>
                </label>
                {marcada && (opcoes.length > 1 ? (
                  <select value={fracaoTexto(marcada.fracao)} onChange={(e) => set((c) => {
                    const [n, d] = e.target.value.split('/').map(Number);
                    const alvo = c.causas.find((x) => x.id === causa.id); if (alvo) alvo.fracao = { num: n, den: d };
                  })} aria-label={`Fração de ${causa.nome}`}>
                    {opcoes.map((f) => <option key={fracaoTexto(f)} value={fracaoTexto(f)}>{nomeFracao(f, causa.sinal)}</option>)}
                  </select>
                ) : (
                  <span className="dica">{nomeFracao(opcoes[0], causa.sinal)}</span>
                ))}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

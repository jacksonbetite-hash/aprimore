import type {
  DadosMateria, DadosAula, DadosQuestao, StatusPublicacao, TipoQuestao,
} from './admin-cursos.ts';

/**
 * Leitura dos formulários de curso, aula e questão — compartilhada entre
 * a retaguarda da plataforma (app/admin/cursos/acoes.ts) e o painel do
 * professor (app/professor/acoes.ts). Arquivos 'use server' só exportam
 * funções assíncronas, então os leitores síncronos precisavam de um
 * módulo próprio para não virarem cópia em dois lugares.
 */

const STATUS: StatusPublicacao[] = ['rascunho', 'em_revisao', 'aprovado', 'publicado', 'arquivado'];
export const situacao = (v: FormDataEntryValue | null): StatusPublicacao => {
  const s = String(v ?? '') as StatusPublicacao;
  return STATUS.includes(s) ? s : 'rascunho';
};

export const numero = (v: FormDataEntryValue | null, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : padrao;
};

export function lerMateria(dados: FormData): DadosMateria {
  const onda = Number(dados.get('onda'));
  return {
    areaId: Number(dados.get('areaId')),
    nome: String(dados.get('nome') ?? ''),
    ementa: String(dados.get('ementa') ?? ''),
    onda: Number.isInteger(onda) && onda > 0 ? onda : null,
    status: situacao(dados.get('status')),
    professor: String(dados.get('professor') ?? ''),
    ordem: numero(dados.get('ordem')),
    naVitrinePlataforma: dados.get('naVitrinePlataforma') === 'on',
    destaque: dados.get('destaque') === 'on',
    nivel: String(dados.get('nivel') ?? ''),
    // db/047 — só chega quando o formulário mostra o campo (curso da
    // plataforma, do catálogo ou compartilhado na vitrine); ausente mantém.
    vagasSemOrcamento: dados.get('vagasSemOrcamento') === null || String(dados.get('vagasSemOrcamento')).trim() === ''
      ? null : Number(dados.get('vagasSemOrcamento')),
  };
}

export function lerAula(dados: FormData): DadosAula {
  // A duração é digitada em minutos e segundos: pedir 4380 segundos a
  // quem acabou de gravar 1h13 é pedir uma conta de cabeça a cada aula.
  const minutos = numero(dados.get('minutos'));
  const segundos = numero(dados.get('segundos'));
  return {
    assuntoId: Number(dados.get('assuntoId')),
    titulo: String(dados.get('titulo') ?? ''),
    resumo: String(dados.get('resumo') ?? ''),
    duracaoSegundos: minutos * 60 + segundos,
    videoProvedor: String(dados.get('videoProvedor') ?? ''),
    videoId: String(dados.get('videoId') ?? ''),
    amostraGratuita: dados.get('amostraGratuita') === 'on',
    noTrial: dados.get('noTrial') === 'on',
    status: situacao(dados.get('status')),
    ordem: numero(dados.get('ordem')),
  };
}

const TIPOS: TipoQuestao[] = ['multipla_escolha', 'certo_errado'];

export function lerQuestao(dados: FormData): DadosQuestao {
  const tipo = String(dados.get('tipo') ?? '') as TipoQuestao;
  const correta = String(dados.get('correta') ?? '');
  // As alternativas chegam como campos numerados: texto0, comentario0…
  const alternativas: DadosQuestao['alternativas'] = [];
  for (let i = 0; i < 8; i++) {
    const texto = String(dados.get(`texto${i}`) ?? '');
    if (!texto.trim()) continue;
    alternativas.push({
      texto,
      comentario: String(dados.get(`comentario${i}`) ?? ''),
      correta: correta === String(i),
    });
  }
  return {
    tipo: TIPOS.includes(tipo) ? tipo : 'multipla_escolha',
    enunciado: String(dados.get('enunciado') ?? ''),
    origem: String(dados.get('origem') ?? 'autoral'),
    dificuldade: String(dados.get('dificuldade') ?? 'introdutorio'),
    ordem: numero(dados.get('ordem')),
    alternativas,
  };
}

/**
 * Motor de licenciamento — §6.3 do discovery.
 *
 * "Esta é a parte mais crítica do sistema. Erro aqui vira prejuízo ou
 * cliente irritado." O risco §15.8 pede testes cobrindo toda a matriz
 * escopo × status × vigência; ver licenca.test.ts.
 *
 * Regra central: licenças SOMAM, nunca se anulam. A licença promocional
 * não precisa de regra nova — é escopo MATERIA com origem PROMOCIONAL.
 */

export type EscopoLicenca = 'CATALOGO' | 'MATERIA';
export type OrigemLicenca = 'TRIAL' | 'COMPRA' | 'PROMOCIONAL' | 'CORTESIA' | 'MIGRACAO';
export type StatusLicenca =
  | 'PENDENTE' | 'ATIVA' | 'EM_ATRASO' | 'SUSPENSA' | 'CANCELADA' | 'EXPIRADA';

export type StatusConta =
  | 'ATIVA' | 'INATIVA_AVISO' | 'BLOQUEADA_INATIVIDADE' | 'ENCERRADA';

export interface Licenca {
  id: number;
  escopo: EscopoLicenca;
  materiaId: number | null;
  origem: OrigemLicenca;
  status: StatusLicenca;
  inicioEm: Date;
  fimEm: Date;
  /** Cota do trial (§6.1): limita aulas e exercícios, não o tempo. */
  cota?: { aulas?: number; exercicios?: number } | null;
}

export interface AulaAlvo {
  id: number;
  materiaId: number;
  /** 1ª aula de cada assunto é aberta a todos, sem cadastro (§6.1). */
  amostraGratuita: boolean;
  /** Faz parte dos ~20% liberados no teste gratuito. */
  noTrial: boolean;
}

export interface Espectador {
  /** Ausente = visitante não cadastrado. */
  usuarioId?: number;
  statusConta?: StatusConta;
  licencas: Licenca[];
}

export type MotivoLiberacao =
  | 'AMOSTRA_GRATUITA' | 'LICENCA_CATALOGO' | 'LICENCA_MATERIA' | 'TRIAL';

export type MotivoBloqueio =
  | 'CONTA_BLOQUEADA' | 'SEM_LICENCA' | 'FORA_DA_COTA_DO_TRIAL';

export type Decisao =
  | { libera: true; motivo: MotivoLiberacao; licencaId?: number }
  | { libera: false; motivo: MotivoBloqueio };

/**
 * Acesso ao CURSO inteiro, sem olhar uma aula específica — o que a
 * página do curso precisa saber para decidir entre mostrar a oferta ou
 * mostrar o progresso de quem já comprou.
 *
 * A amostra gratuita não entra aqui de propósito: ela abre UMA aula, não
 * o curso. Quem só tem amostra continua vendo o preço, que é a verdade.
 */
export type AcessoAoCurso =
  | { libera: true; motivo: 'LICENCA_CATALOGO' | 'LICENCA_MATERIA' | 'TRIAL'; licenca: Licenca }
  | { libera: false; motivo: MotivoBloqueio };

/** Uma licença só vale se está ATIVA e a vigência contém o instante. */
export function licencaVigente(l: Licenca, agora: Date): boolean {
  return l.status === 'ATIVA' && l.inicioEm <= agora && l.fimEm > agora;
}

/**
 * podeAcessar(usuario, aula) — §6.3.
 *
 * A ordem importa: a amostra gratuita vem antes de qualquer verificação de
 * conta ou licença, porque é conteúdo aberto (sem cadastro). Depois disso,
 * a licença mais abrangente (CATALOGO) prevalece sobre a de matéria, e o
 * trial é a última porta — sujeito à cota.
 */
export function podeAcessar(espectador: Espectador, aula: AulaAlvo, agora = new Date()): Decisao {
  if (aula.amostraGratuita) {
    return { libera: true, motivo: 'AMOSTRA_GRATUITA' };
  }

  const curso = acessoAoCurso(espectador, aula.materiaId, agora);
  if (!curso.libera) return curso;

  // O trial é a única licença que não abre o curso inteiro: ela respeita
  // a cota de ~20% das aulas (§6.1), marcada aula a aula em `no_trial`.
  if (curso.motivo === 'TRIAL') {
    return aula.noTrial
      ? { libera: true, motivo: 'TRIAL', licencaId: curso.licenca.id }
      : { libera: false, motivo: 'FORA_DA_COTA_DO_TRIAL' };
  }
  return { libera: true, motivo: curso.motivo, licencaId: curso.licenca.id };
}

/**
 * A mesma escada de decisão de `podeAcessar`, parando um degrau antes:
 * quem tem acesso a este CURSO, e por qual licença.
 *
 * Nasceu porque a página do curso mostrava o preço até para quem já
 * tinha comprado — ela só sabia decidir aula a aula. Manter as duas
 * respostas no mesmo lugar é o que impede a tela de dizer uma coisa e o
 * cadeado da aula dizer outra.
 */
export function acessoAoCurso(
  espectador: Espectador, materiaId: number, agora = new Date(),
): AcessoAoCurso {
  // §6.5: conta bloqueada por inatividade não acessa nada — mas o progresso
  // e as licenças ficam preservados, e a reativação é self-service.
  if (espectador.statusConta === 'BLOQUEADA_INATIVIDADE' || espectador.statusConta === 'ENCERRADA') {
    return { libera: false, motivo: 'CONTA_BLOQUEADA' };
  }

  const vigentes = espectador.licencas.filter((l) => licencaVigente(l, agora));

  const catalogo = vigentes.find((l) => l.escopo === 'CATALOGO');
  if (catalogo) {
    return { libera: true, motivo: 'LICENCA_CATALOGO', licenca: catalogo };
  }

  // A comparação é numérica de propósito. O driver do Postgres devolve
  // BIGINT como TEXTO, e nem toda consulta faz `::int` — bastava uma
  // ponta castada e a outra não para o acesso falhar em silêncio, com a
  // licença certa no banco. Falha fechada é o comportamento desejado
  // (§15.14), mas não por acidente de tipo.
  const mesmaMateria = (a: unknown, b: unknown) => Number(a) === Number(b);
  const daMateria = vigentes.filter(
    (l) => l.escopo === 'MATERIA' && mesmaMateria(l.materiaId, materiaId),
  );

  // Licença paga/promocional/cortesia da matéria libera a matéria inteira.
  const plena = daMateria.find((l) => l.origem !== 'TRIAL');
  if (plena) return { libera: true, motivo: 'LICENCA_MATERIA', licenca: plena };

  const trial = daMateria.find((l) => l.origem === 'TRIAL');
  if (trial) return { libera: true, motivo: 'TRIAL', licenca: trial };

  return { libera: false, motivo: 'SEM_LICENCA' };
}

/**
 * §5.10.2, etapa 5 — curso de OUTRO portal visto na nossa vitrine.
 *
 * O passe completo (CATALOGO) cobre "todas as matérias" de UM portal: o
 * do aluno. Ele não alcança o curso de um professor parceiro — esse só
 * abre com licença da própria matéria (compra, cortesia, promocional).
 * Sem esta regra, o passe da plataforma daria acesso a todo curso
 * compartilhado sem que o professor visse um centavo, e o rateio que o
 * §5.10 evitou de propósito voltaria pela janela.
 */
export function espectadorParaCurso(espectador: Espectador, cursoDoMesmoPortal: boolean): Espectador {
  if (cursoDoMesmoPortal) return espectador;
  return { ...espectador, licencas: espectador.licencas.filter((l) => l.escopo !== 'CATALOGO') };
}

/** Texto da oferta contextual mostrada quando a aula bloqueia. */
export function ofertaPara(motivo: MotivoBloqueio): string {
  switch (motivo) {
    case 'CONTA_BLOQUEADA':
      return 'Sua conta está bloqueada por inatividade. Reative pelo link enviado ao seu e-mail — seu progresso e suas anotações estão guardados.';
    case 'FORA_DA_COTA_DO_TRIAL':
      return 'Esta aula está fora do que o teste gratuito libera. Assine a matéria para abrir todas as aulas — seu progresso continua de onde parou.';
    case 'SEM_LICENCA':
      return 'Esta aula faz parte de um curso licenciado. Teste 7 dias grátis, sem cartão, ou assine só este curso.';
  }
}

'use client';

import { useActionState, useState } from 'react';
import type { EstadoAdmin } from '../acoes.ts';
import type { AreaAdmin, MateriaAdmin } from '../../../lib/admin-cursos.ts';

const SITUACOES = [
  { valor: 'rascunho', rotulo: 'Rascunho — só aqui dentro' },
  { valor: 'em_revisao', rotulo: 'Em revisão' },
  { valor: 'aprovado', rotulo: 'Aprovado, aguardando publicação' },
  { valor: 'publicado', rotulo: 'Publicado — no catálogo' },
  { valor: 'arquivado', rotulo: 'Arquivado' },
];

/**
 * Cadastro da matéria — a unidade que se vende (§6: a licença é por
 * matéria, nunca por assunto). Por isso a ementa é obrigatória e longa:
 * ela é o texto que decide a compra e o que o buscador lê.
 */
/**
 * O que o professor do catálogo (db/046) decide sobre a situação: leva
 * até "em revisão"; publicar é da plataforma. Se o curso já está
 * publicado, a opção aparece só para ele poder MANTER.
 */
const SITUACOES_DO_CATALOGO = SITUACOES.filter((s) => ['rascunho', 'em_revisao', 'arquivado'].includes(s.valor));

export default function FormMateria({
  acao, areas, portalId, materia, ehPlataforma, empresa = false, niveis = [],
  catalogo = false, nomeProfessor,
}: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  areas: AreaAdmin[];
  portalId: number;
  materia?: MateriaAdmin;
  ehPlataforma: boolean;
  /** §5.11: mesmo formulário, rótulos de empresa (trilha em vez de curso), sem onda nem vitrine. */
  empresa?: boolean;
  /** Etapa 5: professor SEM portal, no catálogo — sem onda, destaque e vitrine; quem assina é ele. */
  catalogo?: boolean;
  nomeProfessor?: string;
  /**
   * Os níveis já usados neste portal (db/043). Servem de sugestão no
   * `<datalist>`: sem elas, "Prática forense" e "Pratica Forense" viram
   * duas opções diferentes no filtro do catálogo, e quem digitou não vê
   * o erro. Lista vazia = campo livre, sem sugestão.
   */
  niveis?: string[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const coisa = empresa ? 'trilha' : 'curso';
  // db/047 — o limite de vagas sem orçamento só faz sentido onde a
  // EMPRESA pode comprar o curso: no catálogo da plataforma (curso da
  // casa ou de professor do catálogo) e no curso de portal compartilhado
  // na vitrine. O marcador da vitrine vira estado para o campo aparecer
  // na hora em que ele é ligado.
  const [naVitrine, setNaVitrine] = useState(Boolean(materia?.naVitrinePlataforma));
  const vendeParaEmpresas = !empresa && (ehPlataforma || catalogo || naVitrine);

  return (
    <form action={enviar} className="form-editor">
      <input type="hidden" name="portalId" value={portalId} />
      {materia && <input type="hidden" name="id" value={materia.id} />}
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}

      <div className="linha">
        <label>
          Nome {empresa ? 'da trilha' : 'do curso'}
          <input name="nome" defaultValue={materia?.nome} required maxLength={140}
            placeholder={empresa ? 'Integração de novos colaboradores' : 'Noções de Direito Constitucional'} />
        </label>
        <label>
          Área
          <select name="areaId" defaultValue={materia?.areaId ?? ''} required>
            <option value="" disabled>escolha…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </label>
      </div>

      <label>
        Ementa
        <textarea name="ementa" defaultValue={materia?.ementa} required rows={6}
          placeholder="O que o aluno vai aprender, e para que isso serve na prática." />
        <span className="dica">
          {empresa
            ? 'Mínimo de 60 caracteres. É o que o colaborador lê antes de começar: para que serve a trilha e o que se espera dele.'
            : 'Mínimo de 60 caracteres. É o texto que decide a compra e o que o buscador lê.'}
        </span>
      </label>

      <div className="linha estreita">
        <label>
          Situação
          <select name="status" defaultValue={materia?.status ?? 'rascunho'}>
            {(catalogo ? SITUACOES_DO_CATALOGO : SITUACOES).map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
            {catalogo && materia && !SITUACOES_DO_CATALOGO.some((s) => s.valor === materia.status) && (
              <option value={materia.status}>{SITUACOES.find((s) => s.valor === materia.status)?.rotulo ?? materia.status}</option>
            )}
          </select>
          {catalogo && <span className="dica">Publicar é da revisão da plataforma: deixe pronto e marque "em revisão".</span>}
        </label>
        {catalogo ? (
          <input type="hidden" name="professor" value={nomeProfessor ?? ''} />
        ) : (
          <label>
            {empresa ? 'Responsável pelo conteúdo' : 'Professor'}
            <input name="professor" defaultValue={materia?.professor ?? ''}
              placeholder={empresa ? 'Equipe de T&D' : 'quem assina'} />
          </label>
        )}
        {!empresa && !catalogo && <label>
          Onda de lançamento
          <input name="onda" type="number" min={1} defaultValue={materia?.onda ?? ''}
            placeholder="em branco" />
          <span className="dica">
            O lote de lançamento a que este curso pertence: <strong>1</strong> = primeira
            leva, <strong>2</strong> = a seguinte, e assim por diante. É só uma etiqueta — no
            catálogo o cartão do curso mostra “1ª onda”, “2ª onda”… e, quando o campo fica{' '}
            <strong>em branco, mostra “Em breve”</strong>. Não programa publicação nem muda o
            acesso: quem coloca o curso no ar é a <em>situação</em>, ao lado. Se você lança
            tudo de uma vez, escreva 1.
          </span>
        </label>}
        <label>
          Ordem
          <input name="ordem" type="number" defaultValue={materia?.ordem ?? 10} />
        </label>
      </div>

      {/* db/043 — os dois controles que o catálogo em vitrine pediu. Ficam
          juntos porque respondem à mesma pergunta ("como este curso
          aparece na página de cursos"), e separados dos dados do curso,
          que valem em qualquer tela. */}
      {!empresa && (
        <div className="linha estreita">
          <label>
            Nível ou público
            <input name="nivel" defaultValue={materia?.nivel ?? ''} maxLength={60}
              list="niveis-do-portal" placeholder="Graduação, Prática forense, OAB e concursos…" />
            <span className="dica">
              A quem o curso se dirige. É o filtro <strong>“Todos os níveis”</strong> da barra
              de busca do catálogo: as opções são exatamente as que você escreveu aqui, nos
              seus cursos. Em branco, o curso continua aparecendo — só não entra no filtro.
            </span>
            {niveis.length > 0 && (
              <datalist id="niveis-do-portal">
                {niveis.map((n) => <option key={n} value={n} />)}
              </datalist>
            )}
          </label>
        </div>
      )}

      {!empresa && !catalogo && (
        <label className="marcador">
          <input type="checkbox" name="destaque" defaultChecked={materia?.destaque} />
          Curso em destaque no catálogo
          <span className="dica">
            É o curso do <strong>banner grande</strong>, no alto da página de cursos: capa em
            tamanho de cartaz, ementa e o botão de assistir. Só entra curso publicado e com
            aula no ar. Marcando mais de um, o banner mostra o de <em>menor ordem</em>; sem
            marcar nenhum, ele mostra o primeiro curso publicado.
          </span>
        </label>
      )}

      {!ehPlataforma && !empresa && (
        <label className="marcador">
          <input type="checkbox" name="naVitrinePlataforma"
            checked={naVitrine} onChange={(e) => setNaVitrine(e.target.checked)} />
          Também na vitrine da plataforma
          <span className="dica">
            §5.10: compartilhar é ato deliberado, matéria a matéria. Venda que nascer na nossa
            vitrine é venda nossa, com comissão pela regra do §5.6.1.
          </span>
        </label>
      )}

      {vendeParaEmpresas && (
        <div className="linha estreita">
          <label>
            Vagas para empresa sem orçamento
            <input name="vagasSemOrcamento" type="number" min={0} max={100000}
              defaultValue={materia?.vagasSemOrcamento ?? 10} required />
            <span className="dica">
              Uma empresa compra até este número de vagas deste curso na hora, pelo preço anual
              da tabela; acima disso, ela pede orçamento ao comercial. <strong>0</strong> = sempre
              por orçamento.
            </span>
          </label>
        </div>
      )}

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : materia ? `Salvar ${coisa}` : `Criar ${coisa}`}
        </button>
      </div>
    </form>
  );
}

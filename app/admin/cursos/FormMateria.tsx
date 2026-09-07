'use client';

import { useActionState } from 'react';
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
export default function FormMateria({
  acao, areas, portalId, materia, ehPlataforma, empresa = false,
}: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  areas: AreaAdmin[];
  portalId: number;
  materia?: MateriaAdmin;
  ehPlataforma: boolean;
  /** §5.11: mesmo formulário, rótulos de empresa (trilha em vez de curso), sem onda nem vitrine. */
  empresa?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const coisa = empresa ? 'trilha' : 'curso';

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
            {SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </select>
        </label>
        <label>
          {empresa ? 'Responsável pelo conteúdo' : 'Professor'}
          <input name="professor" defaultValue={materia?.professor ?? ''}
            placeholder={empresa ? 'Equipe de T&D' : 'quem assina'} />
        </label>
        {!empresa && <label>
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

      {!ehPlataforma && !empresa && (
        <label className="marcador">
          <input type="checkbox" name="naVitrinePlataforma"
            defaultChecked={materia?.naVitrinePlataforma} />
          Também na vitrine da plataforma
          <span className="dica">
            §5.10: compartilhar é ato deliberado, matéria a matéria. Venda que nascer na nossa
            vitrine é venda nossa, com comissão pela regra do §5.6.1.
          </span>
        </label>
      )}

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : materia ? `Salvar ${coisa}` : `Criar ${coisa}`}
        </button>
      </div>
    </form>
  );
}

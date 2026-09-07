'use client';

import { useActionState } from 'react';
import type { EstadoAdmin } from '../acoes.ts';
import type { AssuntoAdmin, AulaAdmin } from '../../../lib/admin-cursos.ts';

const SITUACOES = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'em_revisao', rotulo: 'Em revisão' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'publicado', rotulo: 'Publicado — no ar' },
  { valor: 'arquivado', rotulo: 'Arquivado' },
];

/**
 * Cadastro da aula.
 *
 * A duração é pedida em minutos e segundos, não em segundos corridos:
 * quem acabou de gravar uma aula sabe que ela tem 12min40, e não 760
 * segundos. A conversão é do sistema, que é quem tem calculadora.
 */
export default function FormAula({
  acao, assuntos, portalId, aula, assuntoPadrao, empresa = false,
}: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  assuntos: AssuntoAdmin[];
  portalId: number;
  aula?: AulaAdmin;
  assuntoPadrao?: number;
  /** §5.11: rótulo "módulo", e sem amostra grátis nem trial — a empresa não vende. */
  empresa?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const total = aula?.duracaoSegundos ?? 0;

  return (
    <form action={enviar} className="form-editor">
      <input type="hidden" name="portalId" value={portalId} />
      {aula && <input type="hidden" name="id" value={aula.id} />}
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}

      <div className="linha">
        <label>
          Título da aula
          <input name="titulo" defaultValue={aula?.titulo} required maxLength={180} />
        </label>
        <label>
          {empresa ? 'Módulo' : 'Assunto'}
          <select name="assuntoId" defaultValue={aula?.assuntoId ?? assuntoPadrao ?? ''} required>
            <option value="" disabled>escolha…</option>
            {assuntos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
      </div>

      <label>
        Resumo
        <textarea name="resumo" defaultValue={aula?.resumo} required rows={3}
          placeholder="O que esta aula resolve. É obrigatório pelo §5.3." />
        <span className="dica">
          Mínimo de 20 caracteres. É a descrição da página e o que o aluno lê antes do play —
          o banco recusa publicar aula sem ele.
        </span>
      </label>

      <div className="linha estreita">
        <label>
          Minutos
          <input name="minutos" type="number" min={0} defaultValue={Math.floor(total / 60)} required />
        </label>
        <label>
          Segundos
          <input name="segundos" type="number" min={0} max={59} defaultValue={total % 60} />
        </label>
        <label>
          Situação
          <select name="status" defaultValue={aula?.status ?? 'rascunho'}>
            {SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </select>
        </label>
        <label>
          Ordem
          <input name="ordem" type="number" defaultValue={aula?.ordem ?? 10} />
        </label>
      </div>

      <div className="linha">
        <label>
          Provedor do vídeo
          <select name="videoProvedor" defaultValue={aula?.videoProvedor ?? ''}>
            <option value="">sem vídeo ainda</option>
            <option value="LOCAL">Arquivo no nosso volume</option>
            <option value="BUNNY">Bunny</option>
            <option value="CLOUDFLARE">Cloudflare</option>
          </select>
        </label>
        <label>
          Identificador do vídeo
          <input name="videoId" defaultValue={aula?.videoId ?? ''}
            placeholder="nome do arquivo, ou id na CDN" />
          <span className="dica">
            Guardamos o par provedor + identificador, nunca a URL crua: o endereço é assinado a
            cada acesso, com prazo de validade, por <code>lib/video.ts</code> (§10). Os dois
            campos andam juntos — ou preenche ambos, ou nenhum.
          </span>
        </label>
      </div>

      {!empresa && <div className="linha">
        <label className="marcador">
          <input type="checkbox" name="amostraGratuita" defaultChecked={aula?.amostraGratuita} />
          Amostra gratuita
          <span className="dica">A primeira aula de cada assunto, aberta a quem não tem licença (§6.1).</span>
        </label>
        <label className="marcador">
          <input type="checkbox" name="noTrial" defaultChecked={aula?.noTrial} />
          Dentro do teste de 7 dias
          <span className="dica">A cota do trial é de ~20% do conteúdo — marque com parcimônia.</span>
        </label>
      </div>}

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : aula ? 'Salvar aula' : 'Criar aula'}
        </button>
      </div>
    </form>
  );
}

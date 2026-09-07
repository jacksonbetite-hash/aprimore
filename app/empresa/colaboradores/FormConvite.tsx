'use client';

import { startTransition, useActionState, useState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoEquipe } from '../acoes.ts';
import type { Setor } from '../../../lib/empresa-equipe.ts';
import type { MateriaAdmin } from '../../../lib/admin-cursos.ts';

/**
 * Convite por link. O link só existe uma vez — o banco guarda o hash,
 * como a sessão —, então a tela o entrega com um botão de copiar e diz
 * isso em voz alta: perdeu, cancela e faz outro.
 */
export default function FormConvite({ acao, setores, trilhas }: {
  acao: (e: EstadoEquipe, d: FormData) => Promise<EstadoEquipe>;
  setores: Setor[];
  trilhas: MateriaAdmin[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoEquipe);
  const [copiado, setCopiado] = useState(false);

  const submeter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCopiado(false);
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <form onSubmit={submeter} className="form-editor">
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      {estado.ok && !estado.link && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}

      {estado.link && (
        <div className="alerta alerta-ok" role="status" style={{ display: 'grid', gap: 10 }}>
          <strong>{estado.ok}</strong>
          <code style={{ wordBreak: 'break-all', background: 'var(--surface-container)', padding: '8px 10px', borderRadius: 8 }}>
            {estado.link}
          </code>
          <div>
            <button className="btn btn-contorno btn-sm" type="button"
              onClick={() => {
                navigator.clipboard?.writeText(estado.link!).then(() => setCopiado(true)).catch(() => {});
              }}>
              <Icone nome={copiado ? 'check' : 'content_copy'} tamanho={18} /> {copiado ? 'Copiado' : 'Copiar o link'}
            </button>
            <span className="caption suave" style={{ marginLeft: 10 }}>
              Guarde agora: por segurança, o link não é mostrado de novo.
            </span>
          </div>
        </div>
      )}

      <div className="linha">
        <label>
          E-mail de quem entra
          <input name="email" type="email" required autoComplete="off" />
        </label>
        <label>
          Nome (opcional)
          <input name="nome" maxLength={120} autoComplete="off" />
        </label>
      </div>
      <div className="linha estreita">
        <label>
          Setor
          <select name="setorId" defaultValue="">
            <option value="">sem setor</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label>
          Prazo para concluir (dias)
          <input name="prazoDias" type="number" min={1} placeholder="sem prazo" />
          <span className="dica">Conta a partir do aceite do convite.</span>
        </label>
      </div>
      {trilhas.length > 0 && (
        <fieldset style={{ border: '1px solid var(--surface-variant)', borderRadius: 12, padding: 14 }}>
          <legend className="caption suave">Trilhas já liberadas no aceite (além das do setor)</legend>
          <div style={{ display: 'grid', gap: 6 }}>
            {trilhas.map((t) => (
              <label className="marcador" key={t.id} style={{ margin: 0 }}>
                <input type="checkbox" name="trilhas" value={t.id} />
                {t.nome}
                {t.status !== 'publicado' && <span className="chip chip-sm chip-neutra" style={{ marginLeft: 8 }}>rascunho</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Gerando…' : 'Gerar link de convite'}
        </button>
      </div>
    </form>
  );
}

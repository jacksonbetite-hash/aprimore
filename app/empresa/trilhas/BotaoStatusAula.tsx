'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';

/**
 * Publicar/despublicar a aula mostrando o motivo quando não dá — "aula
 * sem exercício não vai ao ar" precisa aparecer na tela, não só no log.
 * O painel do professor usa `<form action>` com ação `void`; aqui a ação
 * devolve estado, para que a recusa do §5.3 seja legível.
 */
export default function BotaoStatusAula({ acao, aulaId, publicada, compacto = false }: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  aulaId: number;
  publicada: boolean;
  compacto?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };
  const rotulo = publicada ? 'Despublicar' : 'Publicar';
  return (
    <form onSubmit={aoEnviar} style={{ display: 'inline-block' }}>
      <input type="hidden" name="id" value={aulaId} />
      <input type="hidden" name="status" value={publicada ? 'rascunho' : 'publicado'} />
      {compacto ? (
        <button className={`btn-icone${publicada ? '' : ' btn-icone-primario'}`} type="submit"
                aria-label={rotulo} disabled={pendente} title={estado.erro ?? rotulo}>
          <Icone nome={publicada ? 'visibility_off' : 'visibility'} tamanho={20} />
          <span className="dica-icone" aria-hidden="true">{rotulo}</span>
        </button>
      ) : (
        <button className={`btn ${publicada ? 'btn-contorno' : 'btn-primario'}`} type="submit" disabled={pendente}>
          {pendente ? '…' : rotulo}
        </button>
      )}
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert" style={{ marginTop: 8 }}>{estado.erro}</p>
      )}
    </form>
  );
}

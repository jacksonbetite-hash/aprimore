'use client';

import { useState } from 'react';
import { BotaoIcone } from '../../ui.tsx';
import { DIAS_MAXIMOS, type StatusVaga } from '../../../lib/vagas-rotulos.ts';

type Acao = (dados: FormData) => Promise<void>;

/**
 * Os botões de moderação de uma linha da fila.
 *
 * É componente de cliente por causa de dois campos que não podem viver
 * escondidos num `hidden`: a vigência, que o moderador escolhe na hora de
 * aprovar, e o motivo da recusa, que o §5.7.1 torna obrigatório. Recusar
 * sem dizer por quê transforma a moderação em caixa-preta, e o anunciante
 * fica sem saber o que corrigir.
 */
export default function AcoesVaga({
  vaga, publicar, recusar, pausar, retomar, repor,
}: {
  vaga: { id: number; status: StatusVaga; moderadaPor: string | null; moderadaEm: string | null };
  publicar: Acao; recusar: Acao; pausar: Acao; retomar: Acao; repor: Acao;
}) {
  const [recusando, setRecusando] = useState(false);
  const naFila = vaga.status === 'em_moderacao';

  if (recusando) {
    return (
      <form action={recusar} className="form-linha" style={{ gap: 8 }}>
        <input type="hidden" name="id" value={vaga.id} />
        <input name="motivo" required maxLength={300} autoFocus
          placeholder="Motivo — o anunciante recebe esta frase"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8,
                   border: '1px solid var(--outline-variant)' }} />
        <div className="acoes-linha">
          <BotaoIcone icone="check" rotulo="Confirmar recusa" variante="primario" />
          <BotaoIcone icone="close" rotulo="Cancelar" tipo="button"
            aoClicar={() => setRecusando(false)} />
        </div>
      </form>
    );
  }

  return (
    <div className="acoes-linha">
      {(naFila || vaga.status === 'rascunho') && (
        <form action={publicar} className="acoes-linha">
          <input type="hidden" name="id" value={vaga.id} />
          <input name="dias" type="number" min={1} max={DIAS_MAXIMOS} defaultValue={DIAS_MAXIMOS}
            aria-label="Dias de vigência" title={`Máximo de ${DIAS_MAXIMOS} dias (§5.7.1)`}
            style={{ width: 68, padding: '6px 8px', borderRadius: 8,
                     border: '1px solid var(--outline-variant)' }} />
          <BotaoIcone icone="check_circle" rotulo="Aprovar e publicar" variante="primario" />
        </form>
      )}

      {vaga.status === 'publicada' && (
        <form action={pausar}>
          <input type="hidden" name="id" value={vaga.id} />
          <BotaoIcone icone="pause" rotulo="Pausar" />
        </form>
      )}

      {vaga.status === 'pausada' && (
        <form action={retomar}>
          <input type="hidden" name="id" value={vaga.id} />
          <BotaoIcone icone="play_arrow" rotulo="Retomar" />
        </form>
      )}

      {(vaga.status === 'expirada' || vaga.status === 'removida') && (
        <form action={repor}>
          <input type="hidden" name="id" value={vaga.id} />
          <BotaoIcone icone="replay" rotulo="Repor na fila" />
        </form>
      )}

      {vaga.status !== 'removida' && (
        <BotaoIcone icone="block" rotulo={naFila ? 'Recusar' : 'Remover'} variante="perigo"
          tipo="button" aoClicar={() => setRecusando(true)} />
      )}

      {vaga.moderadaPor && (
        <span className="suave" style={{ fontSize: 12, width: '100%' }}>
          por {vaga.moderadaPor} em {vaga.moderadaEm}
        </span>
      )}
    </div>
  );
}

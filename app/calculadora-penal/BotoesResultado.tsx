'use client';

import { useState } from 'react';
import { Icone } from '../ui.tsx';

/**
 * Imprimir e copiar o link — as duas coisas que precisam de JavaScript no
 * resultado. O resto da página é servidor.
 */
export default function BotoesResultado({ param }: { param: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const url = `${window.location.origin}/calculadora-penal?c=${param}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt('Copie o endereço deste cálculo:', url);
    }
  }

  return (
    <div className="calc-botoes">
      <button type="button" className="btn btn-contorno btn-sm" onClick={copiar}>
        <Icone nome={copiado ? 'check' : 'link'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar link'}
      </button>
      <button type="button" className="btn btn-contorno btn-sm" onClick={() => window.print()}>
        <Icone nome="print" tamanho={16} /> Imprimir
      </button>
    </div>
  );
}

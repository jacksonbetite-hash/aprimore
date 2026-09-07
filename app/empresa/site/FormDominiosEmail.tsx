'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

/**
 * Quem pode criar conta sozinho — §5.11, etapa 2 (a política; o cadastro
 * que a obedece chega na etapa 4).
 *
 * O padrão é a lista vazia, e essa é a escolha certa para quase toda
 * empresa: só entra quem o RH convidou, um a um ou por planilha. Liberar
 * um domínio é a comodidade de não convidar 400 pessoas — e o preço é
 * que qualquer um com um e-mail daquele domínio entra, inclusive um
 * ex-funcionário cujo e-mail ainda não foi desligado.
 */
export default function FormDominiosEmail(
  { acao, dominios }: { acao: Acao; dominios: string[] },
) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <form onSubmit={aoEnviar} className="formulario">
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p className="alerta alerta-ok" role="status">
          <Icone nome="check_circle" tamanho={20} /> {estado.ok}
        </p>
      )}

      <label>
        Domínios de e-mail autorizados
        <input name="dominios" type="text" maxLength={400} defaultValue={dominios.join(', ')}
               placeholder="suaempresa.com.br, suaempresa.com"
               style={{ textTransform: 'lowercase' }} />
        <span className="dica">
          Separe por vírgula, só a parte depois do @. Deixe vazio para exigir convite de
          todo mundo — é o mais seguro, e o padrão.
        </span>
      </label>

      <p className="aviso" style={{ margin: 0 }}>
        <strong>Pense em quem sai da empresa.</strong> Com um domínio liberado, qualquer
        pessoa com e-mail nele cria a conta sem passar por você. Se o desligamento na sua
        empresa não corta o e-mail no mesmo dia, prefira o convite nominal.
      </p>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar política de acesso'}
        </button>
      </div>
    </form>
  );
}

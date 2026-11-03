'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from './ui.tsx';
import type { EstadoInteresse } from './empresas/acoes.ts';

type Acao = (estado: EstadoInteresse, dados: FormData) => Promise<EstadoInteresse>;

/**
 * "Ainda não tenho acesso" — o formulário do colaborador na página
 * pública da universidade (app/PaginaEmpresa.tsx). O pedido cai na fila
 * do RH em /empresa/colaboradores, que responde com o convite por link.
 *
 * onSubmit + startTransition, e não `<form action>`: com `action` o React
 * limpa os campos ao fim de cada envio, inclusive no erro.
 */
export default function FormPedidoAcesso({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  if (estado.ok) {
    return (
      <p className="alerta alerta-ok" role="status">
        <Icone nome="check_circle" tamanho={20} /> {estado.ok}
      </p>
    );
  }

  return (
    <form onSubmit={aoEnviar} className="formulario uni-form" id="pedir-acesso">
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}
      <input name="site" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
             style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

      <div className="uni-form-linha">
        <label>
          Seu nome
          <input name="nome" type="text" autoComplete="name" required maxLength={120} placeholder="Como está no crachá" />
        </label>
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required placeholder="de preferência, o da empresa" />
        </label>
      </div>
      <label>
        Setor ou equipe
        <input name="setor" type="text" maxLength={80} placeholder="Ex: Loja Centro, Financeiro, Estoque…" />
      </label>
      <label>
        Mensagem
        <textarea name="mensagem" rows={3} maxLength={1000}
                  placeholder="opcional — desde quando você está na empresa, quem é o seu gestor…" />
      </label>

      <button className="btn btn-primario btn-lg" type="submit" disabled={pendente}>
        {pendente ? 'Enviando…' : 'Pedir acesso ao RH'}
        <Icone nome="arrow_forward" tamanho={20} />
      </button>
      <p className="dica centro">
        <Icone nome="lock" tamanho={14} /> Quem lê este pedido é o setor de treinamento da
        sua empresa, que é a controladora dos seus dados (LGPD).
      </p>
    </form>
  );
}

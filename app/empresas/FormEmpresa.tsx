'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../ui.tsx';
import type { EstadoInteresse } from './acoes.ts';

type Acao = (estado: EstadoInteresse, dados: FormData) => Promise<EstadoInteresse>;
type Opcao = { valor: string; rotulo: string };

/**
 * Formulário de interesse corporativo. Uma tela só, curta: quem chega
 * aqui já leu a proposta na página de planos; o que falta é o contato e
 * o porte, para a proposta sair certa na primeira conversa.
 *
 * A ação é disparada no onSubmit, e não por `<form action>`, de
 * propósito: com `action`, o React limpa o formulário ao fim de cada
 * envio — inclusive quando a resposta é um erro — e quem errou o CNPJ
 * recomeçava do zero, com os selects de volta à primeira opção. Aqui os
 * campos ficam como estavam, e só o erro aparece.
 */
export default function FormEmpresa({ acao, planos, portes, planoInicial }: {
  acao: Acao; planos: Opcao[]; portes: Opcao[]; planoInicial: string;
}) {
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
    <form onSubmit={aoEnviar} className="formulario" id="formulario">
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}

      {/* Isca para robô: fora do fluxo de leitura e do tab, nunca preenchida por gente. */}
      <input name="site" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
             style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

      <label>
        Seu nome
        <input name="nome" type="text" autoComplete="name" required maxLength={120} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          E-mail corporativo
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Telefone
          <input name="telefone" type="tel" autoComplete="tel" maxLength={20}
                 placeholder="opcional" />
        </label>
      </div>
      <label>
        Empresa
        <input name="empresa" type="text" autoComplete="organization" required maxLength={120} />
      </label>
      <label>
        CNPJ
        <input name="cnpj" type="text" required maxLength={18} placeholder="00.000.000/0001-00" />
        <span className="dica">O contrato corporativo é com a pessoa jurídica.</span>
      </label>
      <label>
        Tamanho da equipe
        <select name="porte" required defaultValue="">
          <option value="" disabled>Escolha…</option>
          {portes.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
      </label>
      <label>
        Plano de interesse
        <select name="plano" required defaultValue={planoInicial}>
          {planos.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
      </label>
      <label>
        O que a equipe precisa aprender?
        <textarea name="mensagem" rows={3} maxLength={2000}
                  placeholder="opcional — integração, compliance, atendimento…" />
      </label>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <input type="checkbox" name="aceite" required style={{ marginTop: 4 }} />
        <span style={{ fontWeight: 400, fontSize: 14 }}>
          Autorizo o uso destes dados só para responder a este pedido (LGPD, art. 7º, V).
          Nada de lista de e-mail.
        </span>
      </label>

      <button className="btn btn-primario btn-lg" type="submit" disabled={pendente}>
        {pendente ? 'Enviando…' : 'Quero uma apresentação'}
      </button>
      <p className="dica">
        Sem compromisso e sem cobrança: a contratação só acontece depois da proposta aceita.
      </p>
    </form>
  );
}

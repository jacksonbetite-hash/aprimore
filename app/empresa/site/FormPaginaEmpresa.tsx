'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

/**
 * A página de entrada do portal da empresa — §5.11, etapa 2.
 *
 * O que se edita aqui é curto de propósito, e mais curto que o do
 * professor. O professor precisa de vitrine: chamada, propósito, "quem
 * ensina", contato, porque a página dele VENDE. A empresa precisa de
 * PORTA: a marca para a pessoa reconhecer que chegou no lugar certo, uma
 * frase de boas-vindas e a quem recorrer quando não conseguir entrar.
 * Todo o resto do portal dela é fechado, e ninguém de fora lê.
 *
 * onSubmit em vez de `<form action>`: com `action` o React limpa os
 * campos ao fim de cada envio, inclusive no erro.
 */
export default function FormPaginaEmpresa({ acao, valores, nomeExibicao }: {
  acao: Acao;
  nomeExibicao: string;
  valores: {
    chamada?: string; proposito?: string; sobre?: string;
    contato?: string; corPrimaria?: string; foto?: string;
  };
}) {
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
        Nome da universidade
        <input name="nomeExibicao" type="text" required minLength={2} maxLength={80}
               defaultValue={nomeExibicao} />
        <span className="dica">
          É o nome no topo de toda tela do portal, no rodapé legal e no certificado —
          "Universidade Aurora", por exemplo. Muda na hora para quem abrir o endereço.
        </span>
      </label>

      <label>
        Mensagem de boas-vindas
        <input name="chamada" type="text" maxLength={160} defaultValue={valores.chamada ?? ''}
               placeholder={`Treinamento e desenvolvimento na ${nomeExibicao}`} />
        <span className="dica">
          A etiqueta no alto da página pública da universidade, acima do título — e a
          frase embaixo do nome na tela de entrada. É o que a pessoa lê antes de fazer login.
        </span>
      </label>

      <label>
        Contato do RH
        <input name="contato" type="text" maxLength={160} defaultValue={valores.contato ?? ''}
               placeholder="treinamento@suaempresa.com.br" />
        <span className="dica">
          Para quem não consegue entrar. Sem isso, a pessoa travada não tem a quem recorrer
          e o chamado chega ao nosso suporte, que não pode liberar acesso na sua empresa.
        </span>
      </label>

      <label>
        Logo ou imagem
        <input name="foto" type="text" maxLength={300} defaultValue={valores.foto ?? ''}
               placeholder="/api/imagem/…" />
        <span className="dica">
          Cole aqui o endereço da imagem que você enviou. Aparece na tela de entrada.
        </span>
      </label>

      <label>
        Cor principal
        <input name="corPrimaria" type="text" maxLength={7} defaultValue={valores.corPrimaria ?? ''}
               placeholder="#0f766e" />
        <span className="dica">
          Em hexadecimal, como <code>#0f766e</code>. Vira a cor dos botões e dos destaques
          do portal.
        </span>
      </label>

      <details>
        <summary className="caption suave" style={{ cursor: 'pointer' }}>
          Textos internos (aparecem depois do login)
        </summary>
        <div className="pilha-sm" style={{ marginTop: 12 }}>
          <label>
            Propósito do programa
            <textarea name="proposito" rows={3} maxLength={600}
                      defaultValue={valores.proposito ?? ''}
                      placeholder="Por que a empresa investe nestas trilhas e o que se espera de cada pessoa." />
          </label>
          <label>
            Sobre o programa
            <textarea name="sobre" rows={4} maxLength={1200} defaultValue={valores.sobre ?? ''}
                      placeholder="Regras internas: prazos, obrigatoriedade, o que acontece ao concluir." />
          </label>
        </div>
      </details>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar marca'}
        </button>
      </div>
    </form>
  );
}

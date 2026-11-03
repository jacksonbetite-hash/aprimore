'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from './ui.tsx';
import type { EstadoInteresse } from './empresas/acoes.ts';

type Acao = (estado: EstadoInteresse, dados: FormData) => Promise<EstadoInteresse>;
type Opcao = { valor: string; rotulo: string };

/**
 * "Solicite uma demonstração guiada" — o formulário da página pública da
 * universidade corporativa (app/PaginaEmpresa.tsx).
 *
 * Não nasceu uma segunda fila de contato: o pedido entra em
 * `interesse_empresa` pela mesma ação da vitrine `/empresas`, e o
 * comercial o atende em `/admin/empresas` como qualquer outro. O que o
 * protótipo chamava de "foco da capacitação" viaja no campo `mensagem`,
 * com o nome do portal de onde veio — sem isso, o comercial não saberia
 * que a pessoa chegou pela página de uma universidade já no ar.
 *
 * O CNPJ não estava no protótipo e está aqui porque a fila exige (o
 * contrato corporativo é com a pessoa jurídica, db/032). O plano vai
 * fixo em "enterprise": demonstração guiada e proposta sob medida é o
 * que esse plano significa.
 *
 * onSubmit + startTransition, e não `<form action>`: com `action` o React
 * limpa os campos ao fim de cada envio, inclusive no erro.
 */
export default function FormDemonstracao({ acao, portes, origem }: {
  acao: Acao; portes: Opcao[]; origem: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const foco = String(dados.get('foco') ?? '').trim();
    dados.set('mensagem',
      `[Página de ${origem}] ${foco ? `Foco principal: ${foco}` : 'Sem foco informado.'}`);
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
    <form onSubmit={aoEnviar} className="formulario uni-form">
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}

      {/* Isca para robô: fora do fluxo de leitura e do tab, nunca preenchida por gente. */}
      <input name="site" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
             style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <input type="hidden" name="plano" value="enterprise" />

      <div className="uni-form-linha">
        <label>
          Seu Nome Completo
          <input name="nome" type="text" autoComplete="name" required maxLength={120}
                 placeholder="Ex: Ana Silva" />
        </label>
        <label>
          E-mail Corporativo
          <input name="email" type="email" autoComplete="email" required
                 placeholder="ana@suaempresa.com.br" />
        </label>
      </div>

      <div className="uni-form-linha">
        <label>
          Nome da Empresa
          <input name="empresa" type="text" autoComplete="organization" required maxLength={120}
                 placeholder="Ex: Grupo Inovação" />
        </label>
        <label>
          CNPJ
          <input name="cnpj" type="text" required maxLength={18} placeholder="00.000.000/0001-00" />
        </label>
      </div>

      <div className="uni-form-linha">
        <label>
          Número de Colaboradores
          <select name="porte" required defaultValue="">
            <option value="" disabled>Escolha…</option>
            {portes.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
          </select>
        </label>
        <label>
          Telefone
          <input name="telefone" type="tel" autoComplete="tel" maxLength={20} placeholder="opcional" />
        </label>
      </div>

      <label>
        Qual é o foco principal da capacitação?
        <input name="foco" type="text" maxLength={300}
               placeholder="Ex: Onboarding, Compliance, Liderança, Atualização Jurídica..." />
      </label>

      <button className="btn btn-primario btn-lg" type="submit" disabled={pendente}>
        {pendente ? 'Enviando…' : 'Agendar Demonstração Gratuita'}
        <Icone nome="calendar_month" tamanho={20} />
      </button>
      <p className="dica centro">
        <Icone nome="lock" tamanho={14} /> Seus dados são usados só para responder a este
        pedido (LGPD, art. 7º, V). Não enviamos spam.
      </p>
    </form>
  );
}

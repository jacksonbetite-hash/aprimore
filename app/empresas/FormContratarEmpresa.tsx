'use client';

import { startTransition, useActionState, useState } from 'react';
import { Icone } from '../ui.tsx';
import type { EstadoContratarEmpresa } from './acoes.ts';

type Acao = (estado: EstadoContratarEmpresa, dados: FormData) => Promise<EstadoContratarEmpresa>;

export interface PlanoNaTela {
  id: number;
  nome: string;
  limiteContas: number | null;
  precoMes: string;
  dominioProprio: string;
  itens: string[];
  recomendado?: boolean;
}

/**
 * Contratação do Portal da Empresa — §5.11, etapa 1.
 *
 * Uma tela só, como a do professor: quem chega aqui já leu a proposta
 * acima, e quebrar em passos ("crie a conta, depois o portal, depois
 * pague") é onde funil de assinatura morre.
 *
 * Duas diferenças em relação ao formulário do professor, e as duas
 * existem por motivo:
 *
 *  - NÃO pede celular, renda nem endereço. Aqueles dados existem para
 *    abrir a subconta que recebe as vendas do professor; a empresa paga
 *    e não recebe, então pedi-los seria coletar dado pessoal sem
 *    finalidade (§12.1).
 *  - PEDE o plano. O professor tem um; a empresa escolhe entre dois, e o
 *    que muda entre eles é o teto de pessoas com acesso.
 *
 * A ação é disparada no onSubmit e não por `<form action>`: com `action`
 * o React limpa o formulário ao fim de cada envio, inclusive quando a
 * resposta é erro — e quem errou o CNPJ recomeçava do zero.
 */
export default function FormContratarEmpresa(
  { acao, planos, dominio, planoInicial }:
  { acao: Acao; planos: PlanoNaTela[]; dominio: string; planoInicial: number },
) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [mascara, setMascara] = useState('');
  const [plano, setPlano] = useState(planoInicial);

  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  const limpa = mascara.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  return (
    <form onSubmit={aoEnviar} className="formulario" id="contratar">
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}

      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        <legend className="caption suave">Escolha o plano</legend>
        {planos.map((p) => (
          <label key={p.id} className={`cartao escolha ${plano === p.id ? 'escolhida' : ''}`}
                 style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="radio" name="planoId" value={p.id} checked={plano === p.id}
                   onChange={() => setPlano(p.id)} style={{ marginTop: 4 }} />
            <span style={{ flex: 1 }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{p.nome}</strong>
              {p.recomendado && <span className="chip chip-sm chip-secundaria" style={{ marginLeft: 8 }}>mais escolhido</span>}
              <br />
              <strong style={{ color: 'var(--primary-texto)' }}>{p.precoMes}/mês</strong>
              <span className="suave">
                {' · '}
                {p.limiteContas === null ? 'sem limite de pessoas' : `até ${p.limiteContas} pessoas`}
                {' · '}{p.dominioProprio}
              </span>
              <ul className="caption suave" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {p.itens.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </span>
          </label>
        ))}
      </fieldset>

      <label>
        Seu nome
        <input name="nome" type="text" autoComplete="name" required maxLength={120} />
        <span className="dica">Você fica como responsável pelo contrato e pode convidar
          outras pessoas do RH depois.</span>
      </label>
      <label>
        E-mail corporativo
        <input name="email" type="email" autoComplete="email" required />
        <span className="dica">Vira o seu login e recebe as faturas.</span>
      </label>
      <label>
        Senha
        <input name="senha" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label>
        CNPJ da empresa
        <input name="cnpj" type="text" inputMode="text" required
               placeholder="00.000.000/0001-00" maxLength={18} />
        <span className="dica">O contrato é com a pessoa jurídica, e é o CNPJ que aparece
          no rodapé do seu portal e no certificado dos colaboradores.</span>
      </label>

      <label>
        Nome do portal
        <input name="nomeExibicao" type="text" required maxLength={120}
               placeholder="Universidade Corporativa Acme" />
        <span className="dica">É o que o colaborador lê no topo da página.</span>
      </label>
      <label>
        Endereço do portal
        <input name="mascara" type="text" required maxLength={32} placeholder="acme"
               value={mascara} onChange={(e) => setMascara(e.target.value)}
               pattern="[a-zA-Z0-9-]+" />
        <span className="dica">
          Seu portal vai responder em <strong>{limpa || 'suaempresa'}.{dominio}</strong>.
          {' '}Depois dá para apontar um domínio seu, como <em>treinamento.suaempresa.com.br</em>.
        </span>
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend className="caption suave">Como quer pagar a 1ª mensalidade</legend>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="radio" name="meio" value="PIX" defaultChecked /> Pix
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="radio" name="meio" value="CARTAO" /> Cartão da empresa
        </label>
      </fieldset>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" name="aceite" required style={{ marginTop: 4 }} />
        <span className="caption">
          Li e aceito o contrato de prestação de serviço. Declaro que a empresa é a
          <strong> controladora</strong> dos dados dos colaboradores que cadastrar, e que
          a plataforma é a operadora (LGPD, art. 5º).
        </span>
      </label>

      <button className="btn btn-primario btn-lg btn-bloco" type="submit" disabled={pendente}>
        {pendente ? 'Criando o seu portal…' : 'Contratar e ir para o pagamento'}
      </button>
      <p className="caption suave" style={{ textAlign: 'center' }}>
        O portal entra no ar assim que o pagamento confirmar. Arrependeu? Devolução
        integral em até 7 dias (CDC, art. 49).
      </p>
    </form>
  );
}

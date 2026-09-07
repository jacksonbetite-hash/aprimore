'use client';

import { useActionState, useId, useState } from 'react';
import type { EstadoAdmin } from '../acoes.ts';
import type { PlanoPortal, PortalAdmin, Personalizacao } from '../../../lib/admin-portais.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

const reais = (centavos: number) => (centavos / 100).toFixed(2).replace('.', ',');

function Avisos({ estado }: { estado: EstadoAdmin }) {
  return (
    <>
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}
    </>
  );
}

/**
 * Conta do professor. Ele é usuário da PLATAFORMA, não do portal dele —
 * é assim que entra na nossa retaguarda para operar o próprio site. A
 * base de alunos do portal continua separada (§5.10).
 */
export function FormProfessor({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="form-linha">
      <Avisos estado={estado} />
      <div className="campos">
        <label>Nome<input name="nome" required maxLength={120} /></label>
        <label>E-mail<input name="email" type="email" required /></label>
        <label>Senha inicial<input name="senha" required minLength={8} /></label>
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Cadastrar professor'}
        </button>
      </div>
      <p className="dica">
        E-mail já cadastrado na plataforma é <strong>promovido</strong> a professor, sem criar
        conta nova. Entregue a senha por canal seguro e peça a troca no primeiro acesso.
      </p>
    </form>
  );
}

/** O plano é a oferta; o contrato é o que foi acordado com um professor. */
export function FormPlano({ acao, plano }: { acao: Acao; plano?: PlanoPortal }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="form-editor">
      {plano && <input type="hidden" name="id" value={plano.id} />}
      <Avisos estado={estado} />
      <div className="linha estreita">
        <label>Nome<input name="nome" defaultValue={plano?.nome} required /></label>
        <label>
          Licença mensal (R$)
          <input name="licencaMensal" inputMode="decimal" required
            defaultValue={plano ? reais(plano.licencaMensalCentavos) : '149,00'} />
        </label>
        <label>
          Percentual base (%)
          <input name="percentualBase" type="number" step="0.01" min={0} max={100} required
            defaultValue={plano?.percentualBase ?? '10.00'} />
        </label>
        <label>
          Acréscimo por indicação (p.p.)
          <input name="acrescimoIndicacaoPp" type="number" step="0.01" min={0} max={100} required
            defaultValue={plano?.acrescimoIndicacaoPp ?? '5.00'} />
        </label>
      </div>
      <div className="linha estreita">
        <label>
          Armazenamento (GB)
          <input name="gbArmazenamento" type="number" min={0} required
            defaultValue={plano?.gbArmazenamento ?? 50} />
        </label>
        <label>
          Banda por mês (GB)
          <input name="gbBandaMes" type="number" min={0} required
            defaultValue={plano?.gbBandaMes ?? 200} />
        </label>
        <label>
          Excedente por GB (R$)
          <input name="porGbExcedente" inputMode="decimal" required
            defaultValue={plano ? reais(plano.centavosPorGbExcedente) : '0,90'} />
        </label>
        <label>
          Domínio próprio (R$/mês)
          <input name="dominioProprio" inputMode="decimal" placeholder="vazio = não oferece"
            defaultValue={plano?.centavosDominioProprio != null ? reais(plano.centavosDominioProprio) : ''} />
        </label>
        <label className="marcador">
          <input type="checkbox" name="ativo" defaultChecked={plano?.ativo ?? true} />
          Plano em oferta
        </label>
      </div>
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : plano ? 'Salvar plano' : 'Criar plano'}
        </button>
        <span className="dica">
          Alterar o plano não mexe em contrato vivo: o contrato copiou os números no aceite,
          de propósito (§5.10). O excedente de vídeo é cobrado, não bloqueado.
        </span>
      </div>
    </form>
  );
}

/** Cadastro do portal: quem é o dono, qual o endereço e sob qual plano. */
export function FormPortal({
  acao, planos, professores, portal,
}: {
  acao: Acao;
  planos: PlanoPortal[];
  professores: { id: number; nome: string; email: string }[];
  portal?: PortalAdmin;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="form-editor">
      {portal && <input type="hidden" name="id" value={portal.id} />}
      <Avisos estado={estado} />

      <div className="linha">
        <label>
          Endereço (máscara)
          <input name="mascara" defaultValue={portal?.mascara} required
            pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]" placeholder="jackson" />
          <span className="dica">
            Vira <code>{'{máscara}'}.aprimoreosaber.com.br</code>. Minúsculas, números e hífen no
            meio. Nome de rota do sistema, de infraestrutura ou da marca é recusado.
          </span>
        </label>
        <label>
          Nome de exibição
          <input name="nomeExibicao" defaultValue={portal?.nomeExibicao} required maxLength={140}
            placeholder="Aulas do Jackson" />
        </label>
      </div>

      <div className="linha">
        <label>
          Professor
          <select name="professorId" defaultValue={portal?.professorId ?? ''} required>
            <option value="" disabled>escolha…</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} — {p.email}</option>
            ))}
          </select>
        </label>
        <label>
          Plano
          <select name="planoId" defaultValue={portal?.planoId ?? ''} required>
            <option value="" disabled>escolha…</option>
            {planos.filter((p) => p.ativo || p.id === portal?.planoId).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — R$ {reais(p.licencaMensalCentavos)}/mês + {p.percentualBase}%
              </option>
            ))}
          </select>
        </label>
        {portal && (
          <label>
            Domínio próprio
            <input name="dominioProprio" defaultValue={portal.dominioProprio ?? ''}
              placeholder="site.dominiodele.com.br" />
            <span className="dica">
              Definido aqui, já vale como verificado. O professor cadastra o dele no painel
              e verifica o CNAME; o preço está no plano.
            </span>
          </label>
        )}
      </div>

      <div className="linha">
        <label>
          Responsável (nome)
          <input name="responsavelNome" defaultValue={portal?.responsavelNome ?? ''} />
        </label>
        <label>
          CNPJ do responsável
          <input name="responsavelDoc" defaultValue={portal?.responsavelDoc ?? ''}
            placeholder="00.000.000/0001-00" />
        </label>
        <label>
          E-mail do responsável
          <input name="responsavelEmail" type="email"
            defaultValue={portal?.responsavelEmail ?? ''} />
        </label>
      </div>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : portal ? 'Salvar portal' : 'Criar portal'}
        </button>
        <span className="dica">
          O responsável aparece no rodapé do portal. É a identificação exigida pelo §5.10 para
          conteúdo de terceiro hospedado no nosso domínio — e o split no gateway exige CNPJ.
        </span>
      </div>
    </form>
  );
}

/**
 * Cor principal do portal: amostra clicável + o valor por extenso.
 *
 * Só um campo de texto pedindo "#997bf4" transferia ao professor a
 * tarefa de descobrir o código hexadecimal da própria marca. O
 * `input[type=color]` abre a paleta do sistema; o campo de texto
 * continua ali para quem já tem o código da identidade visual, e os dois
 * andam juntos. O que vai ao servidor é sempre o texto — `corSegura`
 * (lib/portal.ts) só aceita #rgb ou #rrggbb, e cor inválida é ignorada
 * em vez de virar CSS.
 */
function SeletorCor({ valor }: { valor: string }) {
  const [cor, setCor] = useState(valor);
  const id = useId();
  const valida = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(cor.trim());
  return (
    <label htmlFor={id}>
      Cor principal
      <span className="campo-cor">
        <input type="color" aria-label="Escolher a cor principal"
          value={valida ? cor.trim() : '#7c3aed'}
          onChange={(e) => setCor(e.target.value)} />
        <input id={id} name="corPrimaria" value={cor} placeholder="#997bf4"
          onChange={(e) => setCor(e.target.value)} />
      </span>
      <span className="dica">
        Clique no quadrado para escolher, ou escreva o código —
        formato <code>#rrggbb</code> (ex.: <code>#0f766e</code>). Ela pinta botões e
        destaques da sua página. Em branco, fica a cor padrão da plataforma.
      </span>
    </label>
  );
}

/** A página única do §5.10 — seções fixas, conteúdo do professor. */
export function FormSite({
  acao, portalId, personalizacao, campoFoto = true,
}: {
  acao: Acao; portalId: number; personalizacao: Personalizacao;
  /**
   * O caminho da foto como campo de texto. No painel do professor ele
   * some: quem grava esse caminho é o envio de arquivo, logo acima do
   * formulário, e deixá-lo editável só permitia apagá-lo sem querer ao
   * salvar. Escondido, o valor atual viaja num `hidden` — some da tela,
   * não do registro.
   */
  campoFoto?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="form-editor">
      <input type="hidden" name="id" value={portalId} />
      <Avisos estado={estado} />

      <label>
        Chamada da abertura
        <input name="chamada" defaultValue={personalizacao.chamada ?? ''} maxLength={180}
          placeholder="Direito Penal descomplicado, do zero à prática" />
      </label>
      <label>
        Propósito do trabalho
        <textarea name="proposito" defaultValue={personalizacao.proposito ?? ''} rows={4} />
      </label>
      <label>
        Sobre o professor
        <textarea name="sobre" defaultValue={personalizacao.sobre ?? ''} rows={4} />
      </label>
      <div className="linha">
        <label>
          Contato
          <input name="contato" defaultValue={personalizacao.contato ?? ''}
            placeholder="e-mail ou WhatsApp que aparece no portal" />
        </label>
        <SeletorCor valor={personalizacao.corPrimaria ?? ''} />
        {campoFoto ? (
          <label>
            Foto de apresentação
            <input name="foto" defaultValue={personalizacao.foto ?? ''}
              placeholder="nome-do-arquivo" />
            <span className="dica">
              O professor envia a dele pelo painel; aqui só se corrige o caminho.
            </span>
          </label>
        ) : (
          <input type="hidden" name="foto" value={personalizacao.foto ?? ''} />
        )}
      </div>

      <div className="acoes" style={{ display: 'grid', gap: 12 }}>
        {/* O aviso repete aqui embaixo de propósito: o botão fica no fim de
            um formulário longo, e uma confirmação só no topo passa
            despercebida — foi o relato de "salvei e não apareceu nada". */}
        <Avisos estado={estado} />
        <div className="acoes-linha">
          <button className="btn btn-primario" type="submit" disabled={pendente}>
            {pendente ? 'Salvando…' : 'Salvar página'}
          </button>
        </div>
        <span className="dica">
          Estrutura única, sem editor livre (§5.10): o professor controla texto, imagem e cor —
          não HTML, CSS nem a ordem das seções. É o que mantém o provisionamento automático e o
          suporte viáveis.
        </span>
      </div>
    </form>
  );
}

/** Contrato do portal — versionado, como o preço (§5.9). */
export function FormContrato({
  acao, portalId, planos, atual,
}: {
  acao: Acao;
  portalId: number;
  planos: PlanoPortal[];
  atual?: {
    planoId: number; licencaMensalCentavos: number;
    percentualBase: string; acrescimoIndicacaoPp: string;
    validadeCliqueDias: number; diasRetencao: number; percentualReserva: string;
  };
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <form action={enviar} className="form-editor">
      <input type="hidden" name="portalId" value={portalId} />
      <Avisos estado={estado} />

      <div className="linha estreita">
        <label>
          Plano de referência
          <select name="planoId" defaultValue={atual?.planoId ?? planos[0]?.id ?? ''} required>
            {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
        <label>
          Licença mensal (R$)
          <input name="licencaMensal" inputMode="decimal" required
            defaultValue={atual ? reais(atual.licencaMensalCentavos) : '149,00'} />
        </label>
        <label>
          Percentual base (%)
          <input name="percentualBase" type="number" step="0.01" min={0} max={100} required
            defaultValue={atual?.percentualBase ?? '10.00'} />
        </label>
        <label>
          Acréscimo por indicação (p.p.)
          <input name="acrescimoIndicacaoPp" type="number" step="0.01" min={0} max={100} required
            defaultValue={atual?.acrescimoIndicacaoPp ?? '5.00'} />
        </label>
      </div>

      <div className="linha estreita">
        <label>
          Validade do clique (dias)
          <input name="validadeCliqueDias" type="number" min={1} required
            defaultValue={atual?.validadeCliqueDias ?? 90} />
        </label>
        <label>
          Retenção na escrow (dias)
          <input name="diasRetencao" type="number" min={0} required
            defaultValue={atual?.diasRetencao ?? 30} />
        </label>
        <label>
          Reserva adicional (%)
          <input name="percentualReserva" type="number" step="0.01" min={0} max={100} required
            defaultValue={atual?.percentualReserva ?? '0'} />
        </label>
        <label>
          Vigente a partir de
          <input name="vigenteDe" type="date" defaultValue={amanha} required />
        </label>
      </div>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Registrando…' : 'Registrar novo contrato'}
        </button>
        <span className="dica">
          O contrato vigente é encerrado na data escolhida e o novo começa ali — nada é
          sobrescrito. É o que permite auditar uma venda antiga sem reconstituir a história dos
          contratos. A <strong>retenção</strong> é a proteção do reembolso de 7 dias do CDC num
          modelo com split; a <strong>reserva</strong> é o colchão para o chargeback que chega
          depois de a escrow ter liberado.
        </span>
      </div>
    </form>
  );
}

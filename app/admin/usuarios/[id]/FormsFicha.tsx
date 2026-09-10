'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../../ui.tsx';
import type { EstadoAdmin } from '../../acoes.ts';
import { ROTULO_PAPEL, PAPEIS_DA_EQUIPE } from '../../../../lib/permissoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

const aoEnviar = (enviar: (d: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  // onSubmit + startTransition: `<form action>` limpa os campos ao fim de
  // toda ação, inclusive no erro — e quem errou o CPF perderia o resto.
  e.preventDefault();
  const dados = new FormData(e.currentTarget);
  startTransition(() => enviar(dados));
};

function Avisos({ estado }: { estado: EstadoAdmin }) {
  return (
    <>
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status"><Icone nome="check_circle" tamanho={20} /> {estado.ok}</p>}
    </>
  );
}

const cpfComPontos = (s: string | null) =>
  s && s.length === 11 ? `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` : (s ?? '');

export function FormDados({ acao, usuario }: {
  acao: Acao;
  usuario: { id: number; nome: string; email: string; cpf: string | null; nascimento: Date | null };
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const nasc = usuario.nascimento ? new Date(usuario.nascimento).toISOString().slice(0, 10) : '';
  return (
    <form onSubmit={aoEnviar(enviar)} className="form-editor">
      <input type="hidden" name="id" value={usuario.id} />
      <Avisos estado={estado} />
      <div className="linha">
        <label>Nome<input name="nome" defaultValue={usuario.nome} required maxLength={120} /></label>
        <label>
          E-mail
          <input name="email" type="email" defaultValue={usuario.email} required />
          <span className="dica">Trocar o e-mail muda o login da pessoa. Ela não é avisada — o sistema ainda não envia e-mail.</span>
        </label>
      </div>
      <div className="linha estreita">
        <label>
          CPF
          <input name="cpf" defaultValue={cpfComPontos(usuario.cpf)} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" />
        </label>
        <label>Nascimento<input name="nascimento" type="date" defaultValue={nasc} /></label>
      </div>
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar dados'}</button>
      </div>
    </form>
  );
}

export function FormSenha({ acao, usuarioId }: { acao: Acao; usuarioId: number }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form onSubmit={aoEnviar(enviar)} className="form-linha">
      <input type="hidden" name="id" value={usuarioId} />
      <Avisos estado={estado} />
      <div className="campos">
        <label>
          Senha provisória
          <input name="senha" type="text" required minLength={8} autoComplete="off" />
        </label>
        <button className="btn btn-contorno" type="submit" disabled={pendente}>
          {pendente ? 'Definindo…' : 'Definir e encerrar sessões'}
        </button>
      </div>
      <p className="dica">
        É o "esqueci a senha" enquanto o sistema não envia e-mail: você vê a senha uma vez,
        passa por canal seguro e a pessoa troca no perfil. Toda sessão aberta cai na hora.
      </p>
    </form>
  );
}

export function FormPapel({ acao, usuarioId, papelAtual }: { acao: Acao; usuarioId: number; papelAtual: string }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form onSubmit={aoEnviar(enviar)} className="form-linha">
      <input type="hidden" name="id" value={usuarioId} />
      <Avisos estado={estado} />
      <div className="campos">
        <label>
          Papel na plataforma
          <select name="papel" defaultValue={papelAtual}>
            <option value="aluno">{ROTULO_PAPEL.aluno}</option>
            {PAPEIS_DA_EQUIPE.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
          </select>
        </label>
        <button className="btn btn-contorno" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Trocar papel'}
        </button>
      </div>
      <p className="dica">
        Só entre aluno e equipe. Professor e gestor têm o papel dado pelo portal que operam. A
        troca derruba as sessões: a pessoa entra de novo já com o papel novo.
      </p>
    </form>
  );
}

/** Contrato do professor do catálogo (db/046): percentual e vigência; fecha o anterior. */
export function FormContratoProfessor({ acao, usuarioId, atualPp }: { acao: Acao; usuarioId: number; atualPp: number | null }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={aoEnviar(enviar)} className="form-linha">
      <input type="hidden" name="id" value={usuarioId} />
      <Avisos estado={estado} />
      <div className="campos">
        <label>
          Comissão (%)
          <input name="comissaoPp" type="number" min={0} max={100} step="0.5" defaultValue={atualPp ?? 40} required />
        </label>
        <label>
          Vale a partir de
          <input name="vigenteDe" type="date" defaultValue={hoje} required />
        </label>
        <button className="btn btn-contorno" type="submit" disabled={pendente}>
          {pendente ? 'Registrando…' : atualPp === null ? 'Criar contrato' : 'Novo contrato'}
        </button>
      </div>
      <p className="dica">
        O contrato vigente é encerrado na véspera; a venda já feita mantém o percentual gravado nela.
      </p>
    </form>
  );
}

export function FormCortesia({ acao, usuarioId, materias }: {
  acao: Acao; usuarioId: number; materias: { id: number; nome: string }[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form onSubmit={aoEnviar(enviar)} className="form-linha">
      <input type="hidden" name="id" value={usuarioId} />
      <Avisos estado={estado} />
      <div className="campos">
        <label>
          Escopo
          <select name="materiaId" defaultValue="catalogo">
            <option value="catalogo">Passe completo</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>
        <label>Dias<input name="dias" type="number" min={1} max={3650} defaultValue={30} required /></label>
        <button className="btn btn-contorno" type="submit" disabled={pendente}>
          {pendente ? 'Concedendo…' : 'Conceder cortesia'}
        </button>
      </div>
    </form>
  );
}

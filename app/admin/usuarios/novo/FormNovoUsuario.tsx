'use client';

import { startTransition, useActionState, useState } from 'react';
import Link from 'next/link';
import { Icone } from '../../../ui.tsx';
import type { EstadoAdmin } from '../../acoes.ts';
import { ROTULO_PAPEL, PAPEIS_DA_EQUIPE } from '../../../../lib/permissoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
type Tipo = 'equipe' | 'aluno' | 'professor' | 'gestor';

interface PortalEscolha { id: number; nome: string; mascara: string; tipo: 'PROFESSOR' | 'EMPRESA' }
interface SetorEscolha { portalId: number; id: number; nome: string }

/**
 * O formulário pergunta primeiro O QUE está sendo criado e só depois pede
 * os campos daquele caso (docs/plano-perfis-e-acessos.md, §3). Um
 * formulário com todos os campos de todos os tipos obrigaria quem
 * cadastra a saber quais ignorar — e os ignorados errados viram erro no
 * servidor, não na tela.
 */
const TIPOS: { valor: Tipo; titulo: string; icone: string; descricao: string; soAdmin?: boolean }[] = [
  { valor: 'aluno', titulo: 'Aluno ou colaborador', icone: 'school',
    descricao: 'Conta que estuda: na plataforma, no portal de um professor ou no de uma empresa.' },
  { valor: 'professor', titulo: 'Professor', icone: 'shield_person',
    descricao: 'Conta da plataforma com papel de professor. O portal, quando houver, se cria em Portais.' },
  { valor: 'gestor', titulo: 'Gestor de empresa', icone: 'admin_panel_settings',
    descricao: 'Quem administra o treinamento de uma empresa (RH). Conta na plataforma, vínculo com o portal dela.' },
  { valor: 'equipe', titulo: 'Equipe da plataforma', icone: 'badge', soAdmin: true,
    descricao: 'Administrador, financeiro ou suporte — a retaguarda deste site.' },
];

export default function FormNovoUsuario({
  acao, portais, setores, podeCriarEquipe,
}: {
  acao: Acao; portais: PortalEscolha[]; setores: SetorEscolha[]; podeCriarEquipe: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [tipo, setTipo] = useState<Tipo>('aluno');
  const [portalId, setPortalId] = useState<string>('0');

  const portalEscolhido = portais.find((p) => String(p.id) === portalId);
  const empresa = tipo === 'gestor' || portalEscolhido?.tipo === 'EMPRESA';
  const setoresDoPortal = setores.filter((s) => String(s.portalId) === portalId);
  const portaisDoTipo = tipo === 'gestor' ? portais.filter((p) => p.tipo === 'EMPRESA') : portais;

  // Trocar o tipo troca as opções de portal; o valor antigo pode não existir mais.
  function escolherTipo(t: Tipo) {
    setTipo(t);
    if (t === 'gestor') setPortalId(String(portais.find((p) => p.tipo === 'EMPRESA')?.id ?? ''));
    else setPortalId('0');
  }

  // onSubmit + startTransition: com `<form action>`, o React limpa os
  // campos ao fim de toda ação — inclusive no erro de validação.
  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  }

  return (
    <form onSubmit={aoEnviar} className="form-editor">
      <input type="hidden" name="tipo" value={tipo} />
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>
      )}

      <div className="seletor-tipo" role="radiogroup" aria-label="O que está sendo criado">
        {TIPOS.filter((t) => !t.soAdmin || podeCriarEquipe).map((t) => (
          <button key={t.valor} type="button" role="radio" aria-checked={tipo === t.valor}
                  className={`cartao-tipo${tipo === t.valor ? ' ativo' : ''}`}
                  onClick={() => escolherTipo(t.valor)}>
            <span className="selo"><Icone nome={t.icone} tamanho={22} /></span>
            <strong>{t.titulo}</strong>
            <span className="caption suave">{t.descricao}</span>
          </button>
        ))}
      </div>

      {(tipo === 'aluno' || tipo === 'gestor') && (
        <div className="linha estreita">
          <label>
            {tipo === 'gestor' ? 'Empresa' : 'Onde a conta nasce'}
            <select name="portalId" value={portalId} onChange={(e) => setPortalId(e.target.value)} required>
              {tipo === 'aluno' && <option value="0">Plataforma (site principal)</option>}
              {portaisDoTipo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tipo === 'EMPRESA' ? 'Empresa' : 'Professor'} · {p.nome} ({p.mascara})
                </option>
              ))}
            </select>
            {tipo === 'aluno' && portalEscolhido && (
              <span className="dica">
                {portalEscolhido.tipo === 'EMPRESA'
                  ? 'Colaborador: entra no teto de contas do plano e recebe as trilhas do setor.'
                  : 'A base é do professor (LGPD): o cadastro fica em auditoria como suporte.'}
              </span>
            )}
            {tipo === 'gestor' && portaisDoTipo.length === 0 && (
              <span className="dica">Nenhuma empresa cadastrada ainda.</span>
            )}
          </label>
          {tipo === 'aluno' && empresa && (
            <>
              <label>
                Setor
                <select name="setorId" defaultValue="">
                  <option value="">sem setor</option>
                  {setoresDoPortal.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </label>
              <label>
                Matrícula (opcional)
                <input name="matricula" maxLength={40} autoComplete="off" />
              </label>
            </>
          )}
        </div>
      )}

      {tipo === 'equipe' && (
        <div className="linha estreita">
          <label>
            Papel na retaguarda
            <select name="papel" defaultValue="suporte" required>
              {PAPEIS_DA_EQUIPE.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
            </select>
            <span className="dica">
              Financeiro só enxerga o dinheiro; suporte cuida de cadastro e licença; admin faz tudo.
            </span>
          </label>
        </div>
      )}

      <div className="linha">
        <label>
          Nome
          <input name="nome" required maxLength={120} autoComplete="off" />
        </label>
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="off" />
          <span className="dica">
            {tipo === 'equipe' || tipo === 'professor' || tipo === 'gestor'
              ? 'E-mail que já é de aluno na plataforma é promovido, sem conta nova.'
              : 'A conta é uma por e-mail: quem já tem conta em outro portal ganha só o '
                + 'perfil aqui e entra com a senha que já usa.'}
          </span>
        </label>
      </div>
      <div className="linha estreita">
        <label>
          Senha provisória
          <input name="senha" type="text" required minLength={8} autoComplete="off" />
          <span className="dica">Ao menos 8 caracteres. Passe por canal seguro; a pessoa troca no perfil.</span>
        </label>
        <label>
          CPF (opcional)
          <input name="cpf" inputMode="numeric" maxLength={14} autoComplete="off" placeholder="000.000.000-00" />
          <span className="dica">Só é obrigatório na compra (§12.1). Conferido pelos dígitos.</span>
        </label>
      </div>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Criando…' : 'Criar conta'}
        </button>
        <Link className="btn btn-contorno" href="/admin/usuarios">Cancelar</Link>
      </div>
    </form>
  );
}

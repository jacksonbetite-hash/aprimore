'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Icone } from './ui.tsx';
import type { EstadoForm } from './acoes-auth.ts';

type Acao = (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;

/**
 * `semCadastro` — §5.11: no portal de uma empresa ninguém cria conta
 * sozinho, e /cadastrar redireciona. Oferecer "criar conta grátis" ali
 * seria mandar o colaborador para uma porta que não abre, e sugerir que
 * o acesso é dele para pedir quando quem libera é o RH.
 */
export function FormEntrar(
  { acao, destino, semCadastro }: { acao: Acao; destino?: string; semCadastro?: boolean },
) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="formulario">
      {/* Para onde voltar depois de entrar. Quando não vem nada, quem
          decide é o papel do usuário (lib/navegacao.ts). */}
      {destino && <input type="hidden" name="destino" value={destino} />}
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required autoFocus />
      </label>
      <label>
        Senha
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn btn-primario" type="submit" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
      {semCadastro ? (
        <p className="rodape-form">
          Sem acesso ainda? Quem libera é o setor responsável pelo treinamento na sua empresa.
        </p>
      ) : (
        <p className="rodape-form">
          Ainda não tem conta? <Link href="/cadastrar">Criar conta grátis</Link>
        </p>
      )}
    </form>
  );
}

export function FormCadastro({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="formulario">
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      <label>
        Como podemos te chamar?
        <input name="nome" type="text" autoComplete="name" required autoFocus maxLength={120} />
      </label>
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Senha
        <input name="senha" type="password" autoComplete="new-password" required minLength={8} />
        <span className="dica">Pelo menos 8 caracteres. Frase curta funciona melhor que sigla.</span>
      </label>
      <button className="btn btn-primario" type="submit" disabled={pendente}>
        {pendente ? 'Criando…' : 'Criar conta grátis'}
      </button>
      <p className="rodape-form">
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
      <p className="dica">
        Não pedimos CPF no cadastro — só na compra, para nota fiscal (§12.1 da nossa
        política de privacidade). Menores de 18 precisam do aceite do responsável.
      </p>
    </form>
  );
}

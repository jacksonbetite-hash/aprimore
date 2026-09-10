'use client';

import { startTransition, useActionState } from 'react';
import Link from 'next/link';
import { Icone } from '../../ui.tsx';
import type { EstadoCatalogo } from './acoes.ts';

type Acao = (e: EstadoCatalogo, d: FormData) => Promise<EstadoCatalogo>;

/**
 * Uma tela só: quem chegou aqui já leu a proposta. E-mail que já tem
 * conta na plataforma entra com a senha dela (é o que vira a conta em
 * professor); e-mail novo escolhe a senha aqui.
 */
export default function FormCatalogo({ acao, comissaoPp }: { acao: Acao; comissaoPp: number }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form className="formulario" id="cadastro" onSubmit={(e) => {
      e.preventDefault();
      const dados = new FormData(e.currentTarget);
      startTransition(() => enviar(dados));
    }}>
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>
      )}
      <label>
        Seu nome
        <input name="nome" type="text" autoComplete="name" required maxLength={120} />
        <span className="dica">É o nome que assina os seus cursos no catálogo.</span>
      </label>
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required />
        <span className="dica">Vira o seu login. Se já tem conta na plataforma, use o mesmo e-mail e a senha dela.</span>
      </label>
      <label>
        Senha
        <input name="senha" type="password" autoComplete="new-password" required minLength={8} />
        <span className="dica">Pelo menos 8 caracteres. Conta que já existe: a senha atual.</span>
      </label>
      <label>
        CPF ou CNPJ
        <input name="documento" inputMode="numeric" required maxLength={18} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
        <span className="dica">Para o contrato e para a nota fiscal do repasse. CNPJ só é exigido se quiser receber pelo gateway, com subconta.</span>
      </label>
      <label className="lembrar">
        <input type="checkbox" name="aceite" required />
        <span>
          Li e aceito o contrato de professor do catálogo: comissão de <strong>{comissaoPp}%</strong> sobre
          cada venda paga, apuração mensal com 5 dias de conferência, nota fiscal e repasse por Pix
          até o dia 15. Publicação com revisão da plataforma.
        </span>
      </label>
      <button className="btn btn-primario" type="submit" disabled={pendente}>
        {pendente ? 'Cadastrando…' : 'Cadastrar-me no catálogo'}
        {!pendente && <Icone nome="arrow_forward" tamanho={18} />}
      </button>
      <p className="rodape-form">
        Quer site próprio, com sua marca e sua base de alunos? <Link href="/para-professores#preco">Veja o portal do professor</Link>.
      </p>
    </form>
  );
}

'use client';

import { useActionState } from 'react';
import type { EstadoPerfil } from './acoes-perfil.ts';

/**
 * "As informações que ao meu perfil são pertinentes": nome, e-mail e
 * senha. Papel e situação da conta ficam de fora de propósito — quem
 * muda papel é a retaguarda, e uma tela de perfil que promove o próprio
 * dono a administrador é um buraco, não um recurso.
 */
export default function FormPerfil({
  acao, nome, email, temSenha,
}: {
  acao: (e: EstadoPerfil, d: FormData) => Promise<EstadoPerfil>;
  nome: string; email: string; temSenha: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="form-editor">
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}

      <div className="linha">
        <label>
          Nome
          <input name="nome" defaultValue={nome} required minLength={2} maxLength={120}
                 autoComplete="name" />
          <span className="dica">É o nome que aparece no painel e nas suas ações registradas.</span>
        </label>
        <label>
          E-mail
          <input name="email" type="email" defaultValue={email} required autoComplete="email" />
          <span className="dica">É com ele que você entra. Trocar exige a senha atual.</span>
        </label>
      </div>

      <div className="linha">
        <label>
          Senha atual
          <input name="senhaAtual" type="password" autoComplete="current-password" />
          <span className="dica">
            Só é obrigatória para mudar o e-mail ou a senha. Para corrigir o nome, deixe em branco.
          </span>
        </label>
        <label>
          Nova senha
          <input name="senhaNova" type="password" autoComplete="new-password" minLength={8} />
          <span className="dica">
            Em branco, a senha continua a mesma. Pelo menos 8 caracteres — frase curta funciona
            melhor que sigla.
          </span>
        </label>
      </div>

      <div className="acoes" style={{ display: 'grid', gap: 12 }}>
        {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
        {estado.ok && <p className="alerta alerta-ok">{estado.ok}</p>}
        <div className="acoes-linha">
          <button className="btn btn-primario" type="submit" disabled={pendente}>
            {pendente ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </div>
        <span className="dica">
          {temSenha
            ? 'Trocar a senha encerra as suas outras sessões abertas — este navegador continua conectado.'
            : 'Esta conta ainda não tem senha definida. Fale com o suporte antes de mudar o e-mail.'}
        </span>
      </div>
    </form>
  );
}

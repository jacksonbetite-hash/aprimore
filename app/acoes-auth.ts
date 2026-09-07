'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  autenticar, cadastrar, criarSessao, revogarSessao,
  validarEmail, validarSenha, COOKIE_SESSAO, DURACAO_SESSAO_DIAS,
} from '../lib/auth.ts';
import { portalIdAtual, portalAtual } from '../lib/portal-consultas.ts';
import { dominioAutorizado } from '../lib/empresa.ts';
import { autocadastrar } from '../lib/empresa-equipe.ts';
import { gerarHashSenha } from '../lib/auth.ts';
import { paginaInicial } from '../lib/navegacao.ts';
import { vincularIndicacao } from '../lib/portal-indicacao.ts';
import { COOKIE_INDICACAO } from '../lib/portal.ts';

/**
 * §5.10.1 — se este navegador chegou ao portal pelo nosso anúncio, o
 * token está no cookie; agora que existe um aluno, o vínculo fecha. O
 * cookie é apagado em seguida: já cumpriu o papel, e ficar ali só serviria
 * para tentar vincular de novo quem já está vinculado.
 */
async function vincularIndicacaoDoCookie(usuarioId: number) {
  const jar = await cookies();
  const token = jar.get(COOKIE_INDICACAO)?.value;
  if (!token) return;
  const portalId = await portalIdAtual();
  if (portalId !== 0) await vincularIndicacao(token, usuarioId, portalId);
  jar.delete(COOKIE_INDICACAO);
}

export interface EstadoForm { erro?: string; aviso?: string }

async function abrirSessao(usuarioId: number) {
  const { token, expiraEm } = await criarSessao(usuarioId);
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,                                  // JS da página não lê o cookie
    sameSite: 'lax',                                 // barra CSRF vindo de outro site
    secure: process.env.NODE_ENV === 'production',   // só HTTPS fora do dev
    path: '/',
    expires: expiraEm,
    maxAge: DURACAO_SESSAO_DIAS * 86_400,
  });
}

export async function entrar(_estado: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = String(dados.get('email') ?? '');
  const senha = String(dados.get('senha') ?? '');
  if (!email || !senha) return { erro: 'Preencha e-mail e senha.' };

  // §5.10: o login vale dentro do portal em que foi feito.
  const portalId = await portalIdAtual();
  const r = await autenticar(portalId, email, senha);
  if (!r.ok) {
    // Mensagem única de propósito: dizer "e-mail não existe" entrega
    // quais e-mails estão cadastrados a quem estiver sondando.
    return r.motivo === 'encerrada'
      ? { erro: 'Esta conta foi encerrada. Fale com o suporte.' }
      : { erro: 'E-mail ou senha não conferem.' };
  }

  await abrirSessao(r.usuarioId);
  await vincularIndicacaoDoCookie(r.usuarioId);
  // Reativar a conta é a única coisa a fazer antes de qualquer outra:
  // ela vence até o destino pedido.
  if (r.statusConta === 'BLOQUEADA_INATIVIDADE') redirect('/painel?reativar=1');
  redirect(paginaInicial(r.papel, portalId, String(dados.get('destino') ?? '')));
}

export async function criarConta(_estado: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const nome = String(dados.get('nome') ?? '').trim();
  const email = String(dados.get('email') ?? '').trim();
  const senha = String(dados.get('senha') ?? '');

  if (nome.length < 2) return { erro: 'Diga como podemos te chamar.' };
  const erroEmail = validarEmail(email);
  if (erroEmail) return { erro: erroEmail };
  const erroSenha = validarSenha(senha);
  if (erroSenha) return { erro: erroSenha };

  // §5.11 — num portal de empresa, cadastrar-se sozinho só vale para
  // quem tem e-mail de um domínio que o RH autorizou. A conferência é
  // aqui, no servidor: a tela de cadastro nem existe sem domínio, mas
  // uma tela escondida não é uma trava.
  const portal = await portalAtual();
  let id: number | null;
  if (portal.tipo === 'EMPRESA') {
    if (!dominioAutorizado(portal.dominiosEmail, email)) {
      return {
        erro: 'Este portal é fechado. Só cria conta sozinho quem tem e-mail da empresa — '
          + 'para os demais, quem administra o treinamento envia um convite.',
      };
    }
    try {
      id = await autocadastrar(portal.id, nome, email, await gerarHashSenha(senha));
    } catch (err) {
      return { erro: (err as Error).message };
    }
  } else {
    id = await cadastrar(portal.id, nome, email, senha);
  }
  if (id === null) {
    return { erro: 'Já existe uma conta com esse e-mail. Tente entrar.' };
  }

  await abrirSessao(id);
  await vincularIndicacaoDoCookie(id);
  redirect('/painel?bemvindo=1');
}

export async function sair() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await revogarSessao(token);
  jar.delete(COOKIE_SESSAO);
  redirect('/');
}

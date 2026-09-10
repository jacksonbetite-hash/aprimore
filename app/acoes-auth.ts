'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  autenticar, cadastrar, criarSessao, revogarSessao, vincularNoPortal,
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

/**
 * `lembrar` é o "continuar conectado neste dispositivo" da tela de login.
 *
 * Marcado (o padrão, e o que sempre valeu), o cookie leva validade e
 * sobrevive a fechar o navegador — 30 dias, como a sessão no banco.
 * Desmarcado, ele vira cookie de SESSÃO DO NAVEGADOR: fechou a janela,
 * saiu. A linha em `sessao` continua a mesma e continua revogável; o que
 * muda é só quanto tempo este computador guarda a chave, que é o que
 * importa no laboratório da faculdade e no computador do trabalho.
 */
async function abrirSessao(usuarioId: number, lembrar = true) {
  const { token, expiraEm } = await criarSessao(usuarioId);
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,                                  // JS da página não lê o cookie
    sameSite: 'lax',                                 // barra CSRF vindo de outro site
    secure: process.env.NODE_ENV === 'production',   // só HTTPS fora do dev
    path: '/',
    ...(lembrar ? { expires: expiraEm, maxAge: DURACAO_SESSAO_DIAS * 86_400 } : {}),
  });
}

export async function entrar(_estado: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = String(dados.get('email') ?? '');
  const senha = String(dados.get('senha') ?? '');
  if (!email || !senha) return { erro: 'Preencha e-mail e senha.' };

  // A senha é da conta (global); o perfil é deste portal (§5.10).
  const portal = await portalAtual();
  const r = await autenticar(portal.id, email, senha);
  if (!r.ok) {
    // Mensagem única de propósito: dizer "e-mail não existe" entrega
    // quais e-mails estão cadastrados a quem estiver sondando.
    return r.motivo === 'encerrada'
      ? { erro: 'Esta conta foi encerrada. Fale com o suporte.' }
      : { erro: 'E-mail ou senha não conferem.' };
  }

  let usuarioId: number;
  let papel: string;
  let statusConta: string;
  let recemVinculado = false;
  if (r.usuarioId === null) {
    // Senha certa, perfil nenhum AQUI. Na plataforma e no portal de um
    // professor o perfil nasce agora — é o "mesmo acesso nos três
    // ambientes" do pedido. No portal de uma empresa a porta é fechada:
    // só entra quem o RH cadastrou, ou quem tem e-mail do domínio que o
    // RH autorizou (e aí é o autocadastro de sempre, com teto e setor).
    if (portal.tipo === 'EMPRESA') {
      if (!dominioAutorizado(portal.dominiosEmail, email)) {
        return {
          erro: 'Sua senha está certa, mas este portal é fechado: o acesso é liberado por '
            + 'quem administra o treinamento na empresa. Fale com essa pessoa.',
        };
      }
      let id: number | null;
      try {
        id = await autocadastrar(portal.id, email, email, null);
      } catch (err) {
        return { erro: (err as Error).message };
      }
      if (id === null) return { erro: 'E-mail ou senha não conferem.' };
      usuarioId = id;
    } else {
      usuarioId = await vincularNoPortal(r.contaId, portal.id);
    }
    papel = 'aluno';
    statusConta = 'ATIVA';
    recemVinculado = true;
  } else {
    usuarioId = r.usuarioId;
    papel = r.papel;
    statusConta = r.statusConta;
  }

  await abrirSessao(usuarioId, dados.get('lembrar') !== null);
  await vincularIndicacaoDoCookie(usuarioId);
  // Reativar a conta é a única coisa a fazer antes de qualquer outra:
  // ela vence até o destino pedido.
  if (statusConta === 'BLOQUEADA_INATIVIDADE') redirect('/painel?reativar=1');
  if (recemVinculado) redirect('/painel?bemvindo=1');

  // A aba escolhida na tela de login vale como pedido de destino, e só
  // para MENOS: quem tem papel de operação e entrou por "sou aluno"
  // quer estudar, não operar, e ir parar em /admin ou /professor a cada
  // login é justamente o que a aba existe para evitar. O contrário não
  // vale — a aba não promove ninguém: só o papel gravado na conta abre
  // a retaguarda, aqui e nas guardas de cada rota.
  const escolhido = dados.get('papel_escolhido') === 'aluno' ? 'aluno' : papel;
  redirect(paginaInicial(escolhido, portal.id, String(dados.get('destino') ?? '')));
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
    // A credencial é uma por e-mail em TODOS os portais (db/045): quem
    // já tem conta entra com a mesma senha e o perfil daqui nasce na
    // primeira entrada. Acesso separado é outro e-mail — é a regra do
    // pedido, dita com todas as letras.
    return {
      erro: 'Esse e-mail já tem conta. Entre com a mesma senha para usar o mesmo acesso '
        + 'aqui — ou, se quiser um acesso separado, cadastre outro e-mail.',
    };
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

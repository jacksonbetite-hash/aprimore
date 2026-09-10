'use client';

import { startTransition, useActionState, useId, useState } from 'react';
import Link from 'next/link';
import { Icone } from './ui.tsx';
import type { EstadoForm } from './acoes-auth.ts';

type Acao = (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;

/**
 * Onde a tela de login está de pé. Não é enfeite: é o que decide quantas
 * portas ela mostra e para onde cada uma leva.
 *
 *   plataforma  o site principal. Aluno e professor têm conta AQUI, e a
 *               mesma caixa serve aos dois — quem separa o destino é o
 *               papel gravado na conta (lib/navegacao.ts).
 *   professor   o portal de um professor (§5.10). A base de alunos é a
 *               DELE; a conta com que ele opera o portal vive na
 *               plataforma. São duas portas em prédios diferentes.
 *   empresa     o portal de uma empresa (§5.11). Uma porta só, e sem
 *               cadastro: quem libera acesso é o RH.
 */
export type ContextoAuth = 'plataforma' | 'professor' | 'empresa';

type Papel = 'aluno' | 'professor' | 'empresa';

/**
 * O que muda quando a pessoa troca de aba. Fica numa tabela e não
 * espalhado em ternários pelo JSX: são quatro textos por papel, e um
 * deles fora de sincronia é exatamente o defeito que a tela não deixa
 * ver (o botão dizendo "meu painel" com o aviso dizendo "professor").
 *
 * A aba é só uma PORTA: a mesma senha entra em qualquer uma (a credencial
 * é uma por e-mail, db/045) e quem decide o destino é o papel gravado na
 * conta. Clicar em "sou aluno" rebaixa quem opera; nenhuma aba promove.
 */
const PAPEIS: Record<Papel, {
  aba: string; icone: string; descricao: string; destino: string; botao: string;
}> = {
  aluno: {
    aba: 'Sou aluno',
    icone: 'menu_book',
    descricao: 'Entre para continuar de onde parou: as aulas, os exercícios e o seu progresso. '
      + 'A mesma senha vale aqui, na página do seu professor e no portal da sua empresa.',
    destino: 'Minha jornada, o painel de estudos',
    botao: 'Entrar no meu painel',
  },
  professor: {
    aba: 'Sou professor',
    icone: 'dashboard',
    descricao: 'Entre para publicar aulas, acompanhar quem estuda com você e ver o que entrou de receita.',
    destino: 'Meu portal, o painel do professor',
    botao: 'Entrar na área do professor',
  },
  empresa: {
    aba: 'Sou empresa',
    icone: 'handshake',
    descricao: 'Entre para cadastrar a equipe, liberar trilhas e acompanhar quem concluiu — o painel do RH.',
    destino: 'O painel da empresa',
    botao: 'Entrar no painel da empresa',
  },
};

/** Que abas cada endereço mostra. A empresa (contexto) tem uma porta só. */
const ABAS_POR_CONTEXTO: Record<ContextoAuth, Papel[]> = {
  plataforma: ['aluno', 'professor', 'empresa'],
  professor: ['aluno', 'professor'],
  empresa: [],
};

interface PropsEntrar {
  acao: Acao;
  /** Para onde voltar depois de entrar; vazio deixa o papel decidir. */
  destino?: string;
  contexto: ContextoAuth;
  /** Nome do portal, para dizer de QUAL base de alunos esta porta é. */
  nomePortal?: string;
  /** Endereço do site principal — só usado dentro do portal de um professor. */
  enderecoPlataforma?: string;
  /** Veio do convite de uma empresa já tendo conta: a senha é a de sempre. */
  jaTemConta?: boolean;
}

export function FormEntrar(
  { acao, destino, contexto, nomePortal, enderecoPlataforma, jaTemConta }: PropsEntrar,
) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  /**
   * `null` = ninguém tocou nas abas ainda. A distinção importa: a aba do
   * aluno já vem aberta (é o caso de longe mais comum), mas isso é um
   * PADRÃO VISUAL, não uma escolha — e só escolha vale como pedido de
   * destino. Sem essa diferença, o administrador que entrasse sem clicar
   * em nada seria mandado para "Minha jornada" e teria de procurar a
   * retaguarda no menu, que é exatamente o defeito que `paginaInicial`
   * existe para consertar (lib/navegacao.ts).
   */
  const [escolha, setEscolha] = useState<Papel | null>(null);
  const papel: Papel = escolha ?? 'aluno';
  const [verSenha, setVerSenha] = useState(false);
  const [verAjudaSenha, setVerAjudaSenha] = useState(false);
  const painel = useId();
  const ajudaSenha = useId();

  // §5.11 — no portal de uma empresa não existe "outro papel" para
  // escolher: o gestor opera de fora, e oferecer a aba dele aqui levaria
  // o colaborador à marca do fornecedor, que o portal esconde de
  // propósito (ver o rodapé em app/componentes.tsx).
  const abas = ABAS_POR_CONTEXTO[contexto];
  const comAbas = abas.length > 0;
  // A porta do professor DENTRO do portal dele não é um formulário: é um
  // endereço. O painel dele fica no site principal — a senha é a mesma
  // (db/045), mas entrar AQUI abriria só o perfil de aluno deste portal.
  const portaDeFora = contexto === 'professor' && papel === 'professor';
  const copia = PAPEIS[papel];

  /**
   * `onSubmit` + `startTransition` em vez de `<form action={enviar}>`:
   * com `action`, o React 19 reseta o formulário ao fim de TODA ação,
   * inclusive quando ela devolve erro — quem errou a senha perdia
   * também o e-mail que tinha digitado.
   */
  function enviarSemLimpar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => enviar(dados));
  }

  return (
    <div className="auth-corpo">
      <p className="sub">
        {contexto === 'empresa'
          ? 'Entre com o e-mail que a sua empresa cadastrou. Se você já tem conta na '
            + 'plataforma com esse e-mail, a senha é a mesma.'
          : papel === 'aluno' && nomePortal
            ? `Entre para continuar de onde parou nas aulas de ${nomePortal}. Já tem conta na `
              + 'plataforma? Use a mesma senha — o seu acesso aqui nasce na primeira entrada.'
            : copia.descricao}
      </p>

      {jaTemConta && (
        <p className="alerta alerta-ok" role="status">
          <Icone nome="check_circle" tamanho={20} /> Você já tinha conta com esse e-mail, e o
          acesso a este portal foi liberado. Entre com a senha de sempre — a que você digitou no
          convite não substituiu a sua.
        </p>
      )}

      {comAbas && (
        <div className="seletor-papel" role="tablist" aria-label="Perfil de acesso"
             data-abas={abas.length}>
          {abas.map((chave) => (
            <button
              key={chave}
              type="button"
              role="tab"
              id={`aba-${chave}`}
              aria-selected={papel === chave}
              aria-controls={painel}
              className={papel === chave ? 'ativo' : undefined}
              onClick={() => setEscolha(chave)}
            >
              <Icone nome={PAPEIS[chave].icone} tamanho={18} />
              {PAPEIS[chave].aba}
            </button>
          ))}
        </div>
      )}

      <div id={painel} role={comAbas ? 'tabpanel' : undefined}
           aria-labelledby={comAbas ? `aba-${papel}` : undefined}>
        {portaDeFora ? (
          /* A porta de serviço. Sem formulário: campo que nunca vai
             autenticar aqui é armadilha, não conveniência. */
          <div className="porta-de-fora">
            <span className="selo"><Icone nome="shield_person" tamanho={24} /></span>
            <div>
              <strong>A sua conta de professor fica na plataforma</strong>
              <p>
                Este endereço é a porta dos seus alunos. Publicar aulas, acompanhar quem
                estuda e conferir o repasse é do outro lado — no painel do professor, com
                a conta que você usa na Aprimore o Saber.
              </p>
            </div>
            <a className="btn btn-primario btn-bloco"
               href={`${enderecoPlataforma ?? ''}/entrar?destino=%2Fprofessor`}>
              Ir para o painel do professor <Icone nome="open_in_new" tamanho={18} />
            </a>
          </div>
        ) : (
          <div className="auth-porta">
            <p className="pilula-destino">
              <Icone nome="check_circle" tamanho={18} />
              <span>Você vai entrar em: <strong>{contexto === 'empresa'
                ? 'Meu progresso, o painel do colaborador'
                : copia.destino}</strong></span>
            </p>

            <form className="formulario" onSubmit={enviarSemLimpar}>
              {/* Para onde voltar depois de entrar. Quando não vem nada, quem
                  decide é o papel do usuário (lib/navegacao.ts). */}
              {destino && <input type="hidden" name="destino" value={destino} />}
              {/* Só vai junto quando a aba foi CLICADA: quem entra pela
                  aba do aluno de propósito quer estudar, não operar —
                  mas quem não tocou em nada continua indo para o painel
                  do papel dele. */}
              {escolha && <input type="hidden" name="papel_escolhido" value={escolha} />}

              {estado.erro && (
                <p className="alerta alerta-erro" role="alert">
                  <Icone nome="error" tamanho={20} /> {estado.erro}
                </p>
              )}

              <label>
                <span className="campo-cabeca">
                  E-mail cadastrado
                  <span className="dica-campo">ex.: voce@exemplo.com</span>
                </span>
                <span className="campo-icone">
                  <Icone nome="mail" tamanho={20} />
                  <input name="email" type="email" autoComplete="email" required autoFocus
                         placeholder="seuemail@exemplo.com" />
                </span>
              </label>

              <label>
                <span className="campo-cabeca">
                  Senha de acesso
                  {/* Botão, e não link: não há para onde ir. A explicação
                      abre logo abaixo do campo — ver SenhaEsquecida. */}
                  <button type="button" className="link-senha"
                          aria-expanded={verAjudaSenha} aria-controls={ajudaSenha}
                          onClick={() => setVerAjudaSenha((v) => !v)}>
                    Esqueceu a senha?
                  </button>
                </span>
                <span className="campo-icone">
                  <Icone nome="lock" tamanho={20} />
                  <input name="senha" type={verSenha ? 'text' : 'password'}
                         autoComplete="current-password" required
                         placeholder="Digite sua senha" />
                  <button type="button" className="btn-olho"
                          aria-pressed={verSenha}
                          aria-label={verSenha ? 'Ocultar a senha' : 'Mostrar a senha'}
                          onClick={() => setVerSenha((v) => !v)}>
                    <Icone nome={verSenha ? 'visibility_off' : 'visibility'} tamanho={20} />
                  </button>
                </span>
              </label>
              {verAjudaSenha && (
                <SenhaEsquecida id={ajudaSenha} contexto={contexto} nomePortal={nomePortal} />
              )}

              {/* §6.5 — a sessão dura 30 dias. Desmarcado, o cookie passa a
                  ser de sessão do navegador: fechou, saiu. É o que faz
                  diferença em computador de faculdade e de trabalho. */}
              <label className="lembrar">
                <input type="checkbox" name="lembrar" value="1" defaultChecked />
                <span>Continuar conectado neste dispositivo</span>
              </label>

              <button className="btn btn-primario" type="submit" disabled={pendente}>
                {pendente ? 'Entrando…' : copia.botao}
                {!pendente && <Icone nome="arrow_forward" tamanho={18} />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* O convite "monte o seu portal" só existe no site principal
          (§5.10.2, etapa 3): dentro do portal de um professor ele seria
          concorrência na casa dele, e /para-professores nem responde ali. */}
      {contexto === 'empresa' ? (
        <p className="rodape-form">
          Sem acesso ainda? Quem libera é o setor responsável pelo treinamento na sua empresa.
        </p>
      ) : papel === 'aluno' ? (
        <p className="rodape-form">
          Ainda não tem conta? <Link href="/cadastrar">Criar conta grátis</Link>
        </p>
      ) : papel === 'empresa' ? (
        <p className="rodape-form">
          Sua empresa ainda não tem portal? <Link href="/empresas">Conheça os planos</Link>
        </p>
      ) : contexto === 'plataforma' ? (
        <p className="rodape-form">
          Quer ter o seu próprio portal? <Link href="/para-professores">Conheça os planos</Link>
        </p>
      ) : null}
      {/* A equipe da plataforma (admin, financeiro, suporte) não tem aba:
          entra por qualquer uma com a conta dela, e o papel decide o
          destino (lib/navegacao.ts). Dizer isso evita a procura. */}
      {contexto === 'plataforma' && (
        <p className="rodape-form caption suave">
          Equipe da plataforma? Entre com a sua conta por qualquer aba: o seu papel leva você
          à administração.
        </p>
      )}
    </div>
  );
}

/**
 * "Esqueceu a senha?" — respondido no lugar, sem levar a lugar nenhum.
 *
 * Não existe redefinição automática: ela depende do provedor de e-mail
 * transacional, que ainda é pendência do discovery (§ pendências, item
 * 22). Um "esqueceu a senha?" que abre formulário e não manda e-mail
 * nenhum é pior que dizer, aqui, quem repõe o acesso — e quem repõe muda
 * com o portal: na empresa é o RH, e nunca a plataforma (§5.11).
 */
function SenhaEsquecida(
  { id, contexto, nomePortal }: { id: string; contexto: ContextoAuth; nomePortal?: string },
) {
  return (
    <p className="aviso-senha" id={id}>
      {contexto === 'empresa' ? (
        <>
          Quem repõe o seu acesso {nomePortal ? `no portal da ${nomePortal}` : 'neste portal'} é
          o setor responsável pelo treinamento na sua empresa — o mesmo que cadastrou o
          seu e-mail. O contato está no rodapé desta página.
        </>
      ) : (
        <>
          Ainda não enviamos link de redefinição por e-mail. Escreva para o{' '}
          <Link href="/planos#legal">suporte da plataforma</Link> pelo e-mail da sua conta
          e devolvemos o acesso com uma senha provisória — a mesma senha vale em todos os
          portais em que você entra, porque a conta é uma só.
        </>
      )}
    </p>
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
      <p className="dica">
        Já tem conta em outro endereço nosso — na plataforma ou na página de um professor?
        Não crie outra: <Link href="/entrar">entre com a mesma senha</Link> e o seu acesso
        aqui nasce sozinho. Para um acesso separado, use outro e-mail.
      </p>
    </form>
  );
}

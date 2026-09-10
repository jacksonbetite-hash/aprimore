'use client';

import { startTransition, useActionState, useRef, useState } from 'react';
import { Icone } from '../../ui.tsx';
// Do módulo PURO, nunca de `acervo.ts`: este é componente de cliente, e
// o outro traz o driver do Postgres junto para o bundle do navegador.
import { juntarAssuntos, tamanhoLegivel, type ItemAcervo } from '../../../lib/acervo-item.ts';
import type { EstadoAdmin } from '../../admin/acoes.ts';
import type { Setor } from '../../../lib/empresa-equipe.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

const aoEnviar = (enviar: (d: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  /* §5.11 e a lição do FormEmpresa: com `<form action>`, o React limpa
     os campos ao fim de toda ação — inclusive no erro de validação. Um
     item do acervo tem dez campos; perdê-los porque faltou o link é o
     tipo de coisa que faz o RH desistir da tela. */
  e.preventDefault();
  const dados = new FormData(e.currentTarget);
  startTransition(() => enviar(dados));
};

interface Enviado { id: string; bytes: number }

/**
 * A ficha de um item da Biblioteca da empresa.
 *
 * O arquivo sobe ANTES de salvar, pela rota de upload, e o que fica no
 * formulário é o nome dele no volume — em campo escondido. É o mesmo
 * caminho do vídeo da aula (`app/professor/Enviar.tsx`) e pela mesma
 * razão: o corpo da requisição de upload é o arquivo cru, em stream, e
 * não cabe num `FormData` de ação de servidor.
 *
 * XMLHttpRequest, e não fetch, também pelo mesmo motivo de lá: só ele dá
 * o progresso de upload. Um livro escaneado tem dezenas de megabytes, e
 * "enviando…" sem número é o que faz fechar a aba no meio.
 */
export default function FormAcervo(
  { acao, setores, item }: { acao: Acao; setores: Setor[]; item?: ItemAcervo },
) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [formato, setFormato] = useState<'PDF' | 'LINK'>(item?.formato ?? 'PDF');

  /* O que o envio devolveu nesta sessão de edição. `null` significa
     "não mexi no arquivo": na edição, a ação mantém o que já estava. */
  const [arquivo, setArquivo] = useState<Enviado | null>(null);
  const [capa, setCapa] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ o_que: string; pct: number } | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  function subir(qual: 'documento' | 'capa', file: File) {
    setErroEnvio(null);
    setProgresso({ o_que: qual === 'capa' ? 'capa' : 'arquivo', pct: 0 });
    const xhr = new XMLHttpRequest();
    const params = new URLSearchParams(
      qual === 'capa'
        // `uso=acervo`: sem isto, o envio trocaria a FOTO DE APRESENTAÇÃO
        // do portal — a rota de imagem faz isso por padrão.
        ? { tipo: 'imagem', uso: 'acervo', nome: file.name }
        : { tipo: 'documento', nome: file.name },
    );
    xhr.open('POST', `/api/upload?${params}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgresso({ o_que: qual === 'capa' ? 'capa' : 'arquivo', pct: Math.round((e.loaded / e.total) * 100) });
      }
    };
    xhr.onload = () => {
      setProgresso(null);
      let corpo: { erro?: string; id?: string; bytes?: number } = {};
      try { corpo = JSON.parse(xhr.responseText); } catch { /* resposta sem JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && corpo.id) {
        if (qual === 'capa') setCapa(corpo.id);
        else setArquivo({ id: corpo.id, bytes: corpo.bytes ?? 0 });
      } else {
        setErroEnvio(corpo.erro ?? `Falha no envio (${xhr.status}).`);
      }
    };
    xhr.onerror = () => { setProgresso(null); setErroEnvio('Falha de rede no envio.'); };
    xhr.send(file);
  }

  const arquivoAtual = arquivo?.id ?? item?.arquivo ?? null;

  return (
    <form ref={form} onSubmit={aoEnviar(enviar)} className="form-editor">
      {item && <input type="hidden" name="id" value={item.id} />}
      {/* Vazio na edição sem troca = "mantenha o arquivo que já está lá". */}
      <input type="hidden" name="arquivo" value={arquivo?.id ?? ''} />
      <input type="hidden" name="bytes" value={arquivo?.bytes ?? ''} />
      <input type="hidden" name="capa" value={capa ?? ''} />

      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p className="alerta alerta-ok" role="status">
          <Icone nome="check_circle" tamanho={20} /> {estado.ok}
        </p>
      )}
      {erroEnvio && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {erroEnvio}
        </p>
      )}

      <div className="linha">
        <label>
          Título
          <input name="titulo" required maxLength={300} defaultValue={item?.titulo}
                 placeholder="Guia prático de LGPD para equipes" />
        </label>
        <label>
          Autor
          <input name="autor" maxLength={200} defaultValue={item?.autor ?? ''}
                 placeholder="quem escreveu" />
          <span className="dica">Vira filtro na estante da equipe.</span>
        </label>
      </div>

      <label>
        Assuntos
        <input name="assuntos" defaultValue={juntarAssuntos(item?.assuntos ?? [])}
               placeholder="LGPD, Compliance, Liderança" />
        <span className="dica">
          Separados por vírgula. São as etiquetas por onde a equipe filtra — repetir a mesma
          palavra em itens diferentes é o que agrupa a estante.
        </span>
      </label>

      <label>
        Descrição
        <textarea name="descricao" rows={3} defaultValue={item?.descricao ?? ''}
                  placeholder="Do que trata, e para quem serve." />
      </label>

      <fieldset className="campo-grupo">
        <legend>De onde vem o conteúdo</legend>
        <div className="opcoes-linha">
          <label className="opcao">
            <input type="radio" name="formato" value="PDF" checked={formato === 'PDF'}
                   onChange={() => setFormato('PDF')} />
            <span><Icone nome="picture_as_pdf" tamanho={20} /> Arquivo PDF</span>
          </label>
          <label className="opcao">
            <input type="radio" name="formato" value="LINK" checked={formato === 'LINK'}
                   onChange={() => setFormato('LINK')} />
            <span><Icone nome="link" tamanho={20} /> Link</span>
          </label>
        </div>

        {formato === 'PDF' ? (
          <label>
            {arquivoAtual ? 'Trocar o arquivo' : 'Arquivo PDF'}
            <input type="file" accept="application/pdf" disabled={progresso !== null}
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) subir('documento', f); }} />
            <span className="dica">
              Só PDF: é o que o navegador abre sozinho, sem a equipe precisar instalar nada.
              {arquivoAtual && (
                <> Atual: <strong>{arquivoAtual}</strong>
                  {tamanhoLegivel(arquivo?.bytes ?? item?.bytes) && ` (${tamanhoLegivel(arquivo?.bytes ?? item?.bytes)})`}.
                  Deixe em branco para manter.
                </>
              )}
            </span>
          </label>
        ) : (
          <label>
            Endereço
            <input name="url" type="url" defaultValue={item?.url ?? ''}
                   placeholder="https://intranet.suaempresa.com.br/politica" />
            <span className="dica">
              Para conteúdo que a empresa já hospeda. Precisa começar com http:// ou https://.
            </span>
          </label>
        )}
      </fieldset>

      <div className="linha estreita">
        <label>
          Setor
          <select name="setorId" defaultValue={item?.setorId ?? ''}>
            <option value="">toda a empresa</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <span className="dica">Item de setor só aparece para quem é dele.</span>
        </label>
        <label>
          Ano
          <input name="ano" type="number" inputMode="numeric" min={1400} max={2200}
                 defaultValue={item?.ano ?? ''} placeholder="2024" />
        </label>
        <label>
          Editora
          <input name="editora" maxLength={120} defaultValue={item?.editora ?? ''} />
        </label>
      </div>

      <label>
        Capa (opcional)
        <input type="file" accept="image/*" disabled={progresso !== null}
               onChange={(e) => { const f = e.target.files?.[0]; if (f) subir('capa', f); }} />
        <span className="dica">
          Sem capa, o cartão da estante usa o desenho do assunto — nenhuma tela espera
          imagem para funcionar.
          {(capa ?? item?.capa) && <> Atual: <strong>{capa ?? item?.capa}</strong>.</>}
        </span>
      </label>

      {progresso && (
        <div>
          <div className="rotulo-progresso">
            <span>Enviando {progresso.o_que}…</span><b>{progresso.pct}%</b>
          </div>
          <div className="progresso"><i style={{ width: `${progresso.pct}%` }} /></div>
        </div>
      )}

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente || progresso !== null}>
          {pendente ? 'Salvando…' : item ? 'Salvar item' : 'Criar item'}
        </button>
      </div>
    </form>
  );
}

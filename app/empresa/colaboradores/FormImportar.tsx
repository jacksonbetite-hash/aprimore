'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoEquipe } from '../acoes.ts';
import type { MateriaAdmin } from '../../../lib/admin-cursos.ts';

/**
 * Importação em lote: cada linha vira um convite por link. A prévia de
 * erros é linha a linha, com o número da linha — quem colou 80 pessoas
 * precisa saber QUAL delas ficou de fora, não que "houve erros".
 */
export default function FormImportar({ acao, trilhas }: {
  acao: (e: EstadoEquipe, d: FormData) => Promise<EstadoEquipe>;
  trilhas: MateriaAdmin[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoEquipe);
  const submeter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };
  const linhas = estado.linhas ?? [];
  const comErro = linhas.filter((l) => l.erro);
  const criadas = linhas.filter((l) => l.token);

  return (
    <form onSubmit={submeter} className="form-editor">
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}

      <label>
        Uma pessoa por linha
        <textarea name="csv" rows={6} required
          placeholder={'nome;e-mail;setor\nAna Lima;ana.lima@acme.com.br;Vendas\nBruno Sá;bruno.sa@acme.com.br;Logística'} />
        <span className="dica">
          Separador ponto e vírgula, vírgula ou tabulação — dá para colar direto de uma
          planilha. A linha de cabeçalho é ignorada. O setor tem de existir com o mesmo nome.
        </span>
      </label>
      <div className="linha estreita">
        <label>
          Prazo para concluir (dias)
          <input name="prazoDias" type="number" min={1} placeholder="sem prazo" />
        </label>
      </div>
      {trilhas.length > 0 && (
        <fieldset style={{ border: '1px solid var(--surface-variant)', borderRadius: 12, padding: 14 }}>
          <legend className="caption suave">Trilhas liberadas para todo mundo desta importação</legend>
          <div style={{ display: 'grid', gap: 6 }}>
            {trilhas.map((t) => (
              <label className="marcador" key={t.id} style={{ margin: 0 }}>
                <input type="checkbox" name="trilhas" value={t.id} /> {t.nome}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Importando…' : 'Importar e gerar convites'}
        </button>
      </div>

      {linhas.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {comErro.length > 0 && (
            <>
              <h3 className="label-md" style={{ marginBottom: 8 }}>Linhas que ficaram de fora</h3>
              <table className="tabela">
                <thead><tr><th>Linha</th><th>Conteúdo</th><th>Problema</th></tr></thead>
                <tbody>
                  {comErro.map((l) => (
                    <tr key={l.linha}>
                      <td className="apertado">{l.linha}</td>
                      <td>{l.nome} · {l.email}{l.setor && ` · ${l.setor}`}</td>
                      <td style={{ color: 'var(--error)' }}>{l.erro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {criadas.length > 0 && (
            <>
              <h3 className="label-md" style={{ margin: '16px 0 8px' }}>
                Links criados — copie agora, eles não são mostrados de novo
              </h3>
              <table className="tabela">
                <thead><tr><th>Pessoa</th><th>Link do convite</th></tr></thead>
                <tbody>
                  {criadas.map((l) => (
                    <tr key={l.linha}>
                      <td>{l.nome}<br /><span className="suave">{l.email}</span></td>
                      <td><code style={{ wordBreak: 'break-all' }}>{estado.endereco}/convite/{l.token}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-contorno btn-sm" type="button" style={{ marginTop: 10 }}
                onClick={() => {
                  const texto = criadas.map((l) => `${l.nome};${l.email};${estado.endereco}/convite/${l.token}`).join('\n');
                  navigator.clipboard?.writeText(texto).catch(() => {});
                }}>
                <Icone nome="content_copy" tamanho={18} /> Copiar todos (nome;e-mail;link)
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}

'use client';

import { startTransition, useActionState, useState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';
import type { PaginaEmpresa, SecaoPagina } from '../../../lib/portal.ts';
import {
  SECOES, ROTULO_SECAO, ICONES_PILAR, LIMITES, type PaginaResolvida,
} from '../../../lib/pagina-empresa.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

/**
 * A página pública da universidade, seção a seção — o que o RH (ou o
 * administrador, como padrão de todo mundo) preenche.
 *
 * `valores` é o que está gravado; `padrao` é o que a página mostra quando
 * o campo está vazio, e vai no placeholder: o RH vê o texto que vai sair
 * se não escrever nada, e escreve só onde quer outra coisa. Apagar um
 * campo volta ao padrão — não deixa buraco.
 *
 * `modo`: 'empresa' tem fotos, links legais e as chaves de seção;
 * 'admin' edita só os textos de fábrica (as chaves do admin valem como
 * padrão para as empresas, então também entram).
 *
 * onSubmit + startTransition, e não `<form action>`: com `action` o React
 * limpa os campos ao fim de cada envio, inclusive no erro.
 */
export default function FormSecoesPagina({ acao, valores, padrao, modo }: {
  acao: Acao; valores: PaginaEmpresa; padrao: PaginaResolvida; modo: 'empresa' | 'admin';
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [fotoAbertura, setFotoAbertura] = useState(valores.fotoAbertura ?? '');
  const [fotoCelular, setFotoCelular] = useState(valores.fotoCelular ?? '');

  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  const secoesVisiveis: readonly SecaoPagina[] = SECOES;

  return (
    <form onSubmit={aoEnviar} className="form-editor">
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>
      )}
      {estado.ok && (
        <p className="alerta alerta-ok" role="status"><Icone nome="check_circle" tamanho={20} /> {estado.ok}</p>
      )}

      {/* ---- Abertura ---- */}
      <fieldset className="campo-grupo">
        <legend>Abertura</legend>
        <label>
          Título
          <input name="titulo" maxLength={LIMITES.titulo} defaultValue={valores.titulo ?? ''}
                 placeholder={padrao.titulo} />
          <span className="dica">
            O trecho entre asteriscos sai na cor do portal: <code>*aprendizado e evolução*</code>.
          </span>
        </label>
        <label>
          Parágrafo
          <textarea name="subtitulo" rows={3} maxLength={LIMITES.subtitulo}
                    defaultValue={valores.subtitulo ?? ''} placeholder={padrao.subtitulo} />
        </label>
        <div className="linha estreita">
          {[0, 1, 2].map((i) => (
            <label key={i}>
              Prova {i + 1}
              <input name={`prova${i}`} maxLength={LIMITES.prova}
                     defaultValue={valores.provas?.[i] ?? ''} placeholder={padrao.provas[i]} />
            </label>
          ))}
        </div>
        <label>
          Frase sobre a foto
          <input name="citacao" maxLength={LIMITES.citacao} defaultValue={valores.citacao ?? ''}
                 placeholder={padrao.citacao} />
        </label>
        {modo === 'empresa' && (
          <div className="linha">
            <CampoFoto nome="fotoAbertura" rotulo="Foto da abertura (16:9)" valor={fotoAbertura} aoMudar={setFotoAbertura}
                       dica="Sem foto própria, a página usa a imagem ilustrativa da plataforma, com o selo. A foto da sua equipe tira o selo — e a cessão de uso de imagem das pessoas é responsabilidade da empresa (LGPD)." />
            <CampoFoto nome="fotoCelular" rotulo="Foto do celular (9:16)" valor={fotoCelular} aoMudar={setFotoCelular}
                       dica="Uma captura do aplicativo no tema da sua empresa. Em branco, fica a tela ilustrativa." />
          </div>
        )}
      </fieldset>

      {/* ---- Pilares ---- */}
      <fieldset className="campo-grupo">
        <legend>Nosso compromisso — os quatro pilares</legend>
        <p className="dica">Cada pilar vale inteiro: preencha título e texto, ou deixe os dois em branco para usar o padrão.</p>
        {[0, 1, 2, 3].map((i) => {
          const v = valores.pilares?.[i]; const d = padrao.pilares[i];
          return (
            <div className="linha" key={i} style={{ gridTemplateColumns: '150px 1fr 2fr' }}>
              <label>
                Ícone
                <select name={`pilarIcone${i}`} defaultValue={v?.icone ?? ''}>
                  <option value="">padrão</option>
                  {ICONES_PILAR.map((ic) => <option key={ic.nome} value={ic.nome}>{ic.rotulo}</option>)}
                </select>
              </label>
              <label>
                Título {i + 1}
                <input name={`pilarTitulo${i}`} maxLength={LIMITES.pilarTitulo} defaultValue={v?.titulo ?? ''} placeholder={d.titulo} />
              </label>
              <label>
                Texto {i + 1}
                <textarea name={`pilarTexto${i}`} rows={2} maxLength={LIMITES.pilarTexto} defaultValue={v?.texto ?? ''} placeholder={d.texto} />
              </label>
            </div>
          );
        })}
      </fieldset>

      {/* ---- Contato da plataforma ---- */}
      <fieldset className="campo-grupo">
        <legend>Bloco "Falar com um especialista" (o formulário de demonstração da plataforma)</legend>
        <div className="linha">
          <label>
            Título
            <input name="contatoTitulo" maxLength={LIMITES.contatoTitulo} defaultValue={valores.contatoTitulo ?? ''} placeholder={padrao.contatoTitulo} />
          </label>
          <label>
            E-mail mostrado
            <input name="contatoEmail" type="email" maxLength={LIMITES.contatoEmail} defaultValue={valores.contatoEmail ?? ''} placeholder={padrao.contatoEmail} />
          </label>
        </div>
        <label>
          Texto
          <textarea name="contatoTexto" rows={2} maxLength={LIMITES.contatoTexto} defaultValue={valores.contatoTexto ?? ''} placeholder={padrao.contatoTexto} />
        </label>
      </fieldset>

      {/* ---- Rodapé ---- */}
      <fieldset className="campo-grupo">
        <legend>Rodapé</legend>
        <label>
          Descrição sob a marca
          <textarea name="rodapeDescricao" rows={2} maxLength={LIMITES.rodapeDescricao} defaultValue={valores.rodapeDescricao ?? ''} placeholder={padrao.rodapeDescricao} />
        </label>
        {modo === 'empresa' && (
          <div className="linha">
            <label>
              Link dos termos de uso
              <input name="linkTermos" type="url" maxLength={LIMITES.url} defaultValue={valores.links?.termos ?? ''} placeholder="https://suaempresa.com.br/termos" />
              <span className="dica">Da sua empresa — ela é a controladora dos dados. Em branco, o link não aparece.</span>
            </label>
            <label>
              Link da política de privacidade
              <input name="linkPrivacidade" type="url" maxLength={LIMITES.url} defaultValue={valores.links?.privacidade ?? ''} placeholder="https://suaempresa.com.br/privacidade" />
            </label>
          </div>
        )}
      </fieldset>

      {/* ---- Chaves ---- */}
      <fieldset className="campo-grupo">
        <legend>O que aparece na página</legend>
        <input type="hidden" name="secoesConhecidas" value={secoesVisiveis.join(',')} />
        <div style={{ display: 'grid', gap: 6 }}>
          {secoesVisiveis.map((s) => (
            <label className="marcador" key={s} style={{ margin: 0, paddingTop: 0 }}>
              <input type="checkbox" name={`secao_${s}`} defaultChecked={valores.secoes?.[s] ?? padrao.secoes[s]} />
              {ROTULO_SECAO[s]}
            </label>
          ))}
          <label className="marcador" style={{ margin: 0, paddingTop: 8 }}>
            <input type="checkbox" name="mostrarNumeros" defaultChecked={valores.mostrarNumeros ?? padrao.mostrarNumeros} />
            Mostrar os números reais (colaboradores ativos, documentos na biblioteca)
          </label>
          <label className="marcador" style={{ margin: 0, paddingTop: 0 }}>
            <input type="checkbox" name="assinatura" defaultChecked={valores.assinatura ?? padrao.assinatura} />
            Mostrar "por Aprimore o Saber" sob o nome, no topo e no rodapé
          </label>
        </div>
        {modo === 'empresa' && (
          <p className="dica">
            Desligar os dois blocos de contato deixa o botão principal como "Entrar na universidade".
          </p>
        )}
      </fieldset>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : modo === 'admin' ? 'Salvar padrão da plataforma' : 'Salvar página pública'}
        </button>
      </div>
    </form>
  );
}

/**
 * Envio de uma foto da página. `uso=acervo` na rota de upload: sem isso,
 * o envio trocaria a LOGO do portal, que é o destino padrão de imagem.
 * O que vai ao formulário é o endereço que a rota devolveu — e só ele
 * passa na validação do servidor (`fotoValida`).
 */
function CampoFoto({ nome, rotulo, valor, aoMudar, dica }: {
  nome: string; rotulo: string; valor: string; aoMudar: (v: string) => void; dica: string;
}) {
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function subir(file: File) {
    setErro(null); setProgresso(0);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/upload?${new URLSearchParams({ tipo: 'imagem', uso: 'acervo', nome: file.name })}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgresso(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setProgresso(null);
      let corpo: { erro?: string; id?: string } = {};
      try { corpo = JSON.parse(xhr.responseText); } catch { /* sem JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && corpo.id) aoMudar(`/api/imagem/${corpo.id}`);
      else setErro(corpo.erro ?? `Falha no envio (${xhr.status}).`);
    };
    xhr.onerror = () => { setProgresso(null); setErro('Falha de rede no envio.'); };
    xhr.send(file);
  }

  return (
    <div>
      <label>
        {rotulo}
        <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
               onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
      </label>
      <input type="hidden" name={nome} value={valor} />
      {progresso !== null && <span className="dica">Enviando… {progresso}%</span>}
      {erro && <span className="dica" style={{ color: 'var(--error)' }}>{erro}</span>}
      {valor && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <img src={valor} alt="" width={96} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
          <button type="button" className="btn btn-contorno btn-sm" onClick={() => aoMudar('')}>
            Voltar à imagem padrão
          </button>
        </div>
      )}
      <span className="dica">{dica}</span>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icone } from '../ui.tsx';

/**
 * Envio de arquivo pelo painel do professor, com barra de progresso.
 *
 * XMLHttpRequest, e não fetch, por um único motivo: só ele expõe o
 * progresso de UPLOAD. Um vídeo de aula tem centenas de megabytes, e
 * "enviando…" sem número por dez minutos é o que faz o professor fechar
 * a aba no meio e reclamar que "não funciona".
 */
export default function Enviar({
  tipo, aulaId, materiaId, rotulo, aceita, dica,
}: {
  tipo: 'video' | 'imagem'; aulaId?: number;
  /**
   * Quando presente, a imagem é a CAPA deste curso — e não a foto de
   * apresentação do portal, que é o destino padrão de `tipo=imagem`.
   * Sem isto, enviar a capa de um curso trocaria a foto da página
   * inteira do professor, sem aviso nenhum.
   */
  materiaId?: number;
  rotulo: string; aceita: string; dica?: string;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{ ok?: string; erro?: string }>({});

  function enviar(arquivo: File) {
    setMensagem({});
    setProgresso(0);
    const xhr = new XMLHttpRequest();
    const params = new URLSearchParams({ tipo, nome: arquivo.name });
    if (aulaId) params.set('aulaId', String(aulaId));
    if (materiaId) { params.set('uso', 'capa'); params.set('materiaId', String(materiaId)); }
    xhr.open('POST', `/api/upload?${params}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgresso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgresso(null);
      let corpo: { erro?: string; id?: string } = {};
      try { corpo = JSON.parse(xhr.responseText); } catch { /* resposta sem JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        setMensagem({
          ok: tipo === 'video' ? 'Vídeo enviado e vinculado à aula.'
            : materiaId ? 'Capa enviada. Ela já é a imagem deste curso na vitrine.'
              : 'Foto enviada.',
        });
        router.refresh();
      } else {
        setMensagem({ erro: corpo.erro ?? `Falha no envio (${xhr.status}).` });
      }
    };
    xhr.onerror = () => { setProgresso(null); setMensagem({ erro: 'Falha de rede no envio.' }); };
    xhr.send(arquivo);
  }

  return (
    <div className="pilha-sm">
      {mensagem.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {mensagem.erro}</p>}
      {mensagem.ok && <p className="alerta alerta-ok" role="status">{mensagem.ok}</p>}
      <label>
        {rotulo}
        <input ref={entrada} type="file" accept={aceita} disabled={progresso !== null}
               onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); }} />
        {dica && <span className="dica">{dica}</span>}
      </label>
      {progresso !== null && (
        <div aria-live="polite">
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-variant)', overflow: 'hidden' }}>
            <div style={{ width: `${progresso}%`, height: '100%', background: 'var(--primary)', transition: 'width .2s' }} />
          </div>
          <span className="caption suave">Enviando… {progresso}%</span>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Icone } from '../../ui.tsx';
import { certificadoPorCodigo } from '../../../lib/avaliacao.ts';
import { formatarCnpj } from '../../../lib/portal.ts';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ codigo: string }> },
): Promise<Metadata> {
  const { codigo } = await params;
  const c = await certificadoPorCodigo(codigo);
  return {
    title: c ? `Certificado ${c.codigo} — ${c.nome}` : 'Certificado não encontrado',
    // Certificado é documento de conferência, não conteúdo de busca: o
    // nome de quem concluiu não vai para o índice do Google.
    robots: { index: false, follow: false },
  };
}

const DATA = (d: Date) => new Date(d).toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric',
});

/**
 * O certificado verificável — §5.11, etapa 5, e §12.6.
 *
 * Página pública de propósito: é assim que o RH de outra empresa, ou um
 * auditor, confere o papel que a pessoa apresentou. Por isso não há
 * sessão aqui e o código é único no sistema inteiro — o verificador não
 * sabe de que empresa é o código antes de consultá-lo.
 *
 * Imprimível pelo navegador (Ctrl+P → salvar em PDF): não há biblioteca
 * de PDF no servidor, e não precisa haver.
 */
export default async function PaginaCertificado(
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  const c = await certificadoPorCodigo(codigo);
  if (!c) notFound();

  const horas = Math.floor(c.cargaHorariaMin / 60);
  const minutos = c.cargaHorariaMin % 60;
  const carga = horas > 0
    ? `${horas} hora${horas === 1 ? '' : 's'}${minutos ? ` e ${minutos} min` : ''}`
    : `${minutos} minutos`;

  return (
    <main className="certificado-pagina">
      <style>{`
        .certificado-pagina { background: var(--surface-container); min-height: 100vh; padding: 40px 20px; }
        .certificado {
          max-width: 900px; margin: 0 auto; background: var(--surface); color: var(--on-surface);
          border-radius: var(--r-lg); padding: 56px 64px; box-shadow: var(--e-marca);
          border: 8px double var(--primary);
        }
        .certificado h1 { font-size: 34px; line-height: 1.2; margin: 24px 0 8px; }
        .certificado .selo { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; }
        .certificado .nome {
          font-family: var(--font-display); font-size: 40px; font-weight: 800;
          margin: 28px 0 8px; color: var(--primary-texto);
        }
        .certificado .trilha { font-size: 22px; font-weight: 700; margin: 18px 0 6px; }
        .certificado .dados { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 32px; }
        .certificado .dados div { min-width: 140px; }
        .certificado .rodape {
          margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--surface-variant);
          font-size: 13px; line-height: 1.7;
        }
        .certificado .codigo {
          font-family: ui-monospace, monospace; font-size: 20px; font-weight: 700;
          letter-spacing: 2px;
        }
        .acoes-certificado { max-width: 900px; margin: 0 auto 20px; display: flex; gap: 12px; }
        @media print {
          .certificado-pagina { background: #fff; padding: 0; }
          .acoes-certificado { display: none !important; }
          .certificado { box-shadow: none; border-radius: 0; max-width: none; }
        }
      `}</style>

      <div className="acoes-certificado">
        <a className="btn btn-contorno btn-sm" href="/">← Início</a>
      </div>

      <article className="certificado">
        <div className="selo">
          {c.empresaFoto
            ? <img src={c.empresaFoto} alt="" width={56} height={56} style={{ borderRadius: 12, objectFit: 'cover' }} />
            : <Icone nome="workspace_premium" tamanho={40} />}
          <div>
            <strong style={{ fontSize: 18 }}>{c.empresaNome}</strong>
            <div className="caption suave">Certificado de conclusão · curso livre</div>
          </div>
        </div>

        <h1>Certificado de conclusão</h1>
        <p className="suave">Certificamos que</p>
        <div className="nome">{c.nome}</div>
        <p className="suave">concluiu a trilha de treinamento</p>
        <div className="trilha">{c.trilha}</div>

        <div className="dados">
          <div>
            <span className="label-md suave">CONCLUSÃO</span>
            <div><strong>{DATA(c.concluidaEm)}</strong></div>
          </div>
          <div>
            <span className="label-md suave">CARGA HORÁRIA</span>
            <div><strong>{carga}</strong></div>
          </div>
          {c.nota !== null && (
            <div>
              <span className="label-md suave">APROVEITAMENTO</span>
              <div><strong>{c.nota}%</strong></div>
            </div>
          )}
          <div>
            <span className="label-md suave">CÓDIGO DE VERIFICAÇÃO</span>
            <div className="codigo">{c.codigo}</div>
          </div>
        </div>

        <div className="rodape suave">
          <strong>Emitido por {c.responsavelNome ?? c.empresaNome}</strong>
          {c.responsavelDoc && <> · CNPJ {formatarCnpj(c.responsavelDoc)}</>}.<br />
          Certificado de <strong>curso livre</strong>, para registro interno e comprovação de
          treinamento. A plataforma Aprimore o Saber hospeda e opera o portal; não é
          instituição de ensino credenciada pelo MEC e não emite certificado de curso
          reconhecido.<br />
          Confira a autenticidade em <strong>/certificado/{c.codigo}</strong> — quem tem o
          código confirma nome, trilha, data e carga horária.
        </div>
      </article>
    </main>
  );
}

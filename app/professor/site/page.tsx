import type { Metadata } from 'next';
import { FormSite } from '../../admin/portais/Formularios.tsx';
import Enviar from '../Enviar.tsx';
import FormDominio from './FormDominio.tsx';
import { acaoSalvarSite, acaoDefinirDominio, acaoVerificarDominio } from '../acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../lib/professor.ts';
import { situacaoDominio } from '../../../lib/portal-dominio.ts';
import { enderecoDoPortal } from '../../../lib/portal-consultas.ts';
import { brl } from '../../../lib/precos.ts';

export const metadata: Metadata = { title: 'Minha página — Painel do professor' };

export default async function MinhaPagina() {
  const u = (await alunoAtual())!;
  const portal = (await portalDoProfessor(u.id))!;
  const dominio = await situacaoDominio(portal.id);
  const endereco = await enderecoDoPortal(portal.mascara);
  const visivel = endereco.replace(/^https?:\/\//, '');
  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Minha página</h1>
          <p className="suave">
            O que aparece em <a href={endereco} target="_blank" rel="noreferrer"><code>{visivel}</code></a>:
            abertura, propósito, quem ensina, contato e cor. O acervo e a oferta entram sozinhos.
          </p>
        </div>
        <div className="acoes">
          <a className="btn btn-contorno" href={endereco} target="_blank" rel="noreferrer">Ver minha página</a>
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Foto de apresentação</h2>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {portal.personalizacao.foto ? (
            <img src={portal.personalizacao.foto} alt="Foto atual" width={120} height={120}
                 style={{ borderRadius: 16, objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 120, height: 120, borderRadius: 16, display: 'grid', placeItems: 'center',
              background: 'var(--surface-container)', color: 'var(--on-surface-variant)',
              fontSize: 13, textAlign: 'center', padding: 8,
            }}>
              sem foto
            </div>
          )}
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* O caminho do arquivo não é mais campo de formulário: quem o
                grava é o próprio envio (app/api/upload). Mostrar o caminho
                para o professor digitar só dava chance de apagá-lo sem
                querer ao salvar a página. */}
            <Enviar tipo="imagem" rotulo="Enviar foto" aceita="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    dica="JPG, PNG ou WebP, até 5 MB. Quadrada (proporção 1:1) — a página exibe 220 × 220 px, então use pelo menos 400 × 400 px; 600 × 600 px é o ideal. Enviar outra substitui a atual." />
            {portal.personalizacao.foto && (
              <p className="caption suave" style={{ marginTop: 10 }}>
                A foto atual já está publicada na abertura da sua página.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <FormSite acao={acaoSalvarSite} portalId={portal.id} personalizacao={portal.personalizacao}
                  campoFoto={false} />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Domínio próprio</h2>
        {dominio.centavosMes === null ? (
          <p className="suave">
            Seu plano não inclui domínio próprio. O portal continua em{' '}
            <code>{visivel}</code>.
          </p>
        ) : (
          <>
            <p className="suave" style={{ marginBottom: 16 }}>
              Além de <code>{visivel}</code>, o portal pode responder no seu
              endereço — <code>cursos.seudominio.com.br</code>, por exemplo.
            </p>
            <FormDominio
              acaoDefinir={acaoDefinirDominio} acaoVerificar={acaoVerificarDominio}
              dominio={dominio.dominio} esperado={dominio.esperado}
              verificadoEm={dominio.verificadoEm ? dominio.verificadoEm.toLocaleDateString('pt-BR') : null}
              precoMes={brl(dominio.centavosMes)} />
          </>
        )}
      </div>
    </>
  );
}

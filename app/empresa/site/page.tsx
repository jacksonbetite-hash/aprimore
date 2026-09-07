import type { Metadata } from 'next';
import { Icone } from '../../ui.tsx';
import FormPaginaEmpresa from './FormPaginaEmpresa.tsx';
import FormDominiosEmail from './FormDominiosEmail.tsx';
import FormDominio from '../../professor/site/FormDominio.tsx';
import Enviar from '../../professor/Enviar.tsx';
import {
  acaoSalvarPaginaEmpresa, acaoSalvarDominiosEmail,
  acaoDefinirDominioEmpresa, acaoVerificarDominioEmpresa,
} from '../acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';
import { situacaoDominio } from '../../../lib/portal-dominio.ts';
import { enderecoDoPortal } from '../../../lib/portal-consultas.ts';
import { brl } from '../../../lib/precos.ts';

export const metadata: Metadata = { title: 'Minha página — Painel da empresa' };
export const dynamic = 'force-dynamic';

/**
 * A porta do portal da empresa: marca, política de quem entra e endereço.
 *
 * As três coisas juntas numa tela porque respondem à mesma pergunta do
 * gestor — "como a minha equipe chega aqui?". A marca é o que ela
 * reconhece, a política é quem passa, o endereço é por onde.
 */
export default async function PaginaDaEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const dominio = await situacaoDominio(portal.id);
  const endereco = await enderecoDoPortal(portal.mascara);
  const visivel = endereco.replace(/^https?:\/\//, '');

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Minha página</h1>
          <p className="suave">
            O que o colaborador vê ao chegar em <code>{visivel}</code> antes de entrar.
          </p>
        </div>
        <div className="acoes">
          <a className="btn btn-contorno" href={endereco} target="_blank" rel="noreferrer">
            Ver o portal
          </a>
        </div>
      </div>

      <p className="aviso" style={{ marginBottom: 24 }}>
        <strong>O portal da sua empresa é fechado.</strong> Quem chega ao endereço sem
        acesso vê só a marca e o login — não há catálogo, preço nem cadastro aberto. O
        conteúdo interno não aparece em busca.
      </p>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="palette" /> A marca da empresa
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          A logo é o que faz a pessoa reconhecer que chegou no lugar certo antes de digitar a
          senha. Envie o arquivo abaixo — o endereço dele entra sozinho no formulário.
        </p>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {portal.personalizacao.foto
            ? <img src={portal.personalizacao.foto} alt="Logo da empresa" width={96} height={96}
                   style={{ borderRadius: 16, objectFit: 'cover' }} />
            : <div style={{ width: 96, height: 96, borderRadius: 16, background: 'var(--surface-container)',
                            display: 'grid', placeItems: 'center' }} className="caption suave">sem logo</div>}
          <div style={{ flex: '1 1 320px' }}>
            <Enviar tipo="imagem" rotulo="Enviar a logo"
                    aceita="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    dica="JPG, PNG ou WebP, até 5 MB. Quadrada e com pelo menos 400×400 fica melhor na tela de entrada." />
          </div>
        </div>
        <FormPaginaEmpresa
          acao={acaoSalvarPaginaEmpresa}
          nomeExibicao={portal.nomeExibicao}
          valores={portal.personalizacao}
        />
      </div>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="key" /> Quem pode criar conta sozinho
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Hoje: {portal.dominiosEmail.length === 0
            ? 'ninguém — só entra quem recebeu convite.'
            : `quem tem e-mail em ${portal.dominiosEmail.join(', ')}.`}
        </p>
        <FormDominiosEmail acao={acaoSalvarDominiosEmail} dominios={portal.dominiosEmail} />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>
          <Icone nome="language" /> Endereço do portal
        </h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          O portal já responde em <strong>{visivel}</strong>. Se preferir um endereço da
          sua empresa, como <em>treinamento.suaempresa.com.br</em>, cadastre abaixo e peça
          ao seu time de TI o registro CNAME.
        </p>
        {dominio.centavosMes === null ? (
          <p className="suave">
            O seu plano não inclui domínio próprio. Para usar um endereço da empresa, mude
            de plano em Financeiro.
          </p>
        ) : (
          <FormDominio
            acaoDefinir={acaoDefinirDominioEmpresa}
            acaoVerificar={acaoVerificarDominioEmpresa}
            dominio={dominio.dominio}
            verificadoEm={dominio.verificadoEm
              ? new Date(dominio.verificadoEm).toLocaleDateString('pt-BR') : null}
            esperado={dominio.esperado}
            precoMes={dominio.centavosMes === 0 ? 'Incluído no seu plano' : brl(dominio.centavosMes)}
          />
        )}
      </div>
    </>
  );
}

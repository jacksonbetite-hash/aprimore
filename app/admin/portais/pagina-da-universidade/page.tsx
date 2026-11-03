import Link from 'next/link';
import type { Metadata } from 'next';
import FormSecoesPagina from '../../../empresa/site/FormSecoesPagina.tsx';
import { acaoSalvarPaginaPadrao } from '../acoes.ts';
import { exigirTela } from '../../guarda.ts';
import { lerConfiguracao, historicoConfiguracao } from '../../../../lib/configuracao.ts';
import { resolverPagina } from '../../../../lib/pagina-empresa.ts';
import { dominioBase } from '../../../../lib/portal.ts';

export const metadata: Metadata = { title: 'Página das universidades — Administração' };
export const dynamic = 'force-dynamic';

/**
 * Os textos de fábrica da página pública das universidades corporativas
 * (docs/plano-pagina-da-universidade.md, §3.6). O que se salva aqui é o
 * que TODA empresa mostra onde não escreveu o próprio texto; o que a
 * empresa escreveu em /empresa/site passa na frente.
 *
 * O mesmo formulário do RH, em modo `admin`: sem fotos e sem links
 * legais (isso é de cada empresa), e o placeholder aqui é o padrão do
 * código — a última camada.
 */
export default async function PaginaDasUniversidades() {
  await exigirTela('conteudo.agir');
  const [valores, historico] = await Promise.all([
    lerConfiguracao('pagina-universidade'), historicoConfiguracao('pagina-universidade'),
  ]);
  const padraoDoCodigo = resolverPagina({}, null);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Página das universidades</h1>
          <p className="suave">
            O texto padrão da página pública de toda empresa (o que a rua vê em
            <code> empresa.{dominioBase()}</code> antes do login). Cada empresa
            sobrescreve o que quiser em <em>Minha página</em>, no painel dela.
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href="/admin/empresas">Empresas &amp; RH</Link>
        </div>
      </div>

      <p className="aviso" style={{ marginBottom: 24 }}>
        <strong>Só o que a plataforma faz entra aqui.</strong> Recurso que não existe (SSO,
        DRM, integração com sistema de RH) não vai ao texto padrão — sob a marca de uma
        empresa, vira promessa dela (CDC, art. 37). Em branco, vale o texto do código.
        {historico && (
          <> Última edição por <strong>{historico.atualizadoPor}</strong> em{' '}
          {new Date(historico.atualizadoEm).toLocaleString('pt-BR')}.</>
        )}
      </p>

      <div className="cartao">
        <FormSecoesPagina acao={acaoSalvarPaginaPadrao} valores={valores ?? {}} padrao={padraoDoCodigo} modo="admin" />
      </div>
    </>
  );
}

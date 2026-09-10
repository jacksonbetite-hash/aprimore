import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../componentes.tsx';
import AcoesVaga from './AcoesVaga.tsx';
import {
  acaoPublicarVaga, acaoRecusarVaga, acaoPausarVaga, acaoRetomarVaga, acaoReporVaga,
} from './acoes.ts';
import { listarVagasAdmin, contarPorStatus, expirarVencidas } from '../../../lib/admin-vagas.ts';
import {
  ROTULO_STATUS, ROTULO_TIPO, ROTULO_MODALIDADE, type StatusVaga,
} from '../../../lib/vagas-rotulos.ts';
import { exigirPermissao } from '../../../lib/sessao.ts';

export const metadata: Metadata = { title: 'Mural de vagas — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const RECORTES: { valor: string; rotulo: string }[] = [
  { valor: 'em_moderacao', rotulo: 'Fila de moderação' },
  { valor: 'publicada', rotulo: 'No ar' },
  { valor: 'pausada', rotulo: 'Pausadas' },
  { valor: 'expirada', rotulo: 'Expiradas' },
  { valor: 'removida', rotulo: 'Recusadas' },
  { valor: '', rotulo: 'Todas' },
];

const CHIP: Record<StatusVaga, string> = {
  publicada: 'chip-secundaria',
  em_moderacao: 'chip-terciaria',
  pausada: 'chip-neutra',
  expirada: 'chip-neutra',
  removida: 'chip-erro',
  rascunho: 'chip-neutra',
};

export default async function VagasAdmin(
  { searchParams }: { searchParams: Promise<{ status?: string; q?: string }> },
) {
  const { status = 'em_moderacao', q = '' } = await searchParams;
  const u = await exigirPermissao('conteudo.agir');

  // Carimba quem venceu antes de listar. O mural público nunca precisou
  // disto (filtra por data); a retaguarda precisa, senão "no ar" mistura
  // vaga viva com vaga vencida e ninguém sabe o que está sendo mostrado.
  if (u) await expirarVencidas(u.email);

  const [vagas, contagem] = await Promise.all([
    listarVagasAdmin(status, q), contarPorStatus(),
  ]);
  const porStatus = Object.fromEntries(contagem.map((c) => [c.status, c.total]));
  const naFila = porStatus['em_moderacao'] ?? 0;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Mural de vagas</h1>
          <p className="suave">
            {naFila === 0
              ? 'Nada esperando moderação.'
              : `${naFila} vaga(s) esperando moderação.`}{' '}
            Vigência máxima de 3 meses, contada da publicação (§5.7.1).
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href="/vagas" target="_blank">Ver o mural</Link>
          <Link className="btn btn-primario" href="/admin/vagas/nova">
            <Icone nome="edit" tamanho={18} /> Nova vaga
          </Link>
        </div>
      </div>

      <div className="filtros">
        {RECORTES.map((r) => (
          <Link key={r.valor || 'todas'}
            className={`chip chip-sm ${r.valor === status ? 'chip-primaria' : 'chip-contorno'}`}
            href={r.valor ? `/admin/vagas?status=${r.valor}` : '/admin/vagas?status='}>
            {r.rotulo}
            {porStatus[r.valor] ? ` · ${porStatus[r.valor]}` : ''}
          </Link>
        ))}
      </div>

      <form className="busca-vade" style={{ maxWidth: '520px' }}>
        <Icone nome="search" tamanho={22} />
        <input name="q" defaultValue={q} placeholder="Buscar por título ou empresa"
          aria-label="Buscar vaga" />
        <input type="hidden" name="status" value={status} />
      </form>

      <div className="cartao">
        <table className="tabela">
          <thead>
            <tr>
              <th>Vaga</th><th>Situação</th><th>Vigência</th><th>Recebida</th><th>Moderação</th>
            </tr>
          </thead>
          <tbody>
            {vagas.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/admin/vagas/${v.id}`}
                    style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                    {v.titulo}
                  </Link>
                  <br />
                  <span className="suave">
                    {v.empresa} · {ROTULO_TIPO[v.tipo]} · {ROTULO_MODALIDADE[v.modalidade]}
                    {v.cidade ? ` · ${v.cidade}/${v.uf}` : ''}
                  </span>
                </td>
                <td>
                  <span className={`chip chip-sm ${CHIP[v.status]}`}>{ROTULO_STATUS[v.status]}</span>
                  {v.motivoRecusa && (
                    <><br /><span className="suave">{v.motivoRecusa}</span></>
                  )}
                </td>
                <td className="apertado">
                  {v.expiraEm ? (
                    <>
                      {DATA(v.expiraEm)}
                      {v.diasRestantes !== null && (
                        <>
                          {' '}
                          <span className={v.diasRestantes <= 7 ? 'chip chip-sm chip-terciaria' : 'suave'}>
                            {v.diasRestantes >= 0 ? `${v.diasRestantes}d` : 'vencida'}
                          </span>
                        </>
                      )}
                    </>
                  ) : <span className="suave">—</span>}
                </td>
                <td className="suave apertado">{DATA(v.criadaEm)}</td>
                <td>
                  <AcoesVaga
                    vaga={{
                      id: v.id, status: v.status,
                      moderadaPor: v.moderadaPor,
                      moderadaEm: v.moderadaEm ? DATA(v.moderadaEm) : null,
                    }}
                    publicar={acaoPublicarVaga}
                    recusar={acaoRecusarVaga}
                    pausar={acaoPausarVaga}
                    retomar={acaoRetomarVaga}
                    repor={acaoReporVaga}
                  />
                </td>
              </tr>
            ))}
            {vagas.length === 0 && (
              <tr><td colSpan={5}><div className="vazio">Nenhuma vaga neste recorte.</div></td></tr>
            )}
          </tbody>
        </table>
        <p className="dica" style={{ marginTop: '.8rem' }}>
          <strong>Renovar é repostar.</strong> Uma vaga que volta ao ar entra de novo na fila de
          moderação — sem isso, um botão de renovar transformaria a vigência máxima em ficção.
          Pausar não estica o prazo: a data de expiração continua sendo a mesma.
        </p>
      </div>
    </>
  );
}

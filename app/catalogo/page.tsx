import Link from 'next/link';
import type { Metadata } from 'next';
import { Pagina, Icone, portalSuspenso, PortalSuspenso } from '../componentes.tsx';
import { alunoAtual } from '../../lib/sessao.ts';
import {
  listarAreasEmCache, listarMateriasEmCache, listarMateriasCompartilhadas, formatarDuracao,
} from '../../lib/catalogo.ts';
import { brl } from '../../lib/precos.ts';
import { tabelaVigente } from '../../lib/precos-consultas.ts';
import FiltroCursos, { Cartao, type CursoCartao } from './FiltroCursos.tsx';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { exigirPortalAberto } from '../guarda-empresa.ts';

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'As áreas de conhecimento e os cursos do catálogo, com lançamento em ondas.',
};
export const dynamic = 'force-dynamic';

export default async function Catalogo() {
  // §5.11 — no portal de uma empresa o catálogo é interno: quem não tem
  // sessão não vê nem o nome das trilhas.
  await exigirPortalAberto('/catalogo');
  const portalId = await portalIdAtual();
  // §5.10 — portal suspenso por inadimplência: visitante não vê o catálogo;
  // quem está logado passa (a licença vigente dele continua valendo).
  if (await portalSuspenso() && !(await alunoAtual())) return <PortalSuspenso />;
  const [areas, materias, tabela, parceiros] = await Promise.all([
    listarAreasEmCache(portalId), listarMateriasEmCache(portalId), tabelaVigente(portalId),
    // §5.10.2, etapa 5 — cursos de professores parceiros, só na plataforma.
    portalId === 0 ? listarMateriasCompartilhadas() : Promise.resolve([]),
  ]);

  const preco = brl(tabela.MATERIA.mensal);
  const cursos: CursoCartao[] = materias.map((m) => ({
    id: m.id,
    slug: m.slug,
    nome: m.nome,
    ementa: m.ementa,
    onda: m.onda,
    professor: m.professor,
    areaSlug: m.areaSlug,
    publicada: m.status === 'publicado' && m.aulasPublicadas > 0,
    aulas: m.aulasPublicadas,
    duracao: formatarDuracao(m.duracaoTotal),
    duracaoSegundos: m.duracaoTotal,
    preco,
  }));

  return (
    <Pagina ativo="catalogo">
      <section className="cabeca-materia">
        <div className="container">
          <div className="trilha-topo">
            <Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} /><span>Catálogo</span>
          </div>
          <h1>O catálogo, <em className="cor-marca">curso por curso</em></h1>
          <p className="sub">
            Áreas de conhecimento organizadas em trilhas. Você escolhe livremente o que quer
            estudar — a licença é por curso, e as aulas e exercícios vêm junto.
          </p>
        </div>
      </section>

      <section className="secao">
        <div className="container pilha-lg">
          <div className="sabia">
            <div className="titulo"><Icone nome="waves" tamanho={20} /> Lançamento em ondas</div>
            Os cursos da <strong>1ª onda</strong> já estão publicados. Os seguintes abrem a cada
            duas a quatro semanas — entre na lista de espera para votar na próxima.
          </div>

          <FiltroCursos areas={areas} cursos={cursos} />

          {parceiros.length > 0 && (
            <section style={{ marginTop: 48 }} id="parceiros">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
                <h2 className="headline-md">Cursos de professores parceiros</h2>
                <span className="caption suave">
                  Produzidos em portais próprios e vendidos aqui, com o nosso checkout e as nossas garantias.
                </span>
              </div>
              <div className="grade-3">
                {parceiros.map((m) => (
                  <Cartao key={`${m.portalMascara}-${m.slug}`} curso={{
                    id: m.id, slug: m.slug, nome: m.nome, ementa: m.ementa, onda: m.onda,
                    professor: `${m.professor ?? m.portalNome} · ${m.portalNome}`,
                    areaSlug: m.areaSlug, publicada: m.aulasPublicadas > 0,
                    aulas: m.aulasPublicadas, duracao: formatarDuracao(m.duracaoTotal),
                    duracaoSegundos: m.duracaoTotal, preco,
                    href: `/parceiros/${m.portalMascara}/materia/${m.slug}`,
                  }} />
                ))}
              </div>
            </section>
          )}

          <div className="chamada chamada-lado">
            <span className="bolha bolha-a" aria-hidden="true" />
            <span className="bolha bolha-b" aria-hidden="true" />
            <div className="chamada-texto">
              <h2>Vai estudar mais de um curso?</h2>
              <p>
                O passe completo libera todos os cursos publicados — inclusive os lançados
                durante a sua vigência. Economize e expanda seus horizontes.
              </p>
            </div>
            <Link className="btn btn-primario btn-lg" href="/planos">Ver planos</Link>
          </div>
          {/* §5.10.2, etapa 3 — só no site principal: no portal de um
              professor, este convite seria concorrência na casa dele. */}
          {portalId === 0 && (
            <p className="centro caption suave" style={{ marginTop: 16 }}>
              É professor? <Link href="/para-professores" style={{ fontWeight: 700 }}>Monte o seu próprio portal de cursos →</Link>
            </p>
          )}
        </div>
      </section>
    </Pagina>
  );
}

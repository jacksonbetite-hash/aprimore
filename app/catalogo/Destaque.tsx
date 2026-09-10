import Link from 'next/link';
import { Icone } from '../ui.tsx';
import { plural, type CursoCartao } from './CartaoCurso.tsx';

/**
 * O banner que abre a página de cursos — o "curso em destaque" do layout
 * de 09/09/2026 (docs/plano-catalogo-streaming.md).
 *
 * Ele substituiu a `.banner-catalogo`, a faixa de marca com o mosaico de
 * três capas. A troca tem um motivo: aquela faixa falava do CATÁLOGO
 * ("O catálogo, curso por curso"), e quem chega numa vitrine não quer
 * saber do catálogo — quer ver um curso. Aqui a faixa inteira é um curso,
 * com a capa dele em tamanho de cartaz, a ementa e o botão que leva à
 * aula aberta.
 *
 * Qual curso: o marcado como destaque no cadastro (db/043); sem nenhum
 * marcado, o primeiro publicado. Quem escolhe é o professor, no
 * formulário do curso — não a ordem alfabética.
 *
 * O QUE NÃO ESTÁ AQUI, e não por esquecimento: nota de avaliação,
 * contagem de avaliações, "4K HDR" e "atualizado 2025" fixo. O layout de
 * referência trazia os quatro; nenhum deles é coisa que este banco saiba
 * responder, e número inventado sob a marca de outra pessoa é publicidade
 * enganosa (CDC, art. 37 — a mesma régua de `app/page.tsx` e da vitrine).
 * No lugar deles entram os números que existem: aulas, duração, amostra
 * aberta e a data da última aula publicada.
 */

/** "setembro de 2026" — mês e ano bastam; dia exato aqui é ruído. */
const mesAno = (d: Date | string) =>
  new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export default function Destaque(
  { curso, portal, ilustracao, fundo = null }: {
    curso: CursoCartao;
    /** O nome que assina a vitrine — o do professor, no portal dele. */
    portal: string;
    /**
     * A arte de reserva, para o curso que ainda não tem capa. É uma
     * imagem de estúdio genérica, e por isso vem com o selo de conteúdo
     * ilustrativo — a mesma regra de `public/imagens/LEIA-ME.md`.
     */
    ilustracao: string;
    /**
     * A arte FIXA do fundo, quando a abertura não é do curso e sim da
     * casa. Preenchida, ela vence a capa ATRÁS do texto — e só ali: o
     * cartão do curso continua com a capa do professor, que é conteúdo
     * real dele. É o caso do catálogo da plataforma, cuja abertura é
     * institucional e não pode mudar de cara a cada curso em destaque,
     * ainda mais quando a capa saiu sozinha de um quadro do vídeo.
     * Como não é foto do curso, ela ACENDE o selo de ilustrativa.
     */
    fundo?: string | null;
  },
) {
  /* A figura que vai ATRÁS do texto — nem sempre a capa, daí o nome. */
  const arte = fundo ?? curso.capa ?? ilustracao;
  /* Quando o fundo é a arte da casa (ou a de reserva), a figura atrás do
     texto não retrata este curso — e aí o selo é obrigatório. Com a capa
     do professor, ela é conteúdo real e o selo sai. */
  const fundoIlustrativo = fundo !== null || !curso.capa;
  const href = curso.href ?? `/materia/${curso.slug}`;
  /* "Assistir agora" só leva a assistir quando existe aula aberta. Sem
     amostra, o mesmo botão vira "Ver o curso": prometer reprodução e
     entregar tela de compra é o tipo de botão que só se clica uma vez. */
  const amostra = curso.previa?.aulaSlug ?? null;

  return (
    <section className="destaque-catalogo">
      <div className={fundo ? 'destaque-fundo destaque-fundo-casa' : 'destaque-fundo'}>
        {/* Decorativa: o título ao lado já diz qual é o curso. */}
        <img src={arte} alt="" fetchPriority="high" decoding="async" />
        <span className="destaque-cortina" aria-hidden="true" />
      </div>

      <div className="destaque-texto">
        <div className="destaque-marcas">
          <span className="marca-destaque">
            <Icone nome="star" tamanho={16} /> Curso em destaque
          </span>
          <span className="marca-vidro">
            {curso.areaNome}
            {curso.nivel && <> · {curso.nivel}</>}
          </span>
        </div>

        <h1>{curso.nome}</h1>
        <p className="destaque-ementa">{curso.ementa}</p>

        <div className="destaque-acoes">
          <Link className="btn btn-primario btn-lg"
                href={amostra ? `/aula/${amostra}` : href}>
            <Icone nome="play_arrow" tamanho={20} />
            {amostra ? 'Assistir agora' : 'Ver o curso'}
          </Link>
          <Link className="btn btn-vidro btn-lg" href={href}>
            <Icone nome="library_books" tamanho={20} /> Ver a grade completa
          </Link>
        </div>

        {/* Os números do curso, e só eles. */}
        <ul className="destaque-numeros">
          <li><Icone nome="movie" tamanho={16} /> {plural(curso.aulas, 'aula', 'aulas')}</li>
          <li><Icone nome="schedule" tamanho={16} /> {curso.duracao} de vídeo</li>
          {(curso.amostras ?? 0) > 0 && (
            <li>
              <Icone nome="play_circle" tamanho={16} />
              {curso.amostras === 1
                ? 'uma aula aberta para experimentar'
                : `${curso.amostras} aulas abertas para experimentar`}
            </li>
          )}
          {curso.atualizadaEm && (
            <li><Icone nome="replay" tamanho={16} /> atualizado em {mesAno(curso.atualizadaEm)}</li>
          )}
        </ul>

        <p className="destaque-assinatura">
          <Icone nome="school" tamanho={16} /> {curso.professor ?? portal}
        </p>

        {/* O selo só existe quando a arte é nossa — a de reserva ou a da
            abertura da plataforma; com a capa do professor, a figura é
            conteúdo real do curso. */}
        {fundoIlustrativo && (
          <p className="selo-ilustrativo destaque-selo">
            <Icone nome="info" tamanho={16} /> Imagem ilustrativa
          </p>
        )}
      </div>
    </section>
  );
}

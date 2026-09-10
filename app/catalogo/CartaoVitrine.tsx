import Link from 'next/link';
import { Icone } from '../ui.tsx';
import { ONDA, plural, tomDaCapa, type CursoCartao } from './CartaoCurso.tsx';

/**
 * O cartão GRANDE do acervo — o da vitrine do portal do professor
 * (layout aprovado em 09/09/2026, `docs/plano-vitrine-do-professor.md`).
 *
 * Ele não substitui o `CartaoCurso`: são dois usos diferentes do mesmo
 * dado. Na página de cursos o cartão é de fila — quatro por linha, capa
 * pequena, ementa em duas linhas — porque ali a pessoa COMPARA. Na
 * abertura do portal ela ainda não sabe o que existe, e o acervo inteiro
 * cabe em dois por linha: a capa fica em tamanho de cartaz e o que estava
 * escondido no cartão pequeno (contagem, duração, amostra) sobe para
 * cima dela.
 *
 * Nada aqui é escrito à mão. Onda, aulas, duração, amostra e preço saem
 * todos da matéria — cartão de portal vazio não pode inventar selo.
 */
export default function CartaoVitrine({ curso }: { curso: CursoCartao }) {
  const etiqueta = curso.etiqueta === undefined ? ONDA(curso.onda) : curso.etiqueta;
  const amostras = curso.amostras ?? 0;
  return (
    <Link className="cartao cartao-vitrine" href={curso.href ?? `/materia/${curso.slug}`}>
      <div className={curso.capa ? 'capa-curso capa-vitrine' : `capa-curso capa-vitrine capa-tom-${tomDaCapa(curso.areaSlug)}`}>
        {curso.capa
          /* Decorativa: o título logo abaixo já diz do que é o curso. */
          ? <img className="capa-foto" src={curso.capa} alt="" loading="lazy" decoding="async" />
          : <Icone nome="play_circle" tamanho={54} />}
        {/* A cortina escura é o que sustenta o texto branco sobre a capa,
            que pode ser QUALQUER foto enviada pelo professor — inclusive
            uma clara. Sem ela o par não passa em AA (§9). */}
        <span className="capa-cortina" aria-hidden="true" />
        <div className="capa-marcas">
          {etiqueta && <span className="marca-onda">{etiqueta}</span>}
          <span className="marca-clara">{plural(curso.aulas, 'aula', 'aulas')}</span>
        </div>
        <div className="capa-rodape">
          {/* O vão à esquerda é mantido quando o curso não tem amostra:
              sem ele a duração pularia para o canto esquerdo, e o cartão
              ao lado (que tem amostra) ficaria desalinhado. */}
          {amostras > 0 ? (
            <span className="capa-amostra">
              <Icone nome="play_circle" tamanho={18} />
              {amostras === 1 ? 'Uma aula aberta para experimentar' : `${amostras} aulas abertas para experimentar`}
            </span>
          ) : <span />}
          <span className="capa-duracao">{curso.duracao}</span>
        </div>
      </div>

      <div className="corpo-vitrine">
        <span className="area-do-cartao">{curso.areaNome}</span>
        <h3>{curso.nome}</h3>
        <p className="ementa">{curso.ementa}</p>
        <div className="rodape-vitrine">
          {curso.preco ? (
            <div>
              <span className="caption suave">A partir de</span>
              <strong>{curso.preco}/mês</strong>
            </div>
          ) : <span />}
          <span className="btn btn-contorno btn-sm">
            Ver o curso <Icone nome="arrow_forward" tamanho={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

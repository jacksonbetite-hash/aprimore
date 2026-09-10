/**
 * Uma fila do catálogo: título à esquerda e os cartões embaixo, lado a
 * lado (fase 1 do plano em `docs/plano-catalogo-em-prateleiras.md`).
 *
 * A fila QUEBRA em vez de rolar: quantos cartões couberem na largura da
 * página, e o resto desce para a linha seguinte. A primeira versão
 * rolava para o lado, como a referência, e trouxe junto uma barra de
 * rolagem horizontal dentro da página — o que estava fora da tela
 * dependia de arrastar para ser descoberto. Com a quebra, o acervo
 * inteiro fica visível rolando a página, que é o gesto que a pessoa já
 * está fazendo.
 *
 * Sem `'use client'`, e sem uma linha de JavaScript: a quebra é do
 * `grid-template-columns` com `auto-fill`, e quem decide quantas colunas
 * cabem é o navegador, em qualquer largura.
 */
export default function Prateleira({
  titulo, legenda, nivel = 2, largo = false, children,
}: {
  /** Nulo quando a seção acima já nomeia a fila — aí o cabeçalho some. */
  titulo?: string | null;
  legenda?: string;
  /** 2 no catálogo (onde a área é a seção); 3 na página do portal. */
  nivel?: 2 | 3;
  /**
   * A fila do cartão GRANDE da vitrine do portal: dois por linha em vez
   * de quatro. Mesma quebra automática — só muda a largura mínima da
   * coluna, porque a capa em tamanho de cartaz não sobrevive a 264px.
   */
  largo?: boolean;
  children: React.ReactNode;
}) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  return (
    <section className="prateleira">
      {(titulo || legenda) && (
        <div className="prateleira-cabeca">
          {titulo && <Titulo className="headline-md">{titulo}</Titulo>}
          {legenda && <span className="caption suave">{legenda}</span>}
        </div>
      )}
      <div className={largo ? 'prateleira-trilho largo' : 'prateleira-trilho'}>{children}</div>
    </section>
  );
}

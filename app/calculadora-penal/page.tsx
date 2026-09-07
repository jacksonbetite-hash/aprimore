import Link from 'next/link';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../componentes.tsx';
import FormCalculadora from './FormCalculadora.tsx';
import Resultado from './Resultado.tsx';
import { acaoSalvarCalculo, acaoApagarCalculo } from './acoes.ts';
import { exigirPortalAberto } from '../guarda-empresa.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { dispositivosPorReferencia, aulasQueExplicam } from '../../lib/vademecum.ts';
import { listarCalculos } from '../../lib/calculo-pena.ts';
import { calcular, ErroDeCalculo } from '../../lib/penas/calcular.ts';
import { desserializarCaso, casoInicial, crimeVazio, serializarCaso } from '../../lib/penas/url.ts';
import { tipoPorId, CATALOGO_CONFERIDO_EM, NORMAS_DO_CATALOGO, tiposParaEscolha } from '../../lib/penas/catalogo/index.ts';
import { referenciasDoResultado } from '../../lib/penas/referencias.ts';
import { dataBR } from '../../lib/penas/tempo.ts';
import type { Resultado as TipoResultado } from '../../lib/penas/tipos.ts';

export const metadata: Metadata = {
  title: 'Calculadora Penal',
  description:
    'Dosimetria da pena em três fases, regime inicial, substituição, sursis, progressão, prescrição, decadência e perempção — com o artigo de lei ao lado de cada passo.',
};
export const dynamic = 'force-dynamic';

/**
 * Calculadora Penal (§5.12).
 *
 * O caso mora na URL (`?c=`): o formulário (cliente) monta o caso e
 * navega para o endereço dele; esta página (servidor) calcula e mostra o
 * resultado com o texto dos artigos vindo do acervo. Quem cola o link
 * abre o mesmo cálculo; quem imprime, imprime o resultado.
 */
export default async function CalculadoraPenal(
  { searchParams }: { searchParams: Promise<{ c?: string; tipo?: string; salvo?: string }> },
) {
  await exigirPortalAberto('/calculadora-penal');
  const { c, tipo, salvo } = await searchParams;

  let caso = desserializarCaso(c);
  // vindo do vade-mécum: "Calcular a pena" deste artigo
  if (!caso && tipo && tipoPorId(tipo)) {
    caso = casoInicial();
    caso.crimes = [crimeVazio(tipo)];
  }
  const inicial = caso ?? casoInicial();
  const param = caso ? serializarCaso(caso) : '';

  let resultado: TipoResultado | null = null;
  let erro: string | null = null;
  if (caso && caso.crimes.length > 0) {
    try {
      resultado = calcular(caso);
    } catch (e) {
      if (e instanceof ErroDeCalculo) erro = e.message;
      else throw e;
    }
  }

  const [aluno, portalId] = await Promise.all([alunoAtual(), portalIdAtual()]);
  const dispositivos = resultado ? await dispositivosPorReferencia(referenciasDoResultado(resultado)) : new Map();
  const aulas = resultado ? await aulasQueExplicam(portalId, [...dispositivos.values()].map((d) => d.id)) : [];
  const aulasPorDispositivo = new Map<number, { slug: string; titulo: string }[]>();
  for (const a of aulas) {
    const lista = aulasPorDispositivo.get(a.dispositivoId) ?? [];
    lista.push(a);
    aulasPorDispositivo.set(a.dispositivoId, lista);
  }
  const salvos = aluno ? await listarCalculos(aluno.id, portalId) : [];
  const totalTipos = tiposParaEscolha().length;

  return (
    <Pagina ativo="calculadora-penal">
      <div className="container calc-app">
        <section className="vade-consulta calc-cabeca">
          <h1>Calculadora Penal</h1>
          <p className="sub">
            Escolha a lei e o crime, descreva o caso e veja a pena calculada nas três fases do art. 68 do
            Código Penal — com o artigo ao lado de cada passo, o regime, a prescrição por fase do processo,
            a decadência e a perempção.
          </p>
          <div className="vade-atalhos">
            {NORMAS_DO_CATALOGO.map((n) => (
              <span key={n.slug} className="chip chip-sm chip-contorno">{n.nome}</span>
            ))}
            <span className="chip chip-sm chip-neutra">{totalTipos} tipos penais · conferidos em {dataBR(CATALOGO_CONFERIDO_EM)}</span>
          </div>
        </section>

        <div className="calc-corpo">
          <FormCalculadora key={param || 'novo'} inicial={inicial} />

          <section className="calc-resultado" id="resultado" aria-live="polite">
            {erro && (
              <div className="calc-vazio">
                <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> <span>{erro}</span></p>
              </div>
            )}
            {!erro && !resultado && (
              <div className="calc-vazio">
                <span className="calc-vazio-ico"><Icone nome="calculate" tamanho={34} /></span>
                <h2>O resultado aparece aqui</h2>
                <p>
                  Comece pela data do fato e pelo crime. A prévia da pena atualiza enquanto você preenche;
                  “Ver resultado completo” abre a memória de cálculo, a linha do tempo do processo e a ficha
                  do caso, com o texto de cada artigo citado.
                </p>
              </div>
            )}
            {resultado && caso && (
              <Resultado
                resultado={resultado}
                caso={caso}
                dispositivos={dispositivos}
                aulasPorDispositivo={aulasPorDispositivo}
                param={param}
              />
            )}

            {resultado && (
              <div className="calc-salvar cartao">
                {aluno ? (
                  <form action={acaoSalvarCalculo} className="calc-salvar-form">
                    <input type="hidden" name="c" value={param} />
                    <label>
                      Guardar este cálculo com o nome
                      <input name="titulo" maxLength={120} placeholder="Ex.: Roubo majorado tentado — prova de Penal II" />
                    </label>
                    <button className="btn btn-primario" type="submit"><Icone nome="save" tamanho={18} /> Salvar</button>
                  </form>
                ) : (
                  <p className="calc-salvar-aviso">
                    <Icone nome="info" tamanho={18} />
                    <span>
                      <Link href={`/entrar?destino=${encodeURIComponent(`/calculadora-penal?c=${param}`)}`}>Entre na sua conta</Link>{' '}
                      para guardar este cálculo e voltar a ele depois. O link desta página já funciona sem conta.
                    </span>
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {aluno && (
          <section className="calc-meus" id="meus-calculos">
            <h2 className="headline-md">Meus cálculos</h2>
            {salvo && <p className="alerta alerta-ok" role="status">Cálculo guardado.</p>}
            {salvos.length === 0 ? (
              <p className="vazio">Nenhum cálculo guardado ainda. Calcule um caso e use “Salvar” no fim do resultado.</p>
            ) : (
              <ul className="calc-lista">
                {salvos.map((s) => (
                  <li key={s.id}>
                    <Link href={`/calculadora-penal?c=${s.param}#resultado`}>
                      <strong>{s.titulo}</strong>
                      <span>{s.resumo}</span>
                      <small>
                        {new Date(s.criadoEm).toLocaleDateString('pt-BR')}
                        {s.desatualizado && ' · catálogo mudou desde então — o link recalcula com a regra atual'}
                      </small>
                    </Link>
                    <form action={acaoApagarCalculo}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="c" value={param} />
                      <button className="botao-icone" type="submit" title="Apagar" aria-label={`Apagar ${s.titulo}`}>
                        <Icone nome="delete" tamanho={18} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="vade-nota">
          ⚖️ Ferramenta de <strong>estudo e conferência</strong>. Onde a jurisprudência diverge, o critério
          usado está dito na memória de cálculo e pode ser trocado. Não substitui a análise do caso concreto
          nem a jurisprudência do tribunal local. Encontrou uma regra errada?{' '}
          <a href={`mailto:contato@aprimoreosaber.com.br?subject=${encodeURIComponent('Calculadora Penal: possível erro')}&body=${encodeURIComponent(`Link do cálculo: /calculadora-penal?c=${param}\n\nO que está errado:\n`)}`}>
            Avise com o link do cálculo
          </a>.
        </p>
      </div>
    </Pagina>
  );
}

'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { Icone } from '../ui.tsx';
import { MESES, PERIODOS, brl, porMes, type Periodo, type Tabela } from '../../lib/precos.ts';
import type { EstadoComercial } from '../acoes-comerciais.ts';

type Acao = (e: EstadoComercial, d: FormData) => Promise<EstadoComercial>;

export default function SeletorPeriodo({
  tabela, economiaAnual, materias, logado, temTrial, precisaCpf, acaoComprar, acaoTrial,
}: {
  tabela: Tabela;
  economiaAnual: number;
  materias: { id: number; nome: string }[];
  logado: boolean;
  temTrial: boolean;
  /** Aluno logado sem CPF: a compra pede, uma vez (§12.1). */
  precisaCpf: boolean;
  acaoComprar: Acao;
  acaoTrial: Acao;
}) {
  const [periodo, setPeriodo] = useState<Periodo>('mensal');
  const [materiaId, setMateriaId] = useState(String(materias[0]?.id ?? ''));
  const [meio, setMeio] = useState<'PIX' | 'CARTAO'>('PIX');
  const [cpf, setCpf] = useState('');
  const [estadoCompra, enviarCompra, comprando] = useActionState(acaoComprar, {});
  const [estadoTrial, enviarTrial, ativandoTrial] = useActionState(acaoTrial, {});

  const materia = tabela.MATERIA[periodo];
  const passe = tabela.CATALOGO[periodo];
  const legenda = (v: number) =>
    periodo === 'mensal'
      ? 'por mês, renovação automática no cartão'
      : `a cada ${MESES[periodo]} meses (${brl(porMes(v, periodo))}/mês)`;

  const semMaterias = materias.length === 0;

  return (
    <>
      <div className="centro">
        <div className="alternador">
          {PERIODOS.map((p) => (
            <button key={p} className={periodo === p ? 'ativo' : ''} onClick={() => setPeriodo(p)}>
              {p[0].toUpperCase() + p.slice(1)}
              {p === 'anual' && ` · economize ${economiaAnual}%`}
            </button>
          ))}
        </div>
      </div>

      {(estadoCompra.erro || estadoTrial.erro) && (
        <p className="alerta alerta-erro" role="alert" style={{ marginBottom: 20 }}>
          <Icone nome="error" tamanho={20} /> {estadoCompra.erro ?? estadoTrial.erro}
        </p>
      )}

      <div className="planos">
        {/* ---------- Teste gratuito ---------- */}
        <div className="cartao cartao-plano plano">
          <div className="nome">Teste grátis</div>
          <div className="promessa">Conheça antes de decidir</div>
          <p className="resumo">Para quem quer sentir o método antes de colocar dinheiro.</p>
          <div className="valor">R$ 0</div>
          <p className="periodo">7 dias · sem cartão de crédito</p>
          <p className="inclui">O teste inclui:</p>
          <ul>
            <li><Icone nome="check_circle" tamanho={20} /> 1 curso à sua escolha</li>
            <li><Icone nome="check_circle" tamanho={20} /> Cerca de 20% das aulas</li>
            <li><Icone nome="check_circle" tamanho={20} /> Até 30 exercícios</li>
            <li className="ausente"><Icone nome="remove" tamanho={20} /> Material para download</li>
            <li className="ausente"><Icone nome="remove" tamanho={20} /> Certificado de curso livre</li>
          </ul>

          {!logado ? (
            <Link className="btn btn-primario btn-bloco" href="/cadastrar">Criar conta e testar</Link>
          ) : temTrial ? (
            <p className="caption suave">
              Você já usou seu teste gratuito — ele é um por conta. Escolha um curso ao lado.
            </p>
          ) : semMaterias ? (
            <p className="caption suave">Nenhum curso publicado ainda.</p>
          ) : (
            <form action={enviarTrial} className="pilha-sm">
              <label className="caption suave" htmlFor="trial-materia">Curso do teste</label>
              <select id="trial-materia" name="materiaId" defaultValue={materias[0]?.id}
                      style={{ padding: '10px 12px', borderRadius: 'var(--r)', border: '2px solid var(--borda-controle)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', fontFamily: 'inherit' }}>
                {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              <button className="btn btn-primario btn-bloco" type="submit" disabled={ativandoTrial}>
                {ativandoTrial ? 'Ativando…' : 'Ativar meus 7 dias'}
              </button>
            </form>
          )}
        </div>

        {/* ---------- Matéria avulsa ---------- */}
        <div className="cartao cartao-plano plano destaque">
          <span className="fita">Mais escolhido</span>
          <div className="nome">Curso avulso</div>
          <div className="promessa">Um curso inteiro, do começo ao fim</div>
          <p className="resumo">Ideal para quem tem um objetivo específico e quer fechar ele agora.</p>
          <div className="valor">{brl(materia)}</div>
          <p className="periodo">{legenda(materia)}</p>
          <p className="inclui">Tudo do teste, mais:</p>
          <ul>
            <li><Icone nome="check_circle" tamanho={20} /> Todas as aulas do curso</li>
            <li><Icone nome="check_circle" tamanho={20} /> Todos os exercícios e simulados dele</li>
            <li><Icone nome="check_circle" tamanho={20} /> Material de apoio para download</li>
            <li><Icone nome="check_circle" tamanho={20} /> Biblioteca de fontes dentro da aula</li>
            <li><Icone nome="check_circle" tamanho={20} /> Caderno de erros e anotações</li>
            <li><Icone nome="check_circle" tamanho={20} /> Sem anúncios</li>
          </ul>
          <form action={enviarCompra} className="pilha-sm">
            <input type="hidden" name="produto" value="MATERIA" />
            <input type="hidden" name="periodo" value={periodo} />
            <input type="hidden" name="meio" value={meio} />
            <label className="caption suave" htmlFor="compra-materia">Selecione o curso</label>
            <select id="compra-materia" name="materiaId" value={materiaId} onChange={(e) => setMateriaId(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 'var(--r)', border: '2px solid var(--borda-controle)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', fontFamily: 'inherit' }}>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            {precisaCpf && <CampoCpf cpf={cpf} aoMudar={setCpf} />}
            <MeioDePagamento meio={meio} aoTrocar={setMeio} />
            <button className="btn btn-primario btn-bloco" type="submit" disabled={comprando || semMaterias}>
              {comprando ? 'Abrindo pedido…' : 'Assinar este curso'}
            </button>
          </form>
        </div>

        {/* ---------- Passe completo ---------- */}
        <div className="cartao cartao-plano plano">
          <div className="nome">Passe completo</div>
          <div className="promessa">A plataforma inteira liberada</div>
          <p className="resumo">Para quem estuda mais de uma área e não quer escolher.</p>
          <div className="valor">{brl(passe)}</div>
          <p className="periodo">{legenda(passe)}</p>
          <p className="inclui">Tudo do curso avulso, mais:</p>
          <ul>
            <li><Icone nome="check_circle" tamanho={20} /> Todos os cursos publicados</li>
            <li><Icone nome="check_circle" tamanho={20} /> Cursos novos liberados automaticamente</li>
            <li><Icone nome="check_circle" tamanho={20} /> Simulados cronometrados</li>
            <li><Icone nome="check_circle" tamanho={20} /> Estatística e diagnóstico de acerto por assunto</li>
            <li><Icone nome="check_circle" tamanho={20} /> Sem anúncios em nenhum lugar</li>
          </ul>
          <form action={enviarCompra} className="pilha-sm">
            <input type="hidden" name="produto" value="CATALOGO" />
            <input type="hidden" name="periodo" value={periodo} />
            <input type="hidden" name="meio" value={meio} />
            {precisaCpf && <CampoCpf cpf={cpf} aoMudar={setCpf} />}
            <MeioDePagamento meio={meio} aoTrocar={setMeio} />
            <button className="btn btn-primario btn-bloco" type="submit" disabled={comprando}>
              {comprando ? 'Abrindo pedido…' : 'Assinar o passe'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function MeioDePagamento(
  { meio, aoTrocar }: { meio: 'PIX' | 'CARTAO'; aoTrocar: (m: 'PIX' | 'CARTAO') => void },
) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {(['PIX', 'CARTAO'] as const).map((m) => (
        <button
          key={m} type="button" onClick={() => aoTrocar(m)}
          className={`chip ${meio === m ? 'chip-secundaria' : 'chip-neutra'}`}
          style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', border: 0, padding: '8px 10px' }}
        >
          {m === 'PIX' ? 'Pix' : 'Cartão'}
        </button>
      ))}
    </div>
  );
}

function CampoCpf({ cpf, aoMudar }: { cpf: string; aoMudar: (v: string) => void }) {
  return (
    <label className="caption suave" style={{ display: 'grid', gap: 4 }}>
      CPF (o meio de pagamento exige)
      <input name="cpf" type="text" inputMode="numeric" required value={cpf}
             onChange={(e) => aoMudar(e.target.value)} placeholder="000.000.000-00" maxLength={14}
             style={{ padding: '10px 12px', borderRadius: 'var(--r)', border: '2px solid var(--borda-controle)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', fontFamily: 'inherit', fontSize: 14 }} />
    </label>
  );
}

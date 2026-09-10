/**
 * Gera os PDFs de demonstração da Biblioteca da empresa.
 *
 * Existe pelo mesmo motivo de `gerar-capas.mjs`: `midia/` está no
 * .gitignore, e o roteiro `portal-empresa.mjs` precisa de arquivos para
 * enviar. Um PDF de uma página, escrito à mão em algumas dezenas de
 * linhas, custa menos que versionar um livro de verdade — e o que a
 * demonstração precisa provar é o envio, a entrega e o filtro, não o
 * conteúdo do material.
 *
 * Sem dependência nenhuma: o PDF é montado byte a byte. É o formato
 * mínimo que o navegador abre — catálogo, páginas, uma página, um fluxo
 * de conteúdo e a fonte Helvetica, que todo leitor tem embutida.
 *
 *   node scripts/gerar-pdfs-demo.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.env.DEMO_MIDIA
  ? join(process.env.DEMO_MIDIA, 'documentos')
  : join(RAIZ, 'midia', 'demo', 'documentos');

/** Latin-1: é a codificação que o Helvetica embutido do PDF entende. */
const escapar = (t) => t.replace(/[\\()]/g, (c) => `\\${c}`);

function montarPdf(titulo, linhas) {
  const texto = [
    'BT /F1 22 Tf 60 760 Td (' + escapar(titulo) + ') Tj ET',
    ...linhas.map((l, i) => `BT /F1 12 Tf 60 ${710 - i * 22} Td (${escapar(l)}) Tj ET`),
    'BT /F1 9 Tf 60 80 Td (Documento de demonstracao - Aprimore o Saber) Tj ET',
  ].join('\n');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] '
      + '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let saida = '%PDF-1.4\n';
  const posicoes = [];
  objetos.forEach((o, i) => {
    posicoes.push(saida.length);
    saida += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicioXref = saida.length;
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const p of posicoes) saida += `${String(p).padStart(10, '0')} 00000 n \n`;
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\n`
    + `startxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(saida, 'latin1');
}

const DOCUMENTOS = [
  {
    arquivo: 'aurora-guia-lgpd.pdf',
    titulo: 'Guia pratico de LGPD para equipes',
    linhas: [
      'Grupo Aurora Varejo - Treinamento e Desenvolvimento',
      '',
      '1. O que e dado pessoal no nosso dia a dia',
      '2. O que pode e o que nao pode pedir ao cliente',
      '3. Onde guardar, por quanto tempo, e quando descartar',
      '4. O que fazer quando o cliente pede os dados dele',
      '5. Incidente: a quem avisar, e em quanto tempo',
      '',
      'Este material acompanha a trilha "LGPD no atendimento ao cliente".',
    ],
  },
  {
    arquivo: 'aurora-manual-integracao.pdf',
    titulo: 'Manual de integracao - Lojas',
    linhas: [
      'Grupo Aurora Varejo - Treinamento e Desenvolvimento',
      '',
      'Para quem esta comecando na operacao de loja:',
      '',
      '- Abertura e fechamento do caixa',
      '- Atendimento e troca de mercadoria',
      '- Seguranca no salao e no estoque',
      '- A quem recorrer em cada situacao',
      '',
      'Restrito ao setor Lojas.',
    ],
  },
  {
    arquivo: 'aurora-codigo-de-conduta.pdf',
    titulo: 'Codigo de conduta',
    linhas: [
      'Grupo Aurora Varejo',
      '',
      'Os compromissos que valem para todo mundo na Aurora:',
      '',
      '- Respeito no trato com colega, cliente e fornecedor',
      '- Conflito de interesse: declarar sempre',
      '- Brinde e cortesia: limites e registro',
      '- Canal de denuncia: como e por onde',
      '',
      'Leitura recomendada a toda a empresa.',
    ],
  },
];

mkdirSync(DESTINO, { recursive: true });
for (const d of DOCUMENTOS) {
  const caminho = join(DESTINO, d.arquivo);
  writeFileSync(caminho, montarPdf(d.titulo, d.linhas));
  console.log(`✔ ${d.arquivo}`);
}
console.log(`\n${DOCUMENTOS.length} PDFs em ${DESTINO}`);

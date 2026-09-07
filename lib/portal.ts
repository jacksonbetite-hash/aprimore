/**
 * Portal (tenant) — parte pura, sem acesso a banco.
 *
 * §5.10 do discovery: o sistema serve N catálogos pela mesma aplicação, e
 * quem decide qual deles é o endereço da requisição —
 * `jackson.aprimoreosaber.com.br` é o portal do Jackson, o domínio nu é a
 * plataforma.
 *
 * A leitura do endereço mora aqui, separada do banco, por dois motivos:
 * é o pedaço que os testes cobrem (`portal.test.ts`), e é o pedaço que o
 * `proxy.ts` precisa — proxy roda antes da aplicação e não abre conexão.
 * As consultas ficam em `portal-consultas.ts`, que só o servidor importa.
 */

/** Onde a máscara viaja entre o proxy e a aplicação. */
export const CABECALHO_PORTAL = 'x-portal-mascara';
/** Domínio próprio do portal (Fase 2), quando o Host não é subdomínio nosso. */
export const CABECALHO_DOMINIO = 'x-portal-dominio';

/**
 * O endereço EXTERNO da requisição (host:porta e protocolo como o
 * navegador digitou). No Next 16 o proxy roda fora do runtime e repassa a
 * requisição internamente, então `Host` chega à aplicação como
 * `localhost:3000` — inútil para montar um redirect para fora. Quem vê o
 * endereço real é o proxy; ele o repassa aqui.
 */
export const CABECALHO_HOST_EXTERNO = 'x-portal-host-externo';
export const CABECALHO_PROTO_EXTERNO = 'x-portal-proto-externo';

/**
 * A plataforma é o portal 0 — uma linha reservada em `portal`, criada por
 * `db/018_portal.sql`. Não é detalhe de implementação: com `NULL` para
 * "sem portal", toda consulta precisaria de `IS NOT DISTINCT FROM` e um
 * `=` esquecido vazaria o acervo de um professor no site de outro
 * (§15.14). Com sentinela, `WHERE portal_id = $1` está sempre certo, e um
 * parâmetro nulo por bug devolve zero linhas — falha fechada.
 */
export const PORTAL_PLATAFORMA = 0;

export type StatusPortal = 'RASCUNHO' | 'ATIVO' | 'SUSPENSO' | 'ENCERRADO';

/**
 * O regime de acesso do portal (§5.11). Não é "de quem ele é" — é se ele
 * é aberto ou fechado:
 *
 *   PROFESSOR  vitrine pública: catálogo, amostra gratuita, preço na tela,
 *              qualquer um cria conta e compra. É também o tipo da
 *              PLATAFORMA (portal 0), por CHECK no banco: o site
 *              principal nunca pode ficar atrás de um login.
 *   EMPRESA    porta fechada: marca e login. Entra quem o RH cadastrou ou
 *              convidou, e o acesso vem de licença B2B, não de compra.
 */
export type PortalTipo = 'PROFESSOR' | 'EMPRESA';

/** O que o professor preenche na página única (§5.10, "Anatomia"). */
export interface Personalizacao {
  chamada?: string;
  proposito?: string;
  sobre?: string;
  contato?: string;
  corPrimaria?: string;
  foto?: string;
}

export interface Portal {
  id: number;
  mascara: string;
  nomeExibicao: string;
  status: StatusPortal;
  tipo: PortalTipo;
  personalizacao: Personalizacao;
  /** Identificação do responsável no rodapé do portal (§5.10, LGPD/CDC). */
  responsavelNome: string | null;
  responsavelDoc: string | null;
  /** §5.11: domínios de e-mail que dispensam convite. Vazio = só por convite. */
  dominiosEmail: string[];
}

export const PLATAFORMA: Portal = {
  id: PORTAL_PLATAFORMA,
  mascara: 'plataforma',
  nomeExibicao: 'Aprimore o Saber',
  status: 'ATIVO',
  tipo: 'PROFESSOR',
  personalizacao: {},
  responsavelNome: null,
  responsavelDoc: null,
  dominiosEmail: [],
};

/** Só #rgb ou #rrggbb entram no CSS do portal — cor é dado, não código. */
export function corSegura(cor: string | undefined): string | null {
  return cor && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(cor.trim()) ? cor.trim() : null;
}

/** CNPJ com pontuação, para o rodapé. Alfanumérico (2026) só ganha os separadores. */
export function formatarCnpj(doc: string | null): string | null {
  if (!doc || doc.length !== 14) return doc;
  return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
}

/**
 * Domínio sob o qual os portais vivem. Em desenvolvimento é `localhost`, e
 * `jackson.localhost:3010` funciona no navegador sem configurar nada.
 */
export const dominioBase = () =>
  (process.env.DOMINIO_BASE ?? 'localhost').toLowerCase();

/**
 * Validação de CNPJ — exigência do autosserviço (§5.10.2): sem CNPJ não
 * existe subconta no gateway (regra do Banco Central, §8.2), então barrar
 * aqui é o que evita descobrir no suporte.
 *
 * Cobre o formato NOVO da Receita (julho/2026): os 12 primeiros
 * caracteres podem ser letras, e o valor de cada um no cálculo é o código
 * ASCII menos 48 — para dígitos, dá o próprio número; os dois
 * verificadores continuam numéricos e o módulo 11 é o mesmo de sempre.
 */
export function validarCnpj(bruto: string): boolean {
  const s = bruto.toUpperCase().replace(/[.\/\- ]/g, '');
  if (!/^[A-Z0-9]{12}\d{2}$/.test(s)) return false;
  if (/^(.)\1{13}$/.test(s)) return false;   // "00000000000000" e afins

  const valor = (c: string) => c.charCodeAt(0) - 48;
  const dv = (base: string, pesos: number[]) => {
    const soma = [...base].reduce((t, c, i) => t + valor(c) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, ...pesos1];
  return dv(s.slice(0, 12), pesos1) === Number(s[12])
      && dv(s.slice(0, 13), pesos2) === Number(s[13]);
}

/** Só os dígitos — CPF, CEP e telefone chegam do formulário com pontuação. */
export function somenteDigitos(bruto: string): string {
  return bruto.replace(/\D/g, '');
}

/** CPF pelos dois dígitos verificadores (módulo 11). */
export function validarCpf(bruto: string): boolean {
  const s = somenteDigitos(bruto);
  if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
  const dv = (tamanho: number) => {
    const soma = [...s.slice(0, tamanho)].reduce((t, c, i) => t + Number(c) * (tamanho + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(9) === Number(s[9]) && dv(10) === Number(s[10]);
}

/** Telefone brasileiro: DDD válido + 8 ou 9 dígitos. */
export function validarTelefone(bruto: string): boolean {
  const s = somenteDigitos(bruto);
  return (s.length === 10 || s.length === 11) && /^[1-9][1-9]/.test(s);
}

export function validarCep(bruto: string): boolean {
  return /^\d{8}$/.test(somenteDigitos(bruto));
}

/** Endereço do responsável — o que o gateway exige para abrir a subconta (§8.2). */
export interface Endereco {
  cep: string; logradouro: string; numero: string; bairro: string; complemento?: string;
}

/** Mensagem de erro, ou null se o endereço serve para o KYC. */
export function conferirEndereco(e: Endereco): string | null {
  if (!validarCep(e.cep)) return 'CEP inválido — são 8 dígitos.';
  if (!e.logradouro.trim()) return 'Informe o logradouro (rua, avenida…).';
  if (!e.numero.trim()) return 'Informe o número do endereço (ou "s/n").';
  if (!e.bairro.trim()) return 'Informe o bairro.';
  return null;
}

export function normalizarEndereco(e: Endereco): Endereco {
  const complemento = (e.complemento ?? '').trim();
  return {
    cep: somenteDigitos(e.cep), logradouro: e.logradouro.trim(), numero: e.numero.trim(),
    bairro: e.bairro.trim(), ...(complemento ? { complemento } : {}),
  };
}

const RE_DOMINIO = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * O Host quando NÃO é o nosso domínio nem subdomínio dele: um domínio
 * próprio de professor (Fase 2). Devolve o host limpo ou null. Quem diz
 * se ele pertence a algum portal é o banco (`buscarPortalPorDominio`).
 */
export function dominioProprioDoHost(host: string | null, base = dominioBase()): string | null {
  if (!host) return null;
  const limpo = host.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (limpo === base || limpo === `www.${base}` || limpo.endsWith(`.${base}`)) return null;
  if (limpo === 'localhost' || /^[\d.]+$/.test(limpo) || limpo.startsWith('[')) return null;
  return RE_DOMINIO.test(limpo) ? limpo : null;
}

/** Mensagem de erro, ou null se o domínio informado serve como domínio próprio. */
export function conferirDominio(bruto: string, base = dominioBase()): string | null {
  const d = bruto.trim().toLowerCase();
  if (!d) return 'Informe o domínio.';
  if (/^[a-z]+:\/\//.test(d) || d.includes('/')) return 'Só o domínio, sem http:// nem caminho.';
  if (!RE_DOMINIO.test(d)) return 'Domínio inválido — ex.: cursos.seudominio.com.br.';
  if (d === base || d.endsWith(`.${base}`)) return 'Esse endereço já é do nosso domínio — o seu portal já responde nele.';
  return null;
}

/** Cookie que carrega o token da indicação do clique até o cadastro (§5.10.1). */
export const COOKIE_INDICACAO = 'ad_indicacao';

export const GB = 1024 ** 3;

/**
 * Excedente de consumo (§5.10, "cota por plano, excedente cobrado").
 *
 * Cobra por GB INTEIRO acima da cota, arredondando para cima — 100,1 GB
 * numa cota de 100 são 1 GB de excedente, não 0,1: a fatura precisa ser
 * explicável numa linha ("passou 1 GB"), e frações de GB viram centavos
 * que ninguém entende. Armazenamento e banda são somados em GB excedentes
 * e cobrados ao mesmo preço, porque o plano tem um preço de excedente só.
 */
export function calcularExcedente(
  bytesArmazenados: number, bytesTrafegados: number,
  plano: { gbArmazenamento: number; gbBandaMes: number; centavosPorGbExcedente: number },
): { gbExcedentes: number; centavos: number } {
  const sobra = (bytes: number, cotaGb: number) =>
    Math.max(0, Math.ceil(bytes / GB - cotaGb));
  const gbExcedentes = sobra(bytesArmazenados, plano.gbArmazenamento)
                     + sobra(bytesTrafegados, plano.gbBandaMes);
  return { gbExcedentes, centavos: gbExcedentes * plano.centavosPorGbExcedente };
}

/** Primeiro dia do mês de uma data, no formato que a coluna `competencia` usa. */
export function competenciaDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** A competência anterior à de `d` — o mês que se fecha quando `d` é hoje. */
export function competenciaAnterior(d: Date): string {
  return competenciaDe(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

/**
 * Máscara embutida no endereço, ou `null` quando a requisição é do site
 * principal.
 *
 * Regra de ouro: só um rótulo de subdomínio conta. `a.b.dominio` não vira
 * portal `a` — endereço que não sabemos ler é a plataforma, nunca um
 * chute. O formato aceito é o mesmo da restrição `portal_mascara_formato`
 * da migração, para que não exista máscara guardada que este código
 * recuse (ou o contrário).
 */
export function mascaraDoHost(host: string | null, base = dominioBase()): string | null {
  if (!host) return null;

  // Além do domínio, o Host traz porta; atrás de proxy pode vir lista.
  const limpo = host.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (!limpo || limpo.startsWith('[')) return null;   // IPv6 não é portal
  if (limpo === base || limpo === `www.${base}`) return null;
  if (!limpo.endsWith(`.${base}`)) return null;

  const sub = limpo.slice(0, -(base.length + 1));
  if (!sub || sub.includes('.') || sub === 'www') return null;
  if (!/^[a-z0-9]([a-z0-9-]{1,30})?[a-z0-9]$/.test(sub)) return null;

  return sub;
}

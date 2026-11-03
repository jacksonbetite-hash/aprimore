import Link from 'next/link';

/**
 * Elementos visuais puros — sem acesso a servidor, seguros para
 * componente cliente. Se ficassem junto do cabeçalho (que lê a sessão),
 * o driver do banco iria parar no bundle do navegador.
 */

/**
 * Ícones em SVG embutido.
 *
 * O design system pede traço arredondado e peso consistente. Fonte de
 * ícones foi descartada de propósito: quando ela falha em carregar, a
 * tela mostra o NOME do ícone em texto cru ("play_circle") — pior que
 * não mostrar nada. SVG embutido não depende de rede.
 */
const TRACOS: Record<string, React.ReactNode> = {
  balance: <><path d="M12 3v18M7 21h10M12 6 4 8m8-2 8 2" /><path d="M4 8 1.5 14a3.5 3.5 0 0 0 5 0L4 8Z" /><path d="M20 8l-2.5 6a3.5 3.5 0 0 0 5 0L20 8Z" /></>,
  devices: <><rect x="2" y="5" width="15" height="11" rx="2" /><path d="M6 20h7M9.5 16v4" /><rect x="18" y="9" width="4" height="11" rx="1.5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></>,
  play_arrow: <path d="M8 5.5v13l11-6.5-11-6.5Z" />,
  pause: <><path d="M9.5 5v14M14.5 5v14" /></>,
  volume_up: <><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4v-5Z" /><path d="M15.5 9.4a3.6 3.6 0 0 1 0 5.2" /><path d="M18 7a7 7 0 0 1 0 10" /></>,
  volume_off: <><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4v-5Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>,
  play_circle: <><circle cx="12" cy="12" r="9" /><path d="M10.5 8.8v6.4l5-3.2-5-3.2Z" /></>,
  menu_book: <><path d="M12 6.5C10.6 5.3 8.6 4.5 6 4.5c-1 0-2 .1-2.8.3v13c.9-.2 1.8-.3 2.8-.3 2.6 0 4.6.8 6 2 1.4-1.2 3.4-2 6-2 1 0 1.9.1 2.8.3v-13c-.9-.2-1.8-.3-2.8-.3-2.6 0-4.6.8-6 2Z" /><path d="M12 6.5v13" /></>,
  quiz: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9.2 9.6a2.8 2.8 0 1 1 3.6 2.7c-.5.2-.8.6-.8 1.1v.4" /><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" /></>,
  arrow_forward: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  arrow_back: <><path d="M20 12H5" /><path d="m11 6-6 6 6 6" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  check_circle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.7 2.7L16 9.5" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
  chevron_right: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  expand_more: <path d="m5.5 9 6.5 6.5L18.5 9" />,
  lightbulb: <><path d="M9.2 17.5h5.6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.6v.6h5.6v-.6c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" /></>,
  edit_note: <><path d="M3.5 6.5h13M3.5 11.5h9M3.5 16.5h6" /><path d="m20.5 10-6.5 6.5-3 .8.8-3L18.3 8a1.6 1.6 0 0 1 2.2 2.2Z" /></>,
  dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="4.5" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="11" width="7" height="9.5" rx="2" /></>,
  gavel: <><path d="m14.5 8.5-6 6" /><rect x="12.6" y="3.2" width="6.6" height="4.6" rx="1.6" transform="rotate(45 15.9 5.5)" /><rect x="4.8" y="11" width="6.6" height="4.6" rx="1.6" transform="rotate(45 8.1 13.3)" /><path d="M3.5 20.5h9" /></>,
  loyalty: <><path d="m11 3.5-7.5 7.5a2 2 0 0 0 0 2.8l6.7 6.7a2 2 0 0 0 2.8 0l7.5-7.5V5.5a2 2 0 0 0-2-2H11Z" /><circle cx="16.6" cy="7.4" r="1.5" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.5 12a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2-1.2l-.4-2.6h-4l-.4 2.6c-.7.3-1.4.7-2 1.2l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" /></>,
  logout: <><path d="M14.5 8V5.5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V16" /><path d="M10 12h10.5" /><path d="m17.5 8.5 3.5 3.5-3.5 3.5" /></>,
  notifications: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" /><path d="M13.7 19a2 2 0 0 1-3.4 0" /></>,
  school: <><path d="m3 9 9-4.5L21 9l-9 4.5L3 9Z" /><path d="M7 11.2V16c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-4.8" /></>,
  bolt: <path d="M13.5 3 5.5 13.5h5L10 21l8-10.5h-5L13.5 3Z" />,
  replay: <><path d="M12 5V2L8 5.5 12 9V6a6 6 0 1 1-6 6" /></>,
  star: <path d="m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8L12 4Z" />,
  edit: <><path d="M4 20h4.2l10.4-10.4a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" /><path d="m14.5 6.5 3 3" /></>,
  picture_as_pdf: <><rect x="4" y="3" width="13" height="18" rx="2.5" /><path d="M7.5 12.5h1.2a1.2 1.2 0 0 0 0-2.4H7.5v5" /><path d="M12.5 10.1v5h1a1.6 1.6 0 0 0 1.6-1.6v-1.8a1.6 1.6 0 0 0-1.6-1.6h-1Z" /></>,
  library_books: <><rect x="7" y="3.5" width="13" height="14" rx="2.5" /><path d="M4 7v11.5a2 2 0 0 0 2 2h11" /><path d="M10.5 7.5h6M10.5 11h6" /></>,
  schedule: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.3l3.3 2" /></>,
  waves: <><path d="M2.5 8c2 0 2-1.6 4.8-1.6S9.3 8 12 8s2-1.6 4.7-1.6S19.5 8 21.5 8" /><path d="M2.5 13c2 0 2-1.6 4.8-1.6S9.3 13 12 13s2-1.6 4.7-1.6S19.5 13 21.5 13" /><path d="M2.5 18c2 0 2-1.6 4.8-1.6S9.3 18 12 18s2-1.6 4.7-1.6S19.5 18 21.5 18" /></>,
  auto_awesome: <><path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" /><path d="m18.5 15.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" /></>,
  celebration: <><path d="M3.5 20.5 8 8l8 8-12.5 4.5Z" /><path d="M13.5 6.5c.6-1.4 2-2 3.4-1.4M16.5 3.2c.3.9 0 1.9-.8 2.4M19.5 8.5c1.4-.6 2-2 1.4-3.4M20.8 12.5c-.9-.3-1.9 0-2.4.8" /></>,
  error: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.2" /><circle cx="12" cy="16.2" r=".9" fill="currentColor" stroke="none" /></>,
  remove: <path d="M6 12h12" />,
  admin_panel_settings: <><path d="M12 3 5 5.6v5.2c0 4.2 2.9 8.1 7 9.2 1-.3 1.9-.7 2.7-1.3" /><circle cx="17.5" cy="16.5" r="2" /><path d="M17.5 20c-1.6 0-3 .8-3 1.5h6c0-.7-1.4-1.5-3-1.5Z" /></>,
  payments: <><rect x="2.5" y="6.5" width="15" height="10" rx="2.5" /><circle cx="10" cy="11.5" r="2.2" /><path d="M6.5 20h12a3 3 0 0 0 3-3V9.5" /></>,
  verified_user: <><path d="M12 3 5 5.6v5.2c0 4.4 3 8.5 7 9.5 4-1 7-5.1 7-9.5V5.6L12 3Z" /><path d="m9 11.8 2.2 2.2L15.2 10" /></>,
  group: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c0-2.8 2.7-4.5 6-4.5s6 1.7 6 4.5" /><path d="M16 6.2a3.2 3.2 0 0 1 0 6.1M17.5 15.4c2 .6 3.5 1.9 3.5 4.1" /></>,
  account_balance: <><path d="M3.5 9.5h17L12 4 3.5 9.5Z" /><path d="M6 12v6M10 12v6M14 12v6M18 12v6" /><path d="M3.5 20.5h17" /></>,
  public: <><circle cx="12" cy="12" r="8.5" /><path d="M3.6 9.5h16.8M3.6 14.5h16.8" /><path d="M12 3.5c2 2.3 3 5.3 3 8.5s-1 6.2-3 8.5c-2-2.3-3-5.3-3-8.5s1-6.2 3-8.5Z" /></>,
  handshake: <><path d="m9 12.5 2.2 2.2a1.6 1.6 0 0 0 2.3 0l4.5-4.5" /><path d="M3 9.5 6.5 6h4L13 8.2 10.6 10 9 8.5 6.2 11" /><path d="M13.5 6h4L21 9.5v5L18 17.5l-4.5-4.5" /><path d="M3 9.5v5L6 17.5" /></>,
  work: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V7" /></>,
  description: <><path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L14 3.5Z" /><path d="M13.5 3.8V9h5" /><path d="M8.5 13h7M8.5 16.5h5" /></>,
  workspace_premium: <><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.5-1.5 7 5-2.4 5 2.4-1.5-7" /></>,
  timer: <><circle cx="12" cy="13.5" r="7" /><path d="M12 9.5v4M9.5 3.5h5" /></>,
  insights: <><path d="M4 19V5" /><path d="M4 16.5 9 11l3.5 3.5L20 7" /><circle cx="20" cy="7" r="1.6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8v.6" /></>,
  /* O contato do professor na vitrine do portal: envelope. */
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m3.8 7 8.2 6 8.2-6" /></>,
  format_quote: (
    <>
      <path d="M9.5 6.5C7 7.6 5.5 9.9 5.5 12.6v4.9h5.2v-5.2H8.3c0-1.9.6-3.4 1.9-4.3Z" />
      <path d="M18 6.5c-2.5 1.1-4 3.4-4 6.1v4.9h5.2v-5.2h-2.4c0-1.9.6-3.4 1.9-4.3Z" />
    </>
  ),

  /* Sumário do vade-mécum: cada norma se reconhece pela forma antes de ser
     lida. São 22 códigos numa lista — sem ícone próprio, quem consulta o
     mesmo todo dia teria de ler 22 nomes para achar o de sempre. */
  history_edu: <><path d="M4 5.5c2.6-.9 5.4-.9 8 0v11c-2.6-.9-5.4-.9-8 0v-11Z" /><path d="M12 5.5c1-.4 2-.6 3-.7" /><circle cx="17.5" cy="14.5" r="4" /><path d="M17.5 12.8v1.9l1.3.9" /></>,
  policy: <><path d="M12 3.2 5 6v6c0 4 3 7 7 8.8" /><path d="M19 12V6l-7-2.8" /><circle cx="16.5" cy="15.5" r="3" /><path d="m18.7 17.7 2.3 2.3" /></>,
  receipt_long: <><path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17Z" /><path d="M9 8h6M9 11.5h6M9 15h4" /></>,
  child_care: <><circle cx="12" cy="12" r="7.5" /><path d="M19.5 9.5a2.2 2.2 0 0 1 0 5" /><path d="M4.5 9.5a2.2 2.2 0 0 0 0 5" /><path d="M9.5 11v.6M14.5 11v.6" /><path d="M9.8 14.8a3 3 0 0 0 4.4 0" /></>,
  elderly: <><circle cx="12" cy="5" r="2.2" /><path d="M12 8.5c-2 0-3.2 1.3-3.5 3.2l-.7 4.3h2l.7 4.5h3l.5-8" /><path d="M17.5 10.5v10" /></>,
  foundation: <><path d="M3.5 20.5h17" /><path d="M3.5 16.5h17" /><path d="M6.5 16.5v-5M12 16.5v-5M17.5 16.5v-5" /><path d="m12 3.5 8 5H4l8-5Z" /></>,
  shield_person: <><path d="M12 3.2 5 6v6.2c0 4.4 3 7.5 7 8.8 4-1.3 7-4.4 7-8.8V6l-7-2.8Z" /><circle cx="12" cy="10.5" r="2" /><path d="M8.8 16.5a3.4 3.4 0 0 1 6.4 0" /></>,
  report: <><path d="M8.5 3.5h7L20.5 8.5v7L15.5 20.5h-7L3.5 15.5v-7L8.5 3.5Z" /><path d="M12 8v4.5" /><circle cx="12" cy="16" r=".9" fill="currentColor" stroke="none" /></>,
  badge: <><rect x="3" y="6.5" width="18" height="14" rx="2.5" /><path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" /><circle cx="12" cy="12" r="2" /><path d="M8.8 17.5a3.4 3.4 0 0 1 6.4 0" /></>,
  fact_check: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M7 9h6M7 12.5h4" /><path d="m14 15.2 1.8 1.8 3.2-3.5" /></>,
  medication: <><rect x="5.5" y="9" width="13" height="11.5" rx="3" /><path d="M12 12.5v4.5M9.8 14.8h4.4" /><path d="M7 6h10l-1 3H8L7 6Z" /></>,
  savings: <><path d="M4 12.5a6 6 0 0 1 6-6h3a6 6 0 0 1 5.6 3.9l1.9.9v3.4l-2 .4a6 6 0 0 1-2 2.4v2h-3v-1.2h-3V20H7.5v-2A6 6 0 0 1 4 12.5Z" /><circle cx="15.5" cy="12" r=".9" fill="currentColor" stroke="none" /><path d="M9 4.5a2.5 2.5 0 0 1 4 1.8" /></>,
  /* Ações das tabelas da retaguarda: o botão é o ícone, e a palavra
     aparece ao passar o mouse (ver .btn-icone em globals.css). */
  delete: <><path d="M5 7h14" /><path d="M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7l.8 11.6a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" /><path d="M10.5 11v5.5M13.5 11v5.5" /></>,
  visibility: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3.2" /></>,
  visibility_off: <><path d="M4 4.5l15.5 15" /><path d="M9.5 6c.8-.3 1.6-.5 2.5-.5 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.4 4" /><path d="M6.6 8.3A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.3 3.7-.8" /><path d="M9.9 10.2a3.2 3.2 0 0 0 4.3 4.4" /></>,
  open_in_new: <><path d="M14 4.5h5.5V10" /><path d="m19.5 4.5-8 8" /><path d="M18 14v4.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h4.5" /></>,
  inventory_2: <><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M3.5 7.5 5 4h14l1.5 3.5" /><path d="M10 12h4" /></>,
  block: <><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>,
  more_time: <><path d="M20.5 12a8.5 8.5 0 1 1-4.2-7.3" /><path d="M12 7v5.3l3 1.9" /><path d="M18.5 3.5v5M16 6h5" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  save: <><path d="M5.5 4.5h10L19.5 8.5v11a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-14a1 1 0 0 1 1-1Z" /><path d="M8.5 4.5v5h6v-5" /><rect x="8" y="13.5" width="8" height="5.5" rx="1" /></>,
  person: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-3.4 3.4-5.5 7.5-5.5s7.5 2.1 7.5 5.5" /></>,
  palette: <><path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-1 2-1.8 0-1.5-1.6-1.6-1.6-3 0-1 .8-1.7 1.9-1.7h1.8a4.4 4.4 0 0 0 4.4-4.4C20.5 6.3 16.7 3.5 12 3.5Z" /><circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none" /><circle cx="16" cy="9.6" r="1.1" fill="currentColor" stroke="none" /></>,
  movie: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.5 9.5h17" /><path d="M8 5.7 6.5 9.5M13 5.7 11.5 9.5M18 5.7 16.5 9.5" /></>,
  calculate: <><rect x="4.5" y="3" width="15" height="18" rx="2" /><path d="M8 7.5h8" /><path d="M8 12h2.5M13.5 12h2.5M8 16.5h2.5M15.2 15v3M13.7 16.5h3" /></>,
  timeline: <><path d="M3 15.5h4l3-8 4 11 3-7h4" /><circle cx="7" cy="15.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="17" cy="11.5" r="1.3" fill="currentColor" stroke="none" /></>,
  print: <><path d="M7 8.5V4h10v4.5" /><rect x="4" y="8.5" width="16" height="8" rx="2" /><path d="M7 13.5h10v6H7z" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M14 10a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.2-1.2" /></>,
  /* Estados do exercício passo a passo e da lista do módulo: errou
     (círculo com x), começada (pausa), ainda não aberta (círculo vazio)
     e o marcador do resultado (bandeira). */
  cancel: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  pause_circle: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7M14 8.5v7" /></>,
  radio_button_unchecked: <circle cx="12" cy="12" r="9" />,
  flag: <><path d="M5.5 21V4" /><path d="M5.5 4.5h12l-2.5 4 2.5 4h-12" /></>,

  /* Menus dos painéis da empresa e do colaborador.
     Os cinco primeiros JÁ eram usados por `app/empresa/layout.tsx` sem
     existir aqui: `Icone` devolve null para nome desconhecido (é de
     propósito — nunca mostrar "monitoring" em texto cru na tela), então
     metade do menu do RH vinha sem ícone nenhum, e ninguém via erro. */
  route: <><circle cx="6.5" cy="18" r="2.4" /><circle cx="17.5" cy="6" r="2.4" /><path d="M8.9 18h4.6a3.4 3.4 0 0 0 0-6.8h-3a3.4 3.4 0 0 1 0-6.8h4.6" /></>,
  groups: <><circle cx="9.5" cy="9" r="3.1" /><path d="M3.5 19.5c0-2.9 2.7-4.6 6-4.6s6 1.7 6 4.6" /><circle cx="17.6" cy="8.6" r="2.2" /><path d="M17.8 13.3c2.2.3 3.7 1.7 3.7 3.7" /></>,
  assignment_turned_in: <><path d="M9 4.5H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2H15" /><rect x="9" y="2.8" width="6" height="3.4" rx="1.2" /><path d="m8.6 13.2 2.6 2.6 4.8-5.1" /></>,
  monitoring: <><path d="M4 3.5v17h16" /><path d="m7.5 15.5 3.6-4.2 3 2.6 4.4-6" /><circle cx="18.5" cy="7.9" r="1.3" fill="currentColor" stroke="none" /></>,
  web: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3.5 9.5h17" /><circle cx="6.6" cy="7" r=".8" fill="currentColor" stroke="none" /><circle cx="9.2" cy="7" r=".8" fill="currentColor" stroke="none" /></>,
  /* Quatro quadrados iguais — "tudo o que existe", ao lado do `route`,
     que é o caminho de uma pessoa só. Não repete o `dashboard`, cujos
     retângulos são de tamanhos diferentes. */
  grid_view: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  /* Biblioteca da empresa (§ acervo): o item, o envio e o filtro. */
  article: <><rect x="4.5" y="3.5" width="15" height="17" rx="2.5" /><path d="M8 8.5h8M8 12h8M8 15.5h5" /></>,
  upload_file: <><path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" /><path d="M13.5 3.5 19 9h-4a1.5 1.5 0 0 1-1.5-1.5V3.5Z" /><path d="M12 17.5v-6.8M9.4 13.3 12 10.7l2.6 2.6" /></>,
  filter_list: <path d="M4 7h16M7 12h10M10 17h4" />,
  /* Primeiro degrau da trilha de migalhas (/entrar). Telhado em traço
     aberto e porta fechada — o mesmo peso das outras casas do conjunto. */
  home: <><path d="m3.5 10.5 8.5-7 8.5 7" /><path d="M5.5 9.2V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.2" /><path d="M10 20.5v-5.5h4v5.5" /></>,
  /* Página pública da universidade corporativa (app/PaginaEmpresa.tsx),
     layout de 10/09/2026. Os nomes são os do Material Symbols que o
     protótipo usava; o traço é o da casa. */
  favorite: <path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.6 12 20 12 20Z" />,
  trending_up: <><path d="m3.5 16.5 6-6 4 4 7-7" /><path d="M15.5 7.5h5v5" /></>,
  military_tech: <><circle cx="12" cy="15.5" r="4.5" /><path d="M9.2 11.5 6.5 3.5h11l-2.7 8" /><path d="M10 3.5v6.3M14 3.5v6.3" /></>,
  psychology: <><path d="M9.5 20.5v-3.2H6.3L4.5 13 6 12.8V10a6.5 6.5 0 0 1 13 0c0 2.4-1.2 4-2.5 5.3v5.2" /><circle cx="12.5" cy="10.5" r="2.2" /><path d="M12.5 6.8v1.5M12.5 12.7v1.5M8.8 10.5h1.5M14.7 10.5h1.5" /></>,
  play_lesson: <><path d="M5 4.5h11a2 2 0 0 1 2 2V11" /><path d="M5 4.5v13a2 2 0 0 0 2 2h4" /><circle cx="16.5" cy="17" r="4" /><path d="m15.5 15.3 2.6 1.7-2.6 1.7v-3.4Z" /></>,
  card_membership: <><rect x="3" y="4.5" width="18" height="11" rx="2" /><path d="M3.5 9.5h17" /><path d="M9.5 15.5v5l2.5-1.5 2.5 1.5v-5" /></>,
  verified: <><path d="m12 3 2 1.6 2.5-.3.9 2.4 2.2 1.2-.4 2.5 1.5 2.1-1.8 1.8v2.6l-2.5.6-1.3 2.2-2.4-.8-2.4.8-1.3-2.2-2.5-.6v-2.6L4.7 14.7l1.5-2.1-.4-2.5L8 8.9l.9-2.4 2.5.3L12 3Z" /><path d="m8.8 12.3 2.3 2.3 4.2-4.6" /></>,
  auto_stories: <><path d="M12 19.5c-1.4-1.2-3.4-2-6-2-1 0-1.9.1-2.8.3v-13c.9-.2 1.8-.3 2.8-.3 2.6 0 4.6.8 6 2v13Z" /><path d="M12 6.5c1.4-1.2 3.4-2 6-2 1 0 1.9.1 2.8.3v13c-.9-.2-1.8-.3-2.8-.3-2.6 0-4.6.8-6 2" /><path d="m14.5 11 4-5.5" /></>,
  smartphone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></>,
  cloud_sync: <><path d="M7.5 18.5a4.5 4.5 0 0 1-.9-8.9 6 6 0 0 1 11.5 1.3 3.8 3.8 0 0 1 .4 7.6" /><path d="M9.8 14.2a2.6 2.6 0 0 1 4.4-.7" /><path d="M14.2 11.8v1.9h-1.9" /><path d="M14.2 17.8a2.6 2.6 0 0 1-4.4.7" /><path d="M9.8 20.2v-1.9h1.9" /></>,
  download_for_offline: <><circle cx="12" cy="12" r="9" /><path d="M12 6.5v7M9 11l3 3 3-3" /><path d="M8.5 17h7" /></>,
  touch_app: <><path d="M9 11.5V6.5a2.5 2.5 0 0 1 5 0V12" /><path d="M14 12v-1l3.2 1a2.5 2.5 0 0 1 1.7 2.7l-.6 4.2a2.5 2.5 0 0 1-2.5 2.1h-4.3a2.5 2.5 0 0 1-2-1L6.5 16.5a1.4 1.4 0 0 1 2.1-1.8L9 15.5v-4" /><path d="M6.2 6.5a5.5 5.5 0 0 1 10.6 0" /></>,
  notifications_active: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" /><path d="M13.7 19a2 2 0 0 1-3.4 0" /><path d="M3.5 7.5a8.5 8.5 0 0 1 2.4-4M20.5 7.5a8.5 8.5 0 0 0-2.4-4" /></>,
  analytics: <><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M8 16v-3M12 16V8M16 16v-5" /></>,
  hub: <><circle cx="12" cy="5.5" r="2.2" /><circle cx="5.5" cy="17" r="2.2" /><circle cx="18.5" cy="17" r="2.2" /><circle cx="12" cy="12.5" r="2.4" /><path d="M12 7.7v2.4M10 13.9l-2.8 1.6M14 13.9l2.8 1.6" /></>,
  security: <><path d="M12 3 5 5.6v5.2c0 4.4 3 8.5 7 9.5 4-1 7-5.1 7-9.5V5.6L12 3Z" /><path d="M12 3v17.3M5.2 11.5h13.6" /></>,
  integration_instructions: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M9.5 3v2.5M14.5 3v2.5" /><path d="m9.5 10-2.5 2.2 2.5 2.2M14.5 10l2.5 2.2-2.5 2.2M13 9l-2 6.5" /></>,
  support_agent: <><path d="M5 13.5V11a7 7 0 0 1 14 0v2.5" /><rect x="3.5" y="12.5" width="3.5" height="5" rx="1.5" /><rect x="17" y="12.5" width="3.5" height="5" rx="1.5" /><path d="M13 20.5h2.5a3 3 0 0 0 3-3" /></>,
  calendar_month: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" /></>,
  /* Painel da empresa (/empresa/site e /empresa/colaboradores) — cinco
     nomes que as telas já pediam sem existir aqui (a chave, o endereço, o
     copiar e as duas ações de pessoa), e que por isso saíam em branco. */
  key: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12h9M17.5 12v3M20.5 12v2.2" /></>,
  language: <><circle cx="12" cy="12" r="8.5" /><path d="M3.6 12h16.8M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5s1.2-6.2 3.6-8.5Z" /></>,
  content_copy: <><rect x="8.5" y="8.5" width="11" height="12.5" rx="2" /><path d="M5.5 15.5h-.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5" /></>,
  person_add: <><circle cx="10" cy="8" r="3.5" /><path d="M3 20c0-3.3 3.1-5.5 7-5.5 1.2 0 2.3.2 3.3.6" /><path d="M18 14v6M15 17h6" /></>,
  person_off: <><circle cx="10" cy="8" r="3.5" /><path d="M3 20c0-3.3 3.1-5.5 7-5.5 1.2 0 2.3.2 3.3.6" /><path d="m15.5 15.5 5 5M20.5 15.5l-5 5" /></>,
};

export function Icone(
  { nome, tamanho = 22, className }: { nome: string; tamanho?: number; className?: string },
) {
  const traco = TRACOS[nome];
  if (!traco) return null;              // nunca mostra o nome do ícone em texto
  return (
    <svg
      className={className ? `ico ${className}` : 'ico'}
      width={tamanho} height={tamanho} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      {traco}
    </svg>
  );
}

/**
 * A marca — o símbolo da lâmpada e o nome, lado a lado.
 *
 * A LÂMPADA É A DO LAYOUT DE 09/09/2026 e vale para a plataforma inteira:
 * ladrilho de canto arredondado na tinta da casa, a lâmpada em traço
 * branco dentro e um halo roxo embaixo. Onde a marca aparecer — topo,
 * rodapé, aba do navegador (`app/icon.svg`, o mesmo desenho) — é este
 * símbolo, e não uma variação por tela.
 *
 * Continua em SVG embutido, e não em imagem: assim a cor sai de
 * `--primary-container`, que o portal de cada professor sobrescreve com a
 * cor dele, e a marca nunca depende de uma requisição de rede para
 * aparecer.
 *
 * `nome` troca o rótulo — no portal de um professor, a marca é a dele
 * (§5.10). `assinatura` é a linha miúda embaixo do nome ("por Aprimore o
 * Saber"): quem opera o portal, dito onde a pessoa olha primeiro. Não é
 * enfeite — é a mesma informação que o rodapé legal carrega, e ela só faz
 * sentido quando o nome em cima é de OUTRA pessoa.
 */
export function Marca({ href = '/', nome, assinatura }: {
  href?: string; nome?: string; assinatura?: string | null;
}) {
  return (
    <Link className="marca" href={href}>
      <svg className="marca-simbolo" width="40" height="40" viewBox="0 0 40 40"
           aria-hidden="true" focusable="false">
        <rect width="40" height="40" rx="12" fill="var(--primary-container)" />
        <path
          d="M20 10.5a6.6 6.6 0 0 0-3.9 11.94c.6.44.97 1.14.97 1.89v.42h5.86v-.42c0-.75.36-1.45.97-1.89A6.6 6.6 0 0 0 20 10.5Z"
          fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"
        />
        <path d="M17.6 27.8h4.8M18.6 30.4h2.8" fill="none" stroke="#fff"
              strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="marca-nomes">
        <span className="rotulo">{nome ?? 'Aprimore o Saber'}</span>
        {assinatura && <span className="marca-assinatura">{assinatura}</span>}
      </span>
    </Link>
  );
}

/* ==================================================================
   Botões de ação das tabelas da retaguarda
   ------------------------------------------------------------------
   Numa linha de tabela, a palavra ocupa mais espaço do que informa:
   com quatro ações a coluna "Ações" ficava mais larga que o próprio
   dado. Aqui a ação é o ícone, e a palavra volta ao passar o mouse (e
   ao focar pelo teclado). A palavra continua existindo para quem usa
   leitor de tela — em `aria-label`, não escondida.
   ================================================================== */

type VarianteIcone = 'contorno' | 'primario' | 'perigo';

const classeIcone = (v: VarianteIcone, extra?: string) =>
  ['btn-icone', v !== 'contorno' ? `btn-icone-${v}` : '', extra].filter(Boolean).join(' ');

export function BotaoIcone({
  icone, rotulo, variante = 'contorno', tipo = 'submit', desabilitado, aoClicar,
}: {
  icone: string;
  /** A palavra que o botão substitui: aparece no hover e no leitor de tela. */
  rotulo: string;
  variante?: VarianteIcone;
  tipo?: 'submit' | 'button';
  desabilitado?: boolean;
  aoClicar?: () => void;
}) {
  return (
    <button className={classeIcone(variante)} type={tipo} aria-label={rotulo}
            disabled={desabilitado} onClick={aoClicar}>
      <Icone nome={icone} tamanho={20} />
      <span className="dica-icone" aria-hidden="true">{rotulo}</span>
    </button>
  );
}

/** A mesma coisa, quando a ação é navegar. `externo` abre noutra aba. */
export function LinkIcone({
  href, icone, rotulo, variante = 'contorno', externo,
}: {
  href: string; icone: string; rotulo: string;
  variante?: VarianteIcone; externo?: boolean;
}) {
  const conteudo = (
    <>
      <Icone nome={icone} tamanho={20} />
      <span className="dica-icone" aria-hidden="true">{rotulo}</span>
    </>
  );
  return externo
    ? <a className={classeIcone(variante)} href={href} target="_blank" rel="noreferrer"
         aria-label={rotulo}>{conteudo}</a>
    : <Link className={classeIcone(variante)} href={href} aria-label={rotulo}>{conteudo}</Link>;
}

/**
 * Edição de nome e ordem na própria linha da tabela (área, assunto,
 * categoria).
 *
 * Antes os dois campos ficavam sempre abertos dentro da coluna de ações,
 * e ninguém os reconhecia como "editar": pareciam parte do desenho da
 * tabela. Agora a linha mostra um lápis; clicar abre os campos. É
 * `<details>`, e não estado de React, porque não há nada a sincronizar —
 * abrir e fechar é trabalho do navegador, e assim a tabela inteira
 * continua sendo componente de servidor.
 */
export function EdicaoNaLinha({
  acao, nome, ordem, oQue, children,
}: {
  acao: (dados: FormData) => Promise<void>;
  nome: string; ordem: number;
  /** Aparece no rótulo: "Editar a área Direito Penal". */
  oQue: string;
  /** Os campos ocultos que identificam a linha (id, portalId, materiaId…). */
  children?: React.ReactNode;
}) {
  return (
    <details className="edicao-linha">
      <summary className="btn-icone" aria-label={`Editar ${oQue}`}>
        <Icone nome="edit" tamanho={20} />
        <span className="dica-icone" aria-hidden="true">Editar</span>
      </summary>
      <form action={acao} className="edicao-campos">
        {children}
        <label>
          Nome
          <input name="nome" defaultValue={nome} required maxLength={120}
                 aria-label={`Nome — ${oQue}`} />
        </label>
        <label>
          Ordem
          <input name="ordem" type="number" defaultValue={ordem} aria-label={`Ordem — ${oQue}`} />
        </label>
        <BotaoIcone icone="check" rotulo="Salvar" variante="primario" />
      </form>
    </details>
  );
}

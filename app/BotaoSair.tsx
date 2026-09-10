import { Icone } from './ui.tsx';
import { sair } from './acoes-auth.ts';

/**
 * "Sair" no canto superior direito — o mesmo lugar em todos os painéis.
 *
 * A saída já existia no pé da barra lateral, mas é lá embaixo que ninguém
 * procura: o canto superior direito é onde a mão vai primeiro, por hábito
 * de todo site (é onde o cabeçalho público já põe o "Sair"). Nos painéis
 * que têm barra superior o botão entra junto do nome do usuário; nos que
 * não têm (admin, professor, empresa) ele vai solto no topo do conteúdo,
 * com `className="sair-topo"`.
 *
 * O do rodapé da lateral continua onde estava: quem já se acostumou com
 * ele não perde o caminho.
 */
export default function BotaoSair({ className }: { className?: string }) {
  return (
    <form action={sair} className={className}>
      <button className="btn btn-contorno btn-sm" type="submit">
        <Icone nome="logout" tamanho={18} /> Sair
      </button>
    </form>
  );
}

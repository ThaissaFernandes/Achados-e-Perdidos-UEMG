import { CheckCircle2, Clock, PackageCheck, HelpCircle } from 'lucide-react';
import { obterChaveStatus, ESTILOS_STATUS, ROTULOS_STATUS } from '../utils/status';

const ICONES = {
  disponivel: CheckCircle2,
  analise: Clock,
  devolvido: PackageCheck,
  outro: HelpCircle,
};

// Selo de status reutilizável: cor + ícone + texto (nunca só cor), para atender
// à visibilidade do estado (Nielsen 1) e à acessibilidade para daltônicos.
export default function StatusBadge({ status, className = '' }) {
  const chave = obterChaveStatus(status);
  const Icone = ICONES[chave];

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${ESTILOS_STATUS[chave]} ${className}`}
    >
      <Icone size={12} aria-hidden="true" />
      {ROTULOS_STATUS[chave] === 'Indefinido' && status ? status : ROTULOS_STATUS[chave]}
    </span>
  );
}

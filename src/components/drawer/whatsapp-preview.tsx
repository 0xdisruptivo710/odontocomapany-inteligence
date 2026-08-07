import { Check } from 'lucide-react';
import { signMessage } from '@/lib/validation';
import { UNITS, type UnitKey } from '@/lib/units';

/**
 * Como a mensagem vai chegar no celular do paciente, com a assinatura já
 * aplicada. O prefixo aparece aqui de propósito: quem aprova precisa ver que
 * a mensagem sai no nome do atendente, não como se fosse de um sistema.
 */
export function WhatsappPreview({
  text,
  signature,
  unit,
}: {
  text: string;
  signature: string | null | undefined;
  unit: UnitKey;
}) {
  const full = signMessage(signature, text);
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label-section">Como o paciente vai ver</span>
        <span className="text-[11px] text-subtle-foreground">
          de {UNITS[unit].whatsappFrom}
        </span>
      </div>

      <div className="rounded-lg bg-[#E5DDD5] p-3 dark:bg-[#0B141A]">
        <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-tr-sm bg-[#D9FDD3] px-2.5 py-1.5 shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
          <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-[#111B21]">
            {full || <span className="text-[#667781]">A mensagem aparece aqui</span>}
          </p>
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <span className="text-[10px] text-[#667781]">{hora}</span>
            <Check className="h-3 w-3 text-[#667781]" />
          </div>
        </div>
      </div>
    </div>
  );
}

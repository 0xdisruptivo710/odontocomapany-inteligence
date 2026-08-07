import { AlertCircle, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MSG_MAX } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ValidationResult } from '@/lib/validation';

export function MessageEditor({
  value,
  onChange,
  validation,
}: {
  value: string;
  onChange: (v: string) => void;
  validation: ValidationResult;
}) {
  const len = value.trim().length;
  const over = len > MSG_MAX;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label-section">Mensagem</span>
        <span
          className={cn(
            'font-mono text-[11px]',
            over ? 'text-destructive' : 'text-subtle-foreground',
          )}
        >
          {len}/{MSG_MAX}
        </span>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Texto que será enviado ao paciente"
        className={cn(validation.errors.length > 0 && 'border-destructive/50')}
      />

      {validation.errors.map((err) => (
        <p key={err} className="flex items-start gap-1.5 text-[12px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {err}
        </p>
      ))}
      {validation.warnings.map((w) => (
        <p key={w} className="flex items-start gap-1.5 text-[12px] text-[#92400E]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {w}
        </p>
      ))}
    </div>
  );
}

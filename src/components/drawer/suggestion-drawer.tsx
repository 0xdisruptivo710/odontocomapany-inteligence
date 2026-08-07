import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Megaphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageEditor } from './message-editor';
import { WhatsappPreview } from './whatsapp-preview';
import { UnitBadge, ConfidenceBadge, ScenarioBadge } from '@/components/table/badges';
import { useApprove } from '@/hooks/use-approve';
import { useReject } from '@/hooks/use-reject';
import type { PanelMapping } from '@/hooks/use-panel-mapping';
import type { TagsCatalog } from '@/hooks/use-tags-catalog';
import { validateMessage } from '@/lib/validation';
import { asArray, asObject } from '@/lib/jsonb';
import { COLUMN_NAMES, UNITS, attendantById, columnLeaf } from '@/lib/units';
import { TAG_TAXONOMY_FLAT } from '@/lib/constants';
import { anonymizePhone, formatDateTime } from '@/lib/format';
import type { SessionMeta, SuggestionRow } from '@/lib/types';

export function SuggestionDrawer({
  row,
  open,
  onOpenChange,
  mapping,
  tagsCatalog,
}: {
  row: SuggestionRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mapping?: PanelMapping;
  tagsCatalog?: TagsCatalog;
}) {
  const approve = useApprove();
  const reject = useReject();

  const [text, setText] = useState('');
  const [column, setColumn] = useState<string>('');
  const [tag, setTag] = useState<string>('');

  useEffect(() => {
    if (!row) return;
    setText(row.human_message_override ?? row.message_sent ?? '');
    setColumn(columnLeaf(row.column_applied));
    setTag(row.tag_applied ?? '');
  }, [row]);

  const validation = useMemo(() => validateMessage(text), [text]);

  // As colunas jsonb voltam do Supabase como STRING (o n8n grava com
  // JSON.stringify). Sem normalizar, `current_tag_names.join()` estoura e o
  // bloco do card some sem avisar. Ver src/lib/jsonb.ts.
  const meta = asObject<SessionMeta>(row?.raw_session_meta);
  const tagNames = asArray<string>(row?.current_tag_names);
  const attendant = attendantById(row?.responsible_user_id ?? null);
  const cardStatus = (meta.card?.status ?? '').toUpperCase();
  const cardFinal = cardStatus === 'WON' || cardStatus === 'LOST';

  if (!row) return null;

  const unit = UNITS[row.unit_key];
  const wantsMessage = row.suggest_message === true;
  const blocked = wantsMessage && !validation.valid;
  const busy = approve.isPending || reject.isPending;

  // Etiquetas que a IA pode sugerir mas que ainda não existem na conta: a API
  // não cria definição de etiqueta, só aplica.
  const tagMissing = tag && tagsCatalog ? !tagsCatalog.byName.has(tag.toLowerCase().trim()) : false;

  async function onApprove() {
    if (!row) return;
    const out = await approve.mutateAsync({
      row,
      override: wantsMessage ? validation.cleaned.trim() : null,
      columnOverride: column || null,
      tagOverride: tag || null,
      mapping,
      tagsCatalog,
    });
    const falhas = Object.entries(out.errors).filter(([, v]) => !v.ok);
    if (out.status === 'executed' && falhas.length === 0) {
      toast.success('Aplicado no CRM');
    } else if (out.status === 'executed') {
      toast.warning(`Aplicado em parte: ${falhas.map(([k]) => k).join(', ')} falhou`);
    } else {
      toast.error(`Não foi aplicado: ${falhas.map(([, v]) => v.error).join(' · ')}`);
    }
    onOpenChange(false);
  }

  async function onReject() {
    if (!row) return;
    await reject.mutateAsync([row]);
    toast.success('Sugestão descartada');
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-[17px]">{row.customer_name ?? 'Paciente sem nome'}</SheetTitle>
            <UnitBadge unit={row.unit_key} />
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px]">
            <span>{anonymizePhone(row.customer_phone)}</span>
            <span className="text-subtle-foreground">·</span>
            <span>{formatDateTime(row.classified_at)}</span>
            {attendant && (
              <>
                <span className="text-subtle-foreground">·</span>
                <span>atendendo: {attendant.signature}</span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-7 py-6">
          {/* Leitura da IA */}
          <section className="flex flex-col gap-2">
            <span className="label-section">Leitura da IA</span>
            <div className="flex flex-wrap items-center gap-2">
              <ScenarioBadge scenario={row.scenario} />
              <ConfidenceBadge value={row.confidence} />
            </div>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              {row.reasoning_short || 'Sem justificativa registrada.'}
            </p>
          </section>

          {/* Origem do lead — contexto que só existe nesta conta */}
          {meta.utm?.campaign || meta.utm?.headline ? (
            <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3.5">
              <span className="flex items-center gap-1.5 label-section">
                <Megaphone className="h-3.5 w-3.5" />
                Entrou por anúncio
              </span>
              {meta.utm?.campaign && (
                <p className="text-[13px] font-medium">{meta.utm.campaign}</p>
              )}
              {meta.utm?.headline && (
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {meta.utm.headline.slice(0, 320)}
                </p>
              )}
            </section>
          ) : null}

          <Separator />

          {/* Card */}
          <section className="flex flex-col gap-2.5">
            <span className="label-section">Card no funil</span>
            <p className="text-[13px] text-muted-foreground">
              {meta.card?.exists
                ? `Hoje em "${meta.card.current_step ?? 'etapa desconhecida'}" no painel ${unit.panelLabel}.`
                : `Ainda não tem card no painel ${unit.panelLabel}. Aprovar vai criar um.`}
            </p>

            {cardFinal && (
              <p className="flex items-start gap-1.5 rounded-md bg-warning-soft px-3 py-2 text-[12.5px] text-[#92400E]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                O card está como {cardStatus === 'WON' ? 'ganho' : 'perdido'} e não aceita mudança de
                etapa. A etiqueta e a mensagem seguem normalmente.
                {unit.autoLossDays
                  ? ` Em ${unit.name} o painel fecha card sozinho depois de ${unit.autoLossDays} dias parado, então isso raramente significa recusa.`
                  : ''}
              </p>
            )}

            <Select value={column} onValueChange={setColumn} disabled={cardFinal}>
              <SelectTrigger aria-label="Coluna de destino">
                <SelectValue placeholder="Não mover o card" />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_NAMES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11.5px] text-subtle-foreground">
              Desmarcou e Faltou não estão aqui: quem registra falta é o Painel de Agendamento.
            </p>
          </section>

          {/* Etiqueta */}
          <section className="flex flex-col gap-2">
            <span className="label-section">Etiqueta</span>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger aria-label="Etiqueta">
                <SelectValue placeholder="Não etiquetar" />
              </SelectTrigger>
              <SelectContent>
                {TAG_TAXONOMY_FLAT.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tagMissing && (
              <p className="flex items-start gap-1.5 text-[12px] text-[#92400E]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                "{tag}" ainda não existe na conta. Precisa ser criada na tela de etiquetas do WTS
                antes de poder ser aplicada.
              </p>
            )}
            {tagNames.length > 0 && (
              <p className="text-[11.5px] text-subtle-foreground">Já tem: {tagNames.join(', ')}</p>
            )}
          </section>

          {/* Mensagem */}
          {wantsMessage && (
            <>
              <Separator />
              <MessageEditor value={text} onChange={setText} validation={validation} />
              <WhatsappPreview
                text={validation.cleaned}
                signature={attendant?.signature}
                unit={row.unit_key}
              />
            </>
          )}
        </div>

        <div className="sticky bottom-0 mt-auto flex justify-end gap-2 border-t border-border bg-surface px-7 py-4">
          <Button variant="outline" onClick={onReject} disabled={busy}>
            {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Descartar
          </Button>
          <Button onClick={onApprove} disabled={busy || blocked}>
            {approve.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {wantsMessage ? 'Aprovar e enviar' : 'Aplicar no CRM'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

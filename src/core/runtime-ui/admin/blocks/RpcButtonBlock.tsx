/** SDUI RpcButtonBlock — invokes an admin_action via the unified hook. */
import { Button } from "@/components/ui/button";
import { useAdminAction } from "../hooks/useAdminAction";
import type { RpcButtonBlock as RpcButtonBlockT } from "../schemas";
import type { AdminBlockContext } from "../registry";

export function RpcButtonBlock({
  block, ctx,
}: { block: RpcButtonBlockT; ctx: AdminBlockContext }) {
  const { props } = block;
  const locale = ctx.locale ?? "ar";
  const label = props.label_i18n[locale] ?? props.label_i18n.ar;
  const action = useAdminAction(props.rpc_name);

  const onClick = () => {
    if (props.confirmation_required) {
      const msg = props.confirmation_message_i18n?.[locale] ?? "هل أنت متأكد؟";
      if (!window.confirm(msg)) return;
    }
    action.mutate({ record_id: ctx.record?.id as string | undefined });
  };

  return (
    <Button
      type="button"
      variant={props.destructive ? "destructive" : "secondary"}
      onClick={onClick}
      disabled={action.isPending}
      className="rounded-2xl"
    >
      {action.isPending ? "..." : label}
    </Button>
  );
}

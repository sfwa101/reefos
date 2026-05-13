/** SDUI TableColumnBlock — renders a single cell value per row. */
import type { TableColumnBlock as TableColumnBlockT } from "../schemas";
import type { AdminBlockContext } from "../registry";

function format(value: unknown, formatter: TableColumnBlockT["props"]["formatter"]): string {
  if (value == null) return "—";
  switch (formatter) {
    case "currency":
      return typeof value === "number"
        ? new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(value)
        : String(value);
    case "date":
      return new Date(String(value)).toLocaleDateString("ar-SA");
    case "datetime":
      return new Date(String(value)).toLocaleString("ar-SA");
    case "boolean":
      return value ? "✓" : "✗";
    case "json":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

export function TableColumnBlock({
  block, ctx,
}: { block: TableColumnBlockT; ctx: AdminBlockContext }) {
  const v = ctx.record?.[block.props.key];
  if (block.props.formatter === "badge") {
    return (
      <span className="px-2 py-0.5 rounded-lg bg-muted/60 text-[11px] font-medium">
        {format(v, "text")}
      </span>
    );
  }
  return <span className="text-[13px]">{format(v, block.props.formatter)}</span>;
}

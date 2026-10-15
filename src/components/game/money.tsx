import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("vi-VN");

/**
 * Số tiền: chữ số dùng font pixel, ký hiệu "đ" dùng font retro (Press Start 2P
 * không có glyph "đ").
 */
export function Money({
  value,
  className,
  digitsClassName,
}: {
  value: number;
  className?: string;
  digitsClassName?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className={cn("font-pixel tabular-nums", digitsClassName)}>{nf.format(value)}</span> đ
    </span>
  );
}

import { cn } from "@/lib/utils";

export function ElovateWordmark({
  className,
  sizeClassName,
  inline = false,
}: {
  className?: string;
  sizeClassName?: string;
  inline?: boolean;
}) {
  const Tag = inline ? "span" : "p";

  return (
    <Tag
      className={cn(
        inline ? "inline whitespace-nowrap" : "leading-none whitespace-nowrap",
        sizeClassName,
        className,
      )}
    >
      <span className="font-bold">elo</span>
      <span className="font-normal">vate</span>
    </Tag>
  );
}

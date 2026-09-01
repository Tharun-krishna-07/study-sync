import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

type Props = {
  name?: string | null;
  url?: string | null;
  presence?: string | null;
  speaking?: boolean;
  className?: string;
};

const RING: Record<string, string> = {
  online: "bg-status-active",
  idle: "bg-status-idle",
  dnd: "bg-destructive",
  offline: "bg-status-offline",
};

export function UserAvatar({ name, url, presence, speaking, className }: Props) {
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar
        className={cn(
          "size-9 border border-border transition-shadow",
          speaking && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          className,
        )}
      >
        {url ? <AvatarImage src={url} alt={name ?? "Member"} /> : null}
        <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {presence ? (
        <span
          aria-label={presence}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
            RING[presence] ?? RING.offline,
          )}
        />
      ) : null}
    </span>
  );
}

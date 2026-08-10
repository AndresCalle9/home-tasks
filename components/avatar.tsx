import { tint } from "@/lib/color";
import type { Member } from "@/lib/data/members";

export function Avatar({ member, size = 40 }: { member: Member; size?: number }) {
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: tint(member.color, 0.22),
        color: member.color,
        borderColor: tint(member.color, 0.45),
      }}
    >
      {initial}
    </div>
  );
}

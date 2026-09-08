// A circular avatar: the user's photo (served through the authenticated /api/avatar proxy) or,
// when there's none, their initials on a deterministic colour. Plain <img> on purpose — the
// proxy is auth-gated by cookie, which next/image's server-side optimiser wouldn't send.

const COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#059669",
  "#d97706",
  "#db2777",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
];

export type AvatarUser = { id: string; name: string; avatarPathname?: string | null };

export function Avatar({
  user,
  size = 32,
  ring = true,
}: {
  user: AvatarUser;
  size?: number;
  ring?: boolean;
}) {
  const ringClass = ring ? "ring-1 ring-border" : "";
  if (user.avatarPathname) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${user.id}`}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${ringClass}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${ringClass}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: colorFor(user.id),
      }}
    >
      {initials(user.name)}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

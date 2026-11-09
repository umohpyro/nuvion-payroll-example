const FILLS = ["bg-cat-pink", "bg-cat-coral", "bg-cat-plum", "bg-cat-teal", "bg-cat-blue", "bg-cat-green", "bg-cat-brown"];
const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" };

/** Initials on a coloured circle. The colour comes from the name, so a person keeps the same hue on every page. */
export function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof SIZES }) {
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % FILLS.length;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-extrabold text-white ${FILLS[hue]} ${SIZES[size]}`}>
      {initials}
    </span>
  );
}

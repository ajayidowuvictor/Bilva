import Link from "next/link";

// The Bilva logo mark with the wordmark, used in every page header.
export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand">
      <img
        src="/logo-mark.png"
        alt=""
        width={50}
        height={34}
        className="brand-mark"
      />
      <span>Bilva</span>
    </Link>
  );
}

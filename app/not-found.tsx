import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <div className="container stack" style={{ maxWidth: 440 }}>
        <h1>Page not found</h1>
        <p className="muted">
          We could not find that page, or it belongs to another account.
        </p>
        <div>
          <Link href="/" className="btn btn-primary">
            Back to Bilva
          </Link>
        </div>
      </div>
    </main>
  );
}

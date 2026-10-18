import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Brand from "@/components/Brand";

// Header and page frame for every signed-in page.
export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Brand href="/projects" />
          <div className="header-right">
            <Link
              href="/account"
              className="header-email"
              title="Your account"
            >
              {user.email}
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn btn-ghost btn-small">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>
        <div className="container">{children}</div>
      </main>
    </>
  );
}

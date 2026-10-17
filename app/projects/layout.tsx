import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsLayout({
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
          <Link href="/projects" className="brand">
            Bil<span>va</span>
          </Link>
          <div className="header-right">
            <span className="header-email">{user.email}</span>
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

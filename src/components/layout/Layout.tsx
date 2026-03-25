import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout() {
  const isHome = useLocation().pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      {!isHome && <Header />}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

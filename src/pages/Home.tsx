import { useNavigate, Link } from "react-router-dom";
import { SearchBar } from "../components/search/SearchBar";
import { BrandWordmark } from "../components/layout/BrandWordmark";
import { useRandomCard } from "../api/hooks";

export function Home() {
  const navigate = useNavigate();
  const { refetch, isFetching } = useRandomCard();

  const handleRandom = async () => {
    const result = await refetch();
    if (result.data?.data) {
      navigate(`/cards/${result.data.data.card_number}`);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-28 h-52 w-52 -translate-x-[135%] rounded-full bg-accent/6 blur-3xl" />
        <div className="absolute left-1/2 top-20 h-60 w-60 -translate-x-1/2 rounded-full bg-accent/4 blur-3xl" />
        <div className="absolute right-1/2 top-32 h-56 w-56 translate-x-[145%] rounded-full bg-link/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        <div className="-mt-16 mb-8 text-center">
          <h1 className="px-3 text-[clamp(1.85rem,11vw,3.75rem)] font-extrabold leading-[0.95] tracking-[-0.04em] sm:px-2 sm:text-6xl sm:tracking-[-0.055em]">
            <BrandWordmark glow />
          </h1>
          <p className="text-text-secondary mt-3 text-lg">
            The best OPTCG search
          </p>
        </div>

        <div className="w-full max-w-2xl">
          <SearchBar autoFocus />
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            onClick={handleRandom}
            disabled={isFetching}
            className="text-link hover:text-link-hover hover:underline"
          >
            Random Card
          </button>
          <span className="text-text-muted">&middot;</span>
          <Link to="/search/syntax">Syntax Guide</Link>
          <span className="text-text-muted">&middot;</span>
          <Link to="/advanced">Advanced Search</Link>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-[13px] text-text-muted">
          <HomeLink to="/sets" label="Browse Sets" desc="All sets and products" />
          <HomeLink to="/formats" label="Formats" desc="Legality & banlists" />
          <HomeLink to="/don" label="DON!! Cards" desc="DON card browser" />
          <HomeLink to="/api" label="API" desc="Developer documentation" />
        </div>
      </div>
    </div>
  );
}

function HomeLink({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link to={to} className="hover:no-underline group">
      <span className="text-link group-hover:text-link-hover group-hover:underline block font-medium">{label}</span>
      <span className="text-text-muted text-xs">{desc}</span>
    </Link>
  );
}

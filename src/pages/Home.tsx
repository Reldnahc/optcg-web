import { useNavigate, Link } from "react-router-dom";
import { SearchBar } from "../components/search/SearchBar";
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
    <div className="flex flex-col items-center justify-center px-4 min-h-screen">
      <div className="-mt-16 mb-8 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          <span className="text-accent">poneglyph.one</span>
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

import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto bg-bg-secondary">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-8 text-center text-sm md:grid md:max-w-[42rem] md:grid-cols-[12rem_12rem_12rem] md:justify-center md:items-start md:justify-items-center md:gap-x-12 md:gap-y-8">
          <div className="w-full max-w-[12rem] text-center">
            <h4 className="text-text-primary font-semibold mb-2">Explore</h4>
            <ul className="space-y-1 text-text-muted">
              <li><Link to="/" className="hover:text-text-secondary">Home</Link></li>
              <li><Link to="/search?q=" className="hover:text-text-secondary">Search</Link></li>
              <li><Link to="/advanced" className="hover:text-text-secondary">Advanced Search</Link></li>
              <li><Link to="/random-redirect" className="hover:text-text-secondary">Random Card</Link></li>
            </ul>
          </div>
          <div className="w-full max-w-[12rem] text-center">
            <h4 className="text-text-primary font-semibold mb-2">Reference</h4>
            <ul className="space-y-1 text-text-muted">
              <li><Link to="/sets" className="hover:text-text-secondary">All Sets</Link></li>
              <li><Link to="/formats" className="hover:text-text-secondary">Formats</Link></li>
              <li><Link to="/don" className="hover:text-text-secondary">DON!! Cards</Link></li>
            </ul>
          </div>
          <div className="w-full max-w-[12rem] text-center">
            <h4 className="text-text-primary font-semibold mb-2">Resources</h4>
            <ul className="space-y-1 text-text-muted">
              <li><Link to="/search/syntax" className="hover:text-text-secondary">Syntax Guide</Link></li>
              <li><Link to="/api" className="hover:text-text-secondary">API Docs</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-border text-center">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-text-muted">
            <Link to="/terms" className="hover:text-text-secondary">Terms of Use</Link>
            <Link to="/privacy" className="hover:text-text-secondary">Privacy Policy</Link>
          </div>
          <div className="text-xs text-text-muted leading-relaxed">
          <p>Card images and data &copy; Bandai Co., Ltd. Prices provided by TCGPlayer. poneglyph.one is not produced by, endorsed by, supported by, or affiliated with Bandai or TCGPlayer.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

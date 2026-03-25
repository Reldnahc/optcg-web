import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto bg-bg-secondary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="text-text-primary font-semibold mb-2">Cards</h4>
            <ul className="space-y-1 text-text-muted">
              <li><Link to="/search?q=" className="hover:text-text-secondary">Search</Link></li>
              <li><Link to="/advanced" className="hover:text-text-secondary">Advanced Search</Link></li>
              <li><Link to="/search/syntax" className="hover:text-text-secondary">Syntax Guide</Link></li>
              <li><Link to="/sets" className="hover:text-text-secondary">All Sets</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-text-primary font-semibold mb-2">Game Info</h4>
            <ul className="space-y-1 text-text-muted">
              <li><Link to="/formats" className="hover:text-text-secondary">Formats</Link></li>
              <li><Link to="/don" className="hover:text-text-secondary">DON!! Cards</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-text-primary font-semibold mb-2">Developers</h4>
            <ul className="space-y-1 text-text-muted">
              <li><Link to="/api" className="hover:text-text-secondary">API Docs</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-border text-xs text-text-muted leading-relaxed">
          <p>Card images and data &copy; Bandai Co., Ltd. Prices provided by TCGPlayer. poneglyph.one is not produced by, endorsed by, supported by, or affiliated with Bandai or TCGPlayer.</p>
        </div>
      </div>
    </footer>
  );
}

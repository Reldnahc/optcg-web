import { Link } from "react-router-dom";
import { useSets } from "../api/hooks";
import { PageContainer } from "../components/layout/PageContainer";

export function SetBrowser() {
  const { data, isLoading } = useSets();

  if (isLoading) return <div className="p-8 text-text-muted">Loading sets...</div>;

  const sets = data?.data ?? [];

  return (
    <PageContainer title="All Sets" subtitle={`${sets.length} sets found`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border text-[12px] uppercase tracking-wider">
            <th className="pb-2 font-medium">Set</th>
            <th className="pb-2 font-medium text-right">Cards</th>
            <th className="pb-2 font-medium text-right hidden sm:table-cell">Released</th>
          </tr>
        </thead>
        <tbody>
          {sets.map((set) => (
            <tr key={set.code} className="border-b border-border/50 hover:bg-bg-hover/50">
              <td className="py-2">
                <Link to={`/sets/${set.code}`} className="hover:underline">
                  {set.name}
                </Link>
                <span className="text-text-muted ml-2 text-xs font-mono">{set.code}</span>
              </td>
              <td className="py-2 text-right text-text-muted">{set.card_count}</td>
              <td className="py-2 text-right text-text-muted hidden sm:table-cell">
                {set.released_at
                  ? new Date(set.released_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageContainer>
  );
}

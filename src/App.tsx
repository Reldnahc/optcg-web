import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { CardPage } from "./pages/CardPage";
import { SetBrowser } from "./pages/SetBrowser";
import { SetPage } from "./pages/SetPage";
import { FormatBrowser } from "./pages/FormatBrowser";
import { FormatPage } from "./pages/FormatPage";
import { DonBrowser } from "./pages/DonBrowser";
import { SyntaxHelp } from "./pages/SyntaxHelp";
import { AdvancedSearch } from "./pages/AdvancedSearch";
import { ApiDocs } from "./pages/ApiDocs";
import { RandomRedirect } from "./pages/RandomRedirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/search/syntax" element={<SyntaxHelp />} />
            <Route path="/advanced" element={<AdvancedSearch />} />
            <Route path="/cards/:card_number" element={<CardPage />} />
            <Route path="/sets" element={<SetBrowser />} />
            <Route path="/sets/:set_code" element={<SetPage />} />
            <Route path="/formats" element={<FormatBrowser />} />
            <Route path="/formats/:name" element={<FormatPage />} />
            <Route path="/don" element={<DonBrowser />} />
            <Route path="/random-redirect" element={<RandomRedirect />} />
            <Route path="/api" element={<ApiDocs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

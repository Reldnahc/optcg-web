import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeckPageLoadingState } from "./components/deck/DeckPageLoadingState";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
const Search = lazy(async () => import("./pages/Search").then((module) => ({ default: module.Search })));
const CardPage = lazy(async () => import("./pages/CardPage").then((module) => ({ default: module.CardPage })));
const SetBrowser = lazy(async () => import("./pages/SetBrowser").then((module) => ({ default: module.SetBrowser })));
const SetPage = lazy(async () => import("./pages/SetPage").then((module) => ({ default: module.SetPage })));
const FormatBrowser = lazy(async () => import("./pages/FormatBrowser").then((module) => ({ default: module.FormatBrowser })));
const FormatPage = lazy(async () => import("./pages/FormatPage").then((module) => ({ default: module.FormatPage })));
const DonBrowser = lazy(async () => import("./pages/DonBrowser").then((module) => ({ default: module.DonBrowser })));
const SyntaxHelp = lazy(async () => import("./pages/SyntaxHelp").then((module) => ({ default: module.SyntaxHelp })));
const AdvancedSearch = lazy(async () => import("./pages/AdvancedSearch").then((module) => ({ default: module.AdvancedSearch })));
const ApiDocs = lazy(async () => import("./pages/ApiDocs").then((module) => ({ default: module.ApiDocs })));
const MissionStatement = lazy(async () => import("./pages/MissionStatement").then((module) => ({ default: module.MissionStatement })));
const PrivacyPolicy = lazy(async () => import("./pages/PrivacyPolicy").then((module) => ({ default: module.PrivacyPolicy })));
const RandomRedirect = lazy(async () => import("./pages/RandomRedirect").then((module) => ({ default: module.RandomRedirect })));
const ReportIssue = lazy(async () => import("./pages/ReportIssue").then((module) => ({ default: module.ReportIssue })));
const ScanProgress = lazy(async () => import("./pages/ScanProgress").then((module) => ({ default: module.ScanProgress })));
const TermsOfUse = lazy(async () => import("./pages/TermsOfUse").then((module) => ({ default: module.TermsOfUse })));
const DeckLibraryPage = lazy(async () => import("./pages/DeckLibrary").then((module) => ({ default: module.DeckLibraryPage })));
const NewDeckRedirect = lazy(async () => import("./pages/DeckBuilder").then((module) => ({ default: module.NewDeckRedirect })));
const DeckEditPage = lazy(async () => import("./pages/DeckBuilder").then((module) => ({ default: module.DeckEditPage })));
const LegacyDeckViewRedirect = lazy(async () => import("./pages/DeckBuilder").then((module) => ({ default: module.LegacyDeckViewRedirect })));
const DeckViewPage = lazy(async () => import("./pages/DeckBuilder").then((module) => ({ default: module.DeckViewPage })));

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
        <Suspense fallback={<RouteLoadingFallback />}>
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
              <Route path="/mission" element={<MissionStatement />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/report" element={<ReportIssue />} />
              <Route path="/scans" element={<ScanProgress />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/decks" element={<Suspense fallback={<DeckRouteLoadingFallback title="Loading deck library" />}><DeckLibraryPage /></Suspense>} />
              <Route path="/decks/new" element={<Suspense fallback={<DeckRouteLoadingFallback title="Creating deck" description="Preparing the editor." />}><NewDeckRedirect /></Suspense>} />
              <Route path="/decks/edit/:hash" element={<Suspense fallback={<DeckRouteLoadingFallback title="Loading deck" description="Preparing the editor." />}><DeckEditPage /></Suspense>} />
              <Route path="/decks/view/:hash" element={<Suspense fallback={<DeckRouteLoadingFallback title="Loading deck" description="Preparing the viewer." />}><LegacyDeckViewRedirect /></Suspense>} />
              <Route path="/decks/:hash" element={<Suspense fallback={<DeckRouteLoadingFallback title="Loading deck" description="Preparing the viewer." />}><DeckViewPage /></Suspense>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 text-sm text-slate-400 sm:px-6 lg:px-8">
      Loading...
    </div>
  );
}

function DeckRouteLoadingFallback({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return <DeckPageLoadingState title={title} description={description} compact />;
}

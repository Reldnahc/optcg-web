import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiRootFetch } from "./client";
import type {
  Card,
  CardDetail,
  CardSearchResponse,
  SetInfo,
  SetDetail,
  SetSort,
  SortOrder,
  DonCard,
  FormatInfo,
  FormatDetail,
  OpenApiDocument,
} from "./types";

export function useCardSearch(params: Record<string, string>) {
  return useQuery({
    queryKey: ["cards", params],
    queryFn: () => apiFetch<CardSearchResponse<Card>>("/cards", params),
    enabled: Object.values(params).some(Boolean),
  });
}

export function useCard(cardNumber: string, lang = "en") {
  return useQuery({
    queryKey: ["card", cardNumber, lang],
    queryFn: () =>
      apiFetch<{ data: CardDetail }>(`/cards/${cardNumber}`, { lang }),
  });
}

export function useAutocomplete(q: string) {
  return useQuery({
    queryKey: ["autocomplete", q],
    queryFn: () => apiFetch<{ data: string[] }>("/cards/autocomplete", { q }),
    enabled: q.length >= 2,
    placeholderData: (previousData) => previousData,
  });
}

export function useSets(params?: { sort?: SetSort; order?: SortOrder }) {
  return useQuery({
    queryKey: ["sets", params],
    queryFn: () => apiFetch<{ data: SetInfo[] }>("/sets", params),
  });
}

export function useSet(setCode: string) {
  return useQuery({
    queryKey: ["set", setCode],
    queryFn: () => apiFetch<{ data: SetDetail }>(`/sets/${setCode}`),
  });
}

export function useRandomCard(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["random", params],
    queryFn: () => apiFetch<{ data: Card }>("/random", params),
    enabled: false, // manual trigger only
  });
}

export function useDonCards(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["don", params],
    queryFn: () => apiFetch<{ data: DonCard[] }>("/don", params),
  });
}

export function useFormats() {
  return useQuery({
    queryKey: ["formats"],
    queryFn: () => apiFetch<{ data: FormatInfo[] }>("/formats"),
  });
}

export function useFormat(name: string) {
  return useQuery({
    queryKey: ["format", name],
    queryFn: () => apiFetch<{ data: FormatDetail }>(`/formats/${name}`),
  });
}

export function useOpenApiDocument() {
  return useQuery({
    queryKey: ["openapi"],
    queryFn: () => apiRootFetch<OpenApiDocument>("/openapi.json"),
    staleTime: 60 * 60 * 1000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type {
  Card,
  CardDetail,
  SetInfo,
  SetDetail,
  DonCard,
  FormatInfo,
  FormatDetail,
  PaginatedResponse,
} from "./types";

export function useCardSearch(params: Record<string, string>) {
  return useQuery({
    queryKey: ["cards", params],
    queryFn: () => apiFetch<PaginatedResponse<Card>>("/cards", params),
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
  });
}

export function useSets() {
  return useQuery({
    queryKey: ["sets"],
    queryFn: () => apiFetch<{ data: SetInfo[] }>("/sets"),
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

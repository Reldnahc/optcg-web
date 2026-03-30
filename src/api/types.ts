export interface CardProduct {
  name: string;
  set_codes: string[] | null;
  released_at: string | null;
}

export interface Card {
  card_number: string;
  name: string;
  language: string;
  set: string;
  set_name: string;
  product: string;
  released_at: string | null;
  released: boolean;
  card_type: string;
  rarity: string | null;
  color: string[];
  cost: number | null;
  power: number | null;
  counter: number | null;
  life: number | null;
  attribute: string[] | null;
  types: string[];
  effect: string | null;
  trigger: string | null;
  block: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  label?: string | null;
  variant_index?: number;
  variant_product_name?: string | null;
}

export interface CardVariantPrice {
  market_price: string | null;
  low_price: string | null;
  mid_price: string | null;
  high_price: string | null;
  tcgplayer_url: string | null;
}

export interface CardVariant {
  variant_index: number;
  label: string | null;
  is_default: boolean;
  artist: string | null;
  product: {
    name: string | null;
    set_code: string | null;
    released_at: string | null;
  };
  media: {
    image_url: string | null;
    thumbnail_url: string | null;
    scan_url: string | null;
    scan_thumbnail_url: string | null;
  };
  market: {
    tcgplayer_url: string | null;
    prices: Record<string, CardVariantPrice>;
  };
}

export interface CardDetail extends Card {
  variants: CardVariant[];
  legality: Record<string, { status: string; banned_at?: string; reason?: string; max_copies?: number; paired_with?: string[] }>;
  available_languages: string[];
}

export interface SetInfo {
  code: string;
  name: string;
  released_at: string | null;
  card_count: number;
}

export interface SetDetail {
  code: string;
  name: string;
  released_at: string | null;
  card_count: number;
  products: CardProduct[];
  cards: Card[];
}

export interface DonCard {
  id: string;
  character: string;
  finish: string;
  image_url: string | null;
  product_name: string;
}

export interface FormatInfo {
  name: string;
  description: string | null;
  has_rotation: boolean;
  legal_blocks: number;
  ban_count: number;
}

export interface FormatDetail {
  name: string;
  description: string | null;
  has_rotation: boolean;
  blocks: { block: string; legal: boolean; rotated_at: string | null }[];
  bans: { card_number: string; type: string; banned_at: string; reason?: string; max_copies?: number; paired_with?: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export type JsonSchema = Record<string, unknown>;

export interface OpenApiMediaType {
  schema?: JsonSchema;
}

export interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
}

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  tags?: OpenApiTag[];
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: Record<string, unknown>;
}

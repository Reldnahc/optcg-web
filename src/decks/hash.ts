import { CARD_DICTIONARY, CARD_INDEX_BY_NUMBER } from "./cardDictionary.generated";
import type { Deck, DeckEntry } from "./types";

const RAW_DECK_HASH_PREFIX = "!";
const PREVIOUS_DECK_HASH_VERSION = "d5";
const PREVIOUS_RAW_DECK_HASH_VERSION = "d5r";
const LEGACY_DECK_HASH_VERSION = "d4";
const LEGACY_RAW_DECK_HASH_VERSION = "d3";
const COMPRESSION_TIMEOUT_MS = 1200;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const STANDARD_FAMILIES = ["P", "OP", "ST", "EB", "PRB", "EX"] as const;
const DICTIONARY_ID_BITS = 14;
const MAX_DICTIONARY_ID = (1 << DICTIONARY_ID_BITS) - 1;
const SMALL_DELTA_MAX = 16;
const MEDIUM_DELTA_MAX = 272;

export function createEmptyDeck(): Deck {
  const now = Date.now();
  return {
    leader: null,
    main: [],
    don: null,
    created_at: now,
    updated_at: now,
  };
}

export async function encodeDeckHash(deck: Deck): Promise<string> {
  const writer = new BitWriter();

  writer.writeBit(deck.leader ? 1 : 0);
  writer.writeBit(deck.don ? 1 : 0);
  writer.writeBit(0);
  writer.writeBit(deck.format ? 1 : 0);

  if (deck.leader) {
    writeAbsoluteEntry(writer, deck.leader, false);
  }
  if (deck.don) {
    writeAbsoluteEntry(writer, deck.don, false);
  }
  if (deck.format) {
    writeString(writer, deck.format);
  }

  const mainEntries = [...deck.main]
    .filter((entry) => entry.count > 0)
    .sort(compareEntriesForEncoding);

  writer.writeVarUint(mainEntries.length);

  let previousKnownId: number | null = null;
  for (const entry of mainEntries) {
    previousKnownId = writePackedMainEntry(writer, entry, previousKnownId);
  }

  const rawPayload = writer.finish();

  try {
    const compressedPayload = await withTimeout(compressPayload(rawPayload), COMPRESSION_TIMEOUT_MS);
    return uint8ToBase64Url(compressedPayload);
  } catch {
    return `${RAW_DECK_HASH_PREFIX}${uint8ToBase64Url(rawPayload)}`;
  }
}

export async function decodeDeckHash(hash: string): Promise<Deck> {
  if (hash.startsWith(RAW_DECK_HASH_PREFIX)) {
    return decodePackedDeck(base64UrlToUint8(hash.slice(RAW_DECK_HASH_PREFIX.length)));
  }

  if (!hash.includes(".")) {
    const payload = base64UrlToUint8(hash);
    try {
      const bytes = await withTimeout(decompressPayload(payload), COMPRESSION_TIMEOUT_MS);
      return decodePackedDeck(bytes);
    } catch {
      return decodePackedDeck(payload);
    }
  }

  const [version, payload] = hash.split(".", 2);
  if (!payload) {
    throw new Error("Unsupported deck format");
  }

  if (version === PREVIOUS_DECK_HASH_VERSION || version === PREVIOUS_RAW_DECK_HASH_VERSION) {
    const bytes = version === PREVIOUS_DECK_HASH_VERSION
      ? await withTimeout(decompressPayload(base64UrlToUint8(payload)), COMPRESSION_TIMEOUT_MS)
      : base64UrlToUint8(payload);
    return decodeDictionaryDeck(bytes);
  }

  if (version === LEGACY_DECK_HASH_VERSION || version === LEGACY_RAW_DECK_HASH_VERSION) {
    const bytes = version === LEGACY_DECK_HASH_VERSION
      ? await withTimeout(decompressPayload(base64UrlToUint8(payload)), COMPRESSION_TIMEOUT_MS)
      : base64UrlToUint8(payload);
    return decodeLegacyDeck(bytes);
  }

  throw new Error("Unsupported deck format");
}

export function deckHashToEditPath(hash: string, savedDeckId?: string | null) {
  return savedDeckId
    ? `/decks/edit/${hash}?saved=${encodeURIComponent(savedDeckId)}`
    : `/decks/edit/${hash}`;
}

export function deckHashToViewPath(hash: string, savedDeckId?: string | null) {
  return savedDeckId
    ? `/decks/${hash}?saved=${encodeURIComponent(savedDeckId)}`
    : `/decks/${hash}`;
}

function decodePackedDeck(bytes: Uint8Array): Deck {
  const reader = new BitReader(bytes);
  const hasLeader = reader.readBit() === 1;
  const hasDon = reader.readBit() === 1;
  const hasName = reader.readBit() === 1;
  const hasFormat = reader.readBit() === 1;
  const now = Date.now();

  const leader = hasLeader ? readAbsoluteEntry(reader, false, 1) : null;
  const don = hasDon ? { ...readAbsoluteEntry(reader, false, 10), count: 10 } : null;
  if (hasName) {
    readString(reader);
  }
  const format = hasFormat ? readString(reader) : undefined;
  const mainCount = reader.readVarUint();
  const main: DeckEntry[] = [];

  let previousKnownId: number | null = null;
  for (let i = 0; i < mainCount; i += 1) {
    const [entry, nextKnownId] = readPackedMainEntry(reader, previousKnownId);
    main.push(entry);
    previousKnownId = nextKnownId;
  }

  return {
    leader,
    don,
    main,
    format: format?.trim() || undefined,
    created_at: now,
    updated_at: now,
  };
}

function writeAbsoluteEntry(writer: BitWriter, entry: DeckEntry, includeCount: boolean) {
  const cardNumber = entry.card_number.toUpperCase();
  const cardId = getDictionaryId(cardNumber);

  writer.writeBit(cardId != null ? 0 : 1);
  if (cardId != null) {
    writer.writeBits(cardId, DICTIONARY_ID_BITS);
  } else {
    writeString(writer, cardNumber);
  }

  writer.writeBit(entry.variant_index != null ? 1 : 0);
  if (entry.variant_index != null) {
    writer.writeVarUint(entry.variant_index);
  }

  if (includeCount) {
    const normalizedCount = Math.max(1, Math.min(8, Math.trunc(entry.count)));
    writer.writeBits(normalizedCount - 1, 3);
  }
}

function readAbsoluteEntry(reader: BitReader, includeCount: boolean, defaultCount: number): DeckEntry {
  const isRaw = reader.readBit() === 1;
  const cardNumber = isRaw
    ? readString(reader).toUpperCase()
    : readDictionaryCard(reader.readBits(DICTIONARY_ID_BITS));

  const hasVariant = reader.readBit() === 1;
  const variantIndex = hasVariant ? reader.readVarUint() : undefined;
  const count = includeCount ? reader.readBits(3) + 1 : defaultCount;

  return {
    card_number: cardNumber,
    count,
    ...(variantIndex != null ? { variant_index: variantIndex } : {}),
  };
}

function writePackedMainEntry(writer: BitWriter, entry: DeckEntry, previousKnownId: number | null) {
  const cardNumber = entry.card_number.toUpperCase();
  const cardId = getDictionaryId(cardNumber);

  writer.writeBit(cardId != null ? 0 : 1);
  if (cardId != null) {
    if (previousKnownId == null || cardId <= previousKnownId) {
      writer.writeBits(3, 2);
      writer.writeBits(cardId, DICTIONARY_ID_BITS);
    } else {
      const delta = cardId - previousKnownId;
      if (delta <= SMALL_DELTA_MAX) {
        writer.writeBits(0, 2);
        writer.writeBits(delta - 1, 4);
      } else if (delta <= MEDIUM_DELTA_MAX) {
        writer.writeBits(1, 2);
        writer.writeBits(delta - SMALL_DELTA_MAX - 1, 8);
      } else {
        writer.writeBits(2, 2);
        writer.writeVarUint(delta);
      }
    }
  } else {
    writeString(writer, cardNumber);
  }

  writer.writeBit(entry.variant_index != null ? 1 : 0);
  if (entry.variant_index != null) {
    writer.writeVarUint(entry.variant_index);
  }

  const normalizedCount = Math.max(1, Math.min(8, Math.trunc(entry.count)));
  writer.writeBits(normalizedCount - 1, 3);

  return cardId ?? previousKnownId;
}

function readPackedMainEntry(reader: BitReader, previousKnownId: number | null): [DeckEntry, number | null] {
  const isRaw = reader.readBit() === 1;
  let cardNumber = "";
  let nextKnownId = previousKnownId;

  if (isRaw) {
    cardNumber = readString(reader).toUpperCase();
  } else {
    const mode = reader.readBits(2);
    let cardId: number;

    if (mode === 0) {
      if (previousKnownId == null) {
        throw new Error("Missing base dictionary id for delta entry");
      }
      cardId = previousKnownId + reader.readBits(4) + 1;
    } else if (mode === 1) {
      if (previousKnownId == null) {
        throw new Error("Missing base dictionary id for delta entry");
      }
      cardId = previousKnownId + SMALL_DELTA_MAX + reader.readBits(8) + 1;
    } else if (mode === 2) {
      if (previousKnownId == null) {
        throw new Error("Missing base dictionary id for delta entry");
      }
      cardId = previousKnownId + reader.readVarUint();
    } else {
      cardId = reader.readBits(DICTIONARY_ID_BITS);
    }

    cardNumber = readDictionaryCard(cardId);
    nextKnownId = cardId;
  }

  const hasVariant = reader.readBit() === 1;
  const variantIndex = hasVariant ? reader.readVarUint() : undefined;
  const count = reader.readBits(3) + 1;

  return [
    {
      card_number: cardNumber,
      count,
      ...(variantIndex != null ? { variant_index: variantIndex } : {}),
    },
    nextKnownId,
  ];
}

function decodeDictionaryDeck(bytes: Uint8Array): Deck {
  const reader = new BitReader(bytes);
  const hasLeader = reader.readBit() === 1;
  const hasDon = reader.readBit() === 1;
  const hasName = reader.readBit() === 1;
  const hasFormat = reader.readBit() === 1;
  const now = Date.now();

  const leader = hasLeader ? readDictionaryEntry(reader, false, 1) : null;
  const don = hasDon ? { ...readDictionaryEntry(reader, false, 10), count: 10 } : null;
  if (hasName) {
    readString(reader);
  }
  const format = hasFormat ? readString(reader) : undefined;
  const mainCount = reader.readVarUint();
  const main: DeckEntry[] = [];

  for (let i = 0; i < mainCount; i += 1) {
    main.push(readDictionaryEntry(reader, true, 1));
  }

  main.sort((a, b) => a.card_number.localeCompare(b.card_number, undefined, { numeric: true }));

  return {
    leader,
    don,
    main,
    format: format?.trim() || undefined,
    created_at: now,
    updated_at: now,
  };
}

function readDictionaryEntry(reader: BitReader, includeCount: boolean, defaultCount: number): DeckEntry {
  const mode = reader.readBit();
  let cardNumber = "";

  if (mode === 0) {
    cardNumber = readDictionaryCard(reader.readVarUint());
  } else {
    cardNumber = readString(reader).toUpperCase();
  }

  const hasVariant = reader.readBit() === 1;
  const variantIndex = hasVariant ? reader.readVarUint() : undefined;
  const count = includeCount ? reader.readBits(3) + 1 : defaultCount;

  return {
    card_number: cardNumber,
    count,
    ...(variantIndex != null ? { variant_index: variantIndex } : {}),
  };
}

function compareEntriesForEncoding(a: DeckEntry, b: DeckEntry) {
  const leftId = getDictionaryId(a.card_number.toUpperCase());
  const rightId = getDictionaryId(b.card_number.toUpperCase());

  if (leftId != null && rightId != null) {
    return leftId - rightId;
  }
  if (leftId != null) {
    return -1;
  }
  if (rightId != null) {
    return 1;
  }
  return a.card_number.localeCompare(b.card_number, undefined, { numeric: true });
}

function getDictionaryId(cardNumber: string) {
  const cardId = CARD_INDEX_BY_NUMBER.get(cardNumber);
  if (cardId == null || cardId > MAX_DICTIONARY_ID) {
    return null;
  }
  return cardId;
}

function readDictionaryCard(cardId: number) {
  const cardNumber = CARD_DICTIONARY[cardId];
  if (!cardNumber) {
    throw new Error("Unknown card dictionary id");
  }
  return cardNumber;
}

function decodeLegacyDeck(bytes: Uint8Array): Deck {
  const reader = new BitReader(bytes);
  const hasLeader = reader.readBit() === 1;
  const hasDon = reader.readBit() === 1;
  const hasName = reader.readBit() === 1;
  const hasFormat = reader.readBit() === 1;
  const now = Date.now();

  const leader = hasLeader ? readLegacyEntry(reader, false, 1) : null;
  const don = hasDon ? { ...readLegacyEntry(reader, false, 10), count: 10 } : null;
  if (hasName) {
    readString(reader);
  }
  const format = hasFormat ? readString(reader) : undefined;
  const mainCount = reader.readVarUint();
  const main: DeckEntry[] = [];

  for (let i = 0; i < mainCount; i += 1) {
    main.push(readLegacyEntry(reader, true, 1));
  }

  return {
    leader,
    don,
    main,
    format: format?.trim() || undefined,
    created_at: now,
    updated_at: now,
  };
}

function readLegacyEntry(reader: BitReader, includeCount: boolean, defaultCount: number): DeckEntry {
  const mode = reader.readBits(2);
  let cardNumber = "";

  if (mode === 0) {
    const familyIndex = reader.readBits(3);
    const family = STANDARD_FAMILIES[familyIndex];
    if (!family) throw new Error("Invalid standard card family");
    const setNumber = family === "P" ? null : reader.readBits(6);
    const serial = reader.readBits(10);
    cardNumber = family === "P"
      ? `P-${serial.toString().padStart(3, "0")}`
      : `${family}${String(setNumber).padStart(2, "0")}-${serial.toString().padStart(3, "0")}`;
  } else if (mode === 1) {
    const length = reader.readBits(3) + 1;
    let left = "";
    for (let i = 0; i < length; i += 1) {
      const charIndex = reader.readBits(6);
      const char = ALNUM[charIndex];
      if (!char) throw new Error("Invalid compact card character");
      left += char;
    }
    const serial = reader.readBits(10);
    cardNumber = `${left}-${serial.toString().padStart(3, "0")}`;
  } else if (mode === 2) {
    cardNumber = readString(reader).toUpperCase();
  } else {
    throw new Error("Unsupported entry mode");
  }

  const hasVariant = reader.readBit() === 1;
  const variantIndex = hasVariant ? reader.readVarUint() : undefined;
  const count = includeCount ? reader.readBits(3) + 1 : defaultCount;

  return {
    card_number: cardNumber,
    count,
    ...(variantIndex != null ? { variant_index: variantIndex } : {}),
  };
}

function writeString(writer: BitWriter, value: string) {
  const bytes = TEXT_ENCODER.encode(value);
  writer.writeVarUint(bytes.length);
  writer.writeBytes(bytes);
}

function readString(reader: BitReader) {
  const length = reader.readVarUint();
  return TEXT_DECODER.decode(reader.readBytes(length));
}

class BitWriter {
  private bytes: number[] = [];
  private currentByte = 0;
  private bitOffset = 0;

  writeBit(bit: number) {
    if (bit) {
      this.currentByte |= 1 << (7 - this.bitOffset);
    }
    this.bitOffset += 1;
    if (this.bitOffset === 8) {
      this.bytes.push(this.currentByte);
      this.currentByte = 0;
      this.bitOffset = 0;
    }
  }

  writeBits(value: number, count: number) {
    for (let shift = count - 1; shift >= 0; shift -= 1) {
      this.writeBit((value >> shift) & 1);
    }
  }

  writeVarUint(value: number) {
    let remaining = Math.max(0, Math.trunc(value));
    while (remaining >= 0x80) {
      this.writeBits((remaining & 0x7f) | 0x80, 8);
      remaining >>>= 7;
    }
    this.writeBits(remaining, 8);
  }

  writeBytes(bytes: Uint8Array) {
    for (const byte of bytes) {
      this.writeBits(byte, 8);
    }
  }

  finish() {
    if (this.bitOffset > 0) {
      this.bytes.push(this.currentByte);
    }
    return new Uint8Array(this.bytes);
  }
}

class BitReader {
  private byteOffset = 0;
  private bitOffset = 0;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  readBit() {
    const byte = this.bytes[this.byteOffset];
    if (byte == null) throw new Error("Unexpected end of deck hash");
    const bit = (byte >> (7 - this.bitOffset)) & 1;
    this.bitOffset += 1;
    if (this.bitOffset === 8) {
      this.bitOffset = 0;
      this.byteOffset += 1;
    }
    return bit;
  }

  readBits(count: number) {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      value = (value << 1) | this.readBit();
    }
    return value;
  }

  readVarUint() {
    let shift = 0;
    let value = 0;
    while (true) {
      const byte = this.readBits(8);
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return value;
      shift += 7;
    }
  }

  readBytes(length: number) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = this.readBits(8);
    }
    return bytes;
  }
}

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function uint8ToBase64Url(bytes: Uint8Array) {
  let output = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);

    output += BASE64_ALPHABET[(triple >> 18) & 63];
    output += BASE64_ALPHABET[(triple >> 12) & 63];
    output += b == null ? "=" : BASE64_ALPHABET[(triple >> 6) & 63];
    output += c == null ? "=" : BASE64_ALPHABET[triple & 63];
  }

  return output.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToUint8(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes: number[] = [];

  for (let i = 0; i < padded.length; i += 4) {
    const a = decodeBase64Char(padded[i]!);
    const b = decodeBase64Char(padded[i + 1]!);
    const cChar = padded[i + 2]!;
    const dChar = padded[i + 3]!;
    const c = cChar === "=" ? 0 : decodeBase64Char(cChar);
    const d = dChar === "=" ? 0 : decodeBase64Char(dChar);
    const triple = (a << 18) | (b << 12) | (c << 6) | d;

    bytes.push((triple >> 16) & 255);
    if (cChar !== "=") bytes.push((triple >> 8) & 255);
    if (dChar !== "=") bytes.push(triple & 255);
  }

  return new Uint8Array(bytes);
}

function decodeBase64Char(value: string) {
  const index = BASE64_ALPHABET.indexOf(value);
  if (index === -1) throw new Error("Invalid deck hash payload");
  return index;
}

async function compressPayload(payload: Uint8Array) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("CompressionStream unavailable");
  }

  const copy = new Uint8Array(payload.byteLength);
  copy.set(payload);
  const compressedStream = new Blob([copy]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(compressedStream).arrayBuffer());
}

async function decompressPayload(payload: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream unavailable");
  }

  const copy = new Uint8Array(payload.byteLength);
  copy.set(payload);
  const decompressedStream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Deck compression timed out"));
    }, timeoutMs);

    promise.then((value) => {
      clearTimeout(timeoutId);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

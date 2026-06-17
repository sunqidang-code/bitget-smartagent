import crypto from "crypto";

/**
 * Bitget API client (server-side only).
 * - Public endpoints: tickers, candles (no auth)
 * - Private endpoints: account, place order (HMAC SHA256 signature)
 *
 * Docs: https://www.bitget.com/api-doc/common/intro
 */

const BASE_URL = "https://api.bitget.com";

// ============ Signature ============

function base64Encode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

function hmacSha256(secret: string, message: string): string {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("base64");
}

function getTimestamp(): string {
  return Date.now().toString();
}

interface SignParams {
  method: "GET" | "POST" | "DELETE";
  requestPath: string; // includes query string
  body: string; // empty string for GET
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

function buildHeaders({ method, requestPath, body, apiKey, apiSecret, passphrase }: SignParams) {
  const timestamp = getTimestamp();
  const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
  const sign = hmacSha256(apiSecret, prehash);
  return {
    "Content-Type": "application/json",
    "ACCESS-KEY": apiKey,
    "ACCESS-SIGN": sign,
    "ACCESS-TIMESTAMP": timestamp,
    "ACCESS-PASSPHRASE": passphrase,
    "locale": "en-US",
  };
}

// ============ Public Endpoints ============

export interface PublicTickerRaw {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  lastPr: string;
  high24h: string;
  low24h: string;
  change24h: string;
  ts: string;
  bidPr: string;
  askPr: string;
  changeUtc: string;
}

/**
 * Get spot tickers for given symbols (public, no auth).
 * Endpoint: GET /api/v2/spot/market/tickers
 */
export async function getSpotTickers(symbols: string[]): Promise<PublicTickerRaw[]> {
  const symbolsParam = symbols.join(",");
  const path = `/api/v2/spot/market/tickers?symbol=${encodeURIComponent(symbolsParam)}`;
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Bitget tickers HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget tickers error: ${json.msg || JSON.stringify(json)}`);
  }
  return json.data as PublicTickerRaw[];
}

/**
 * Get futures (USDT-M perpetual) tickers (public).
 * Endpoint: GET /api/v2/mix/market/tickers
 */
export async function getFuturesTickers(
  symbols: string[],
  productType = "USDT-FUTURES"
): Promise<PublicTickerRaw[]> {
  const symbolsParam = symbols.join(",");
  const path = `/api/v2/mix/market/tickers?productType=${productType}&symbol=${encodeURIComponent(symbolsParam)}`;
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Bitget futures tickers HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget futures tickers error: ${json.msg || JSON.stringify(json)}`);
  }
  return json.data as PublicTickerRaw[];
}

export interface CandleRaw {
  ts: string; // ms
  o: string; // open
  h: string; // high
  l: string; // low
  c: string; // close
  vol: string; // base volume
  volQuote: string;
}

/**
 * Get spot candles (public).
 * Endpoint: GET /api/v2/spot/market/candles
 */
export async function getSpotCandles(
  symbol: string,
  granularity: string,
  limit = 200
): Promise<CandleRaw[]> {
  const path = `/api/v2/spot/market/candles?symbol=${encodeURIComponent(symbol)}&granularity=${granularity}&limit=${limit}`;
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Bitget candles HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget candles error: ${json.msg || JSON.stringify(json)}`);
  }
  // Bitget returns newest-first; reverse to oldest-first for charting
  return (json.data as CandleRaw[]).slice().reverse();
}

/**
 * Get futures candles (public).
 * Endpoint: GET /api/v2/mix/market/candles
 */
export async function getFuturesCandles(
  symbol: string,
  granularity: string,
  productType = "USDT-FUTURES",
  limit = 200
): Promise<CandleRaw[]> {
  const path = `/api/v2/mix/market/candles?symbol=${encodeURIComponent(symbol)}&productType=${productType}&granularity=${granularity}&limit=${limit}`;
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Bitget futures candles HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget futures candles error: ${json.msg || JSON.stringify(json)}`);
  }
  return (json.data as CandleRaw[]).slice().reverse();
}

// ============ Private Endpoints ============

export interface BitgetCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

/**
 * Get spot account assets (private, signed).
 * Endpoint: GET /api/v2/spot/account/assets
 */
export async function getSpotAccountAssets(creds: BitgetCredentials) {
  const path = "/api/v2/spot/account/assets";
  const headers = buildHeaders({
    method: "GET",
    requestPath: path,
    body: "",
    ...creds,
  });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
    next: { revalidate: 0 },
  });
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget account error: ${json.msg}`);
  }
  return json.data;
}

/**
 * Get futures account info (private, signed).
 * Endpoint: GET /api/v2/mix/account/accounts?productType=USDT-FUTURES
 */
export async function getFuturesAccount(creds: BitgetCredentials, productType = "USDT-FUTURES") {
  const path = `/api/v2/mix/account/accounts?productType=${productType}`;
  const headers = buildHeaders({
    method: "GET",
    requestPath: path,
    body: "",
    ...creds,
  });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
    next: { revalidate: 0 },
  });
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget futures account error: ${json.msg}`);
  }
  return json.data;
}

/**
 * Get futures positions (private, signed).
 * Endpoint: GET /api/v2/mix/position/all-position?productType=USDT-FUTURES
 */
export async function getFuturesPositions(creds: BitgetCredentials, productType = "USDT-FUTURES") {
  const path = `/api/v2/mix/position/all-position?productType=${productType}`;
  const headers = buildHeaders({
    method: "GET",
    requestPath: path,
    body: "",
    ...creds,
  });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
    next: { revalidate: 0 },
  });
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget positions error: ${json.msg}`);
  }
  return json.data;
}

export interface PlaceOrderParams {
  symbol: string;
  side: "buy" | "sell";
  orderType: "limit" | "market";
  size: string;
  price?: string;
  productType?: string;
  marginMode?: "isolated" | "crossed";
  leverage?: number;
  reduceOnly?: boolean;
  force?: "gtc" | "ioc" | "fok";
}

/**
 * Place a futures order (private, signed).
 * Endpoint: POST /api/v2/mix/order/place-order
 */
export async function placeFuturesOrder(creds: BitgetCredentials, params: PlaceOrderParams) {
  const body = JSON.stringify({
    symbol: params.symbol,
    marginMode: params.marginMode ?? "crossed",
    productType: params.productType ?? "USDT-FUTURES",
    side: params.side,
    tradeSide: params.reduceOnly ? (params.side === "buy" ? "open" : "close") : "open",
    orderType: params.orderType,
    force: params.force ?? "gtc",
    size: params.size,
    price: params.price ?? "",
    leverage: String(params.leverage ?? 5),
    reduceOnly: params.reduceOnly ?? false,
  });
  const path = "/api/v2/mix/order/place-order";
  const headers = buildHeaders({
    method: "POST",
    requestPath: path,
    body,
    ...creds,
  });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  });
  const json = await res.json();
  if (json.code !== "00000") {
    throw new Error(`Bitget place order error: ${json.msg}`);
  }
  return json.data;
}

/**
 * Verify credentials by calling a lightweight private endpoint.
 */
export async function verifyCredentials(creds: BitgetCredentials): Promise<boolean> {
  try {
    await getSpotAccountAssets(creds);
    return true;
  } catch {
    return false;
  }
}

// ============ Helpers ============

export const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
];

export const SYMBOL_LABELS: Record<string, { base: string; quote: string; name: string }> = {
  BTCUSDT: { base: "BTC", quote: "USDT", name: "Bitcoin" },
  ETHUSDT: { base: "ETH", quote: "USDT", name: "Ethereum" },
  SOLUSDT: { base: "SOL", quote: "USDT", name: "Solana" },
  BNBUSDT: { base: "BNB", quote: "USDT", name: "BNB" },
  XRPUSDT: { base: "XRP", quote: "USDT", name: "XRP" },
  DOGEUSDT: { base: "DOGE", quote: "USDT", name: "Dogecoin" },
  PEPEUSDT: { base: "PEPE", quote: "USDT", name: "Pepe" },
  WIFUSDT: { base: "WIF", quote: "USDT", name: "dogwifhat" },
};

export const GRANULARITY_OPTIONS: { value: string; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1H", label: "1H" },
  { value: "4H", label: "4H" },
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
];

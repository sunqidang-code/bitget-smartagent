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
  changeUtc24h: string;
  openUtc: string;
  baseVolume: string;
  quoteVolume: string;
  usdtVolume: string;
}

/**
 * Get spot tickers for given symbols (public, no auth).
 * Endpoint: GET /api/v2/spot/market/tickers
 *
 * IMPORTANT: Bitget V2 spot tickers endpoint does NOT support
 * comma-separated symbols (returns error 40034). We must fetch
 * each symbol individually. To avoid timeouts, we fire all
 * requests in parallel.
 */
export async function getSpotTickers(symbols: string[]): Promise<PublicTickerRaw[]> {
  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const path = `/api/v2/spot/market/tickers?symbol=${encodeURIComponent(sym)}`;
      const url = `${BASE_URL}${path}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        throw new Error(`Bitget tickers HTTP ${res.status} for ${sym}`);
      }
      const json = await res.json();
      if (json.code !== "00000") {
        throw new Error(`Bitget tickers error for ${sym}: ${json.msg || JSON.stringify(json)}`);
      }
      // data is an array with one element when symbol is specified
      const data = json.data as PublicTickerRaw[];
      return data[0] || null;
    })
  );
  // Collect successful results, skip failures
  const tickers: PublicTickerRaw[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value !== null) {
      tickers.push(r.value);
    }
  }
  return tickers;
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
  ts: number; // ms timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // base volume
  quoteVolume: number;
}

/**
 * Map our UI granularity values to Bitget V2 API accepted format.
 * Bitget V2 spot candles accepts: 1min, 5min, 15min, 30min, 1h, 4h, 6h, 12h, 1day, 1week, 1M
 * Our UI uses: 1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W
 */
function toBitgetGranularity(g: string): string {
  const map: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1H": "1h",
    "4H": "4h",
    "1D": "1day",
    "1W": "1week",
  };
  return map[g] || g;
}

/**
 * Get spot candles (public).
 * Endpoint: GET /api/v2/spot/market/candles
 *
 * Response format: array of arrays [ts, open, high, low, close, baseVol, quoteVol, usdtVol]
 */
export async function getSpotCandles(
  symbol: string,
  granularity: string,
  limit = 200
): Promise<CandleRaw[]> {
  const bgGranularity = toBitgetGranularity(granularity);
  const path = `/api/v2/spot/market/candles?symbol=${encodeURIComponent(symbol)}&granularity=${bgGranularity}&limit=${limit}`;
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
  // Bitget returns array of arrays: [ts, open, high, low, close, baseVol, quoteVol, usdtVol]
  // and newest-first; we reverse to oldest-first for charting
  const rawData = json.data as unknown[][];
  const candles: CandleRaw[] = rawData.map((row) => ({
    ts: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    quoteVolume: Number(row[6] ?? row[5]),
  }));
  return candles.reverse();
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
  const bgGranularity = toBitgetGranularity(granularity);
  const path = `/api/v2/mix/market/candles?symbol=${encodeURIComponent(symbol)}&productType=${productType}&granularity=${bgGranularity}&limit=${limit}`;
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
  const rawData = json.data as unknown[][];
  const candles: CandleRaw[] = rawData.map((row) => ({
    ts: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    quoteVolume: Number(row[6] ?? row[5]),
  }));
  return candles.reverse();
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

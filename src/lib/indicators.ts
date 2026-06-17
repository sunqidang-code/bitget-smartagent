/**
 * Technical indicators computed from candle arrays.
 * Pure functions, no external deps.
 */

export interface CandleNum {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    out.push(sum / period);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = [NaN];
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
    out.push(NaN);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

export function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (closes[j] - mid[i]) ** 2;
    const sd = Math.sqrt(sum / period);
    upper.push(mid[i] + mult * sd);
    lower.push(mid[i] - mult * sd);
  }
  return { mid, upper, lower };
}

export function atr(candles: CandleNum[], period = 14): number[] {
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trs.push(candles[i].high - candles[i].low);
      continue;
    }
    const prevClose = candles[i - 1].close;
    trs.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose)
      )
    );
  }
  // Wilder's smoothing
  const out: number[] = [];
  let prev = trs[0];
  out.push(prev);
  for (let i = 1; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
    out.push(prev);
  }
  return out;
}

export function volatility(closes: number[], period = 20): number {
  if (closes.length < period + 1) return 0;
  const returns: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(period); // annualized-ish
}

export interface TechnicalSnapshot {
  price: number;
  change24h: number;
  rsi14: number;
  macdHist: number;
  macdBullish: boolean;
  sma20: number;
  sma50: number;
  sma200?: number;
  trend: "up" | "down" | "sideways";
  bollUpper: number;
  bollLower: number;
  bollMid: number;
  atr14: number;
  volatility: number;
  volume24h: number;
  nearSupport: boolean;
  nearResistance: boolean;
}

export function buildTechnicalSnapshot(
  candles: CandleNum[],
  tickerChange24h: number
): TechnicalSnapshot {
  const closes = candles.map((c) => c.close);
  const last = closes[closes.length - 1] ?? 0;
  const rsiArr = rsi(closes, 14);
  const { histogram } = macd(closes);
  const sma20Arr = sma(closes, 20);
  const sma50Arr = sma(closes, 50);
  const sma200Arr = closes.length >= 200 ? sma(closes, 200) : [];
  const boll = bollinger(closes, 20, 2);
  const atrArr = atr(candles, 14);
  const vol = volatility(closes, 20);

  const sma20 = sma20Arr[sma20Arr.length - 1] ?? last;
  const sma50 = sma50Arr[sma50Arr.length - 1] ?? last;
  const sma200 = sma200Arr.length ? sma200Arr[sma200Arr.length - 1] : undefined;
  const bollUpper = boll.upper[boll.upper.length - 1] ?? last;
  const bollLower = boll.lower[boll.lower.length - 1] ?? last;
  const bollMid = boll.mid[boll.mid.length - 1] ?? last;
  const atr14 = atrArr[atrArr.length - 1] ?? 0;
  const rsi14 = rsiArr[rsiArr.length - 1] ?? 50;
  const macdHist = histogram[histogram.length - 1] ?? 0;

  let trend: "up" | "down" | "sideways" = "sideways";
  if (sma20 > sma50 * 1.005) trend = "up";
  else if (sma20 < sma50 * 0.995) trend = "down";

  const volume24h = candles.slice(-24).reduce((a, c) => a + c.volume, 0);

  return {
    price: last,
    change24h: tickerChange24h,
    rsi14,
    macdHist,
    macdBullish: macdHist > 0,
    sma20,
    sma50,
    sma200,
    trend,
    bollUpper,
    bollLower,
    bollMid,
    atr14,
    volatility: vol,
    volume24h,
    nearSupport: last <= bollLower * 1.01,
    nearResistance: last >= bollUpper * 0.99,
  };
}

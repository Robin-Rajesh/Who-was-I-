/**
 * Optimal contiguous segmentation of a sequence of (weighted) vectors.
 *
 * Each month is a unit vector u_m describing "what you watched" with weight w_m
 * (more watching = more say). The cost of grouping months i..j-1 into one era is
 *
 *     cost(i, j) = Σ w_m  −  | Σ w_m · u_m |
 *
 * which equals Σ w_m (1 − cos(u_m, centroid)) – i.e. how much the months inside
 * the era disagree with the era's average taste. Because the u_m are unit
 * vectors, this is computable from prefix sums in O(D) per pair, and the best
 * K-segmentation follows from a classic O(K·M²) dynamic programme.
 */

export interface SegmentInput {
  /** Unit (or zero) vectors, one per step. */
  vectors: Float64Array[];
  weights: number[];
}

export function segmentCostMatrix({ vectors, weights }: SegmentInput): (i: number, j: number) => number {
  const M = vectors.length;
  const D = M ? vectors[0].length : 0;
  const prefix: Float64Array[] = [new Float64Array(D)];
  const wPrefix: number[] = [0];
  for (let m = 0; m < M; m++) {
    const p = new Float64Array(D);
    const prev = prefix[m];
    const v = vectors[m];
    const w = weights[m];
    for (let d = 0; d < D; d++) p[d] = prev[d] + w * v[d];
    prefix.push(p);
    wPrefix.push(wPrefix[m] + w);
  }
  const cache = new Map<number, number>();
  return (i: number, j: number) => {
    const key = i * (M + 1) + j;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const a = prefix[i], b = prefix[j];
    let s = 0;
    for (let d = 0; d < D; d++) {
      const x = b[d] - a[d];
      s += x * x;
    }
    const c = Math.max(0, wPrefix[j] - wPrefix[i] - Math.sqrt(s));
    cache.set(key, c);
    return c;
  };
}

/**
 * Returns segment boundaries as [start, end) pairs covering 0..M.
 * @param k desired number of segments (reduced automatically if M is too short)
 * @param minLen minimum steps per segment
 */
export function optimalSegments(input: SegmentInput, k: number, minLen: number): [number, number][] {
  const M = input.vectors.length;
  if (M === 0) return [];
  const K = Math.max(1, Math.min(k, Math.floor(M / Math.max(1, minLen))));
  if (K === 1) return [[0, M]];
  const cost = segmentCostMatrix(input);
  const INF = Number.POSITIVE_INFINITY;
  // dp[s][j] = best cost covering 0..j with s segments.
  const dp: Float64Array[] = Array.from({ length: K + 1 }, () => new Float64Array(M + 1).fill(INF));
  const back: Int32Array[] = Array.from({ length: K + 1 }, () => new Int32Array(M + 1).fill(-1));
  dp[0][0] = 0;
  for (let s = 1; s <= K; s++) {
    for (let j = s * minLen; j <= M; j++) {
      let best = INF, arg = -1;
      for (let i = (s - 1) * minLen; i <= j - minLen; i++) {
        const prev = dp[s - 1][i];
        if (prev === INF) continue;
        const c = prev + cost(i, j);
        if (c < best) {
          best = c;
          arg = i;
        }
      }
      dp[s][j] = best;
      back[s][j] = arg;
    }
  }
  const segs: [number, number][] = [];
  let j = M;
  for (let s = K; s >= 1; s--) {
    const i = back[s][j];
    if (i < 0) return [[0, M]];
    segs.unshift([i, j]);
    j = i;
  }
  return segs;
}

export function cosine(a: Float64Array, b: Float64Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function normalize(v: Float64Array): Float64Array {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n);
  if (n > 0) for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

export function float32ToBlob(array: Float32Array): Uint8Array {
  return new Uint8Array(array.buffer, array.byteOffset, array.length)
}

export function blobToFloat32(blob: Uint8Array): Float32Array {
  const copy = new Uint8Array(blob)
  return new Float32Array(copy.buffer)
}

export function cosineSimilarity(a: Float32Array  , b: Float32Array): number {

    if(a.length !== b.length) {
        throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`)
    }

  let dot = 0;
  let magA = 0;
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

    if (magA === 0 || magB === 0) {
        return 0;
     }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

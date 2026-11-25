export function fetchVerifiedAsset(url: string, digest: string, options: RequestInit & { signal: AbortSignal },
  onBytes?: (bytes: number) => void): Promise<Response>;

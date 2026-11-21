import data from "../ref/相册/album.json" with { type: "json" };
import type { Memory } from "./content.ts";

interface Photo {
  id: string;
  file: string;
  title: string;
  originalUrl: string;
  alt?: string;
  text?: string;
  width: number;
  height: number;
  version: string;
}

const album: { originalBaseUrl: string; cover?: string; stamp?: string; photos: Photo[] } = data;
const base = new URL(album.originalBaseUrl);
if (!base.pathname.endsWith("/")) base.pathname += "/";

function previewUrl(name: string) {
  // The Vite asset graph contains only generated WebPs, even when local PNG
  // originals live beside the catalog. These URLs also work in native Node tests.
  return new URL(`../ref/相册/previews/${name}.webp?no-inline`, import.meta.url).href;
}

function originalSrc(photo: Photo) {
  const link = new URL(photo.originalUrl);
  if (link.href === new URL(encodeURIComponent(photo.file), base).href) {
    link.searchParams.set("v", photo.version);
  }
  return link.href;
}

export const albumItems: Memory[] = album.photos.map(photo => ({
  id: photo.id, title: photo.title, alt: photo.alt ?? photo.title, text: photo.text,
  width: photo.width, height: photo.height, originalSrc: originalSrc(photo),
  src: previewUrl(`${photo.id}.${photo.version}`),
  thumbnail: previewUrl(`${photo.id}.${photo.version}-thumb`),
}));

function coverPhoto(filename?: string): Memory | undefined {
  const index = album.photos.findIndex(photo => photo.file === filename);
  return albumItems[Math.max(0, index)];
}
export const albumCoverPhoto = coverPhoto(album.cover);
export const albumStampPhoto = coverPhoto(album.stamp);

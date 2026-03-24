export interface ScanPack {
  id: "starter" | "pro" | "agency";
  name: string;
  scans: number;
  priceInCents: number;
}

export const SCAN_PACKS: ScanPack[] = [
  { id: "starter", name: "Starter", scans: 1, priceInCents: 1500 },
  { id: "pro", name: "Pro", scans: 3, priceInCents: 4000 },
  { id: "agency", name: "Agency", scans: 10, priceInCents: 11900 },
];

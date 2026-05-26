export interface RawFeature {
  attributes: Record<string, string | number | null>;
  geometry?: {
    x: number; // lon
    y: number; // lat
  };
}

export interface ArcGISResponse {
  features: RawFeature[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string };
}

export interface Property {
  caseNumber: string;
  streetNumber: string;
  directionPrefix: string | null;
  streetName: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lon: number | null;
  revitalizationArea: string | null;
  fullAddress: string;
}

export const HUD_ARCGIS_URL =
  "https://egis.hud.gov/arcgis/rest/services/gotit/REOProperties/MapServer/0/query";

export const DEFAULT_STATE = "FL";
export const PAGE_SIZE = 1000;

// Buy-box: Miami-Dade (330**, 331**, 332**) + Broward (333**)
export const BUY_BOX_ZIP_PREFIXES = ["330", "331", "332", "333"];

export interface ArcGISConfig {
  stateCode: string;
  pageSize: number;
  outFields: string[];
  returnGeometry: boolean;
  zipPrefixes?: string[]; // if set, only return props with these ZIP prefixes
}

export const defaultConfig: ArcGISConfig = {
  stateCode: DEFAULT_STATE,
  pageSize: PAGE_SIZE,
  outFields: [
    "CASE_NUM",
    "STREET_NUM",
    "DIRECTION_PREFIX",
    "STREET_NAME",
    "CITY",
    "STATE_CODE",
    "DISPLAY_ZIP_CODE",
    "REVITE_NAME",
  ],
  returnGeometry: true,
};

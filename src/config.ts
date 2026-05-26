export const HUD_ARCGIS_URL =
  "https://egis.hud.gov/arcgis/rest/services/gotit/REOProperties/MapServer/0/query";

export const DEFAULT_STATE = "FL";
export const PAGE_SIZE = 1000;

export interface ArcGISConfig {
  stateCode: string;
  pageSize: number;
  outFields: string[];
  returnGeometry: boolean;
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

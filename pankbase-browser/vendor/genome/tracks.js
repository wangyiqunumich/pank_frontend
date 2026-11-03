import tracks from "./pkb-atac-no-abc-uniformed_peaks.json";
export const TRACKS = tracks;
export async function fetchTracks() { return structuredClone(TRACKS); }

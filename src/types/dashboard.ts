export interface DashboardMetricDTO {
  total: number;
  newInPeriod?: number;
  oldOutOfPeriod?: number;
  // Legacy fields for backward compatibility
  inRange?: number;
  outsideRange?: number;
}

export interface TimeSeriesPointDTO {
  date: string;
  value: number;
}

export interface DashboardStatsResponse {
  songs?: DashboardMetricDTO;
  playlists?: DashboardMetricDTO;
  plays?: DashboardMetricDTO;
  users?: DashboardMetricDTO;
  songSeries?: TimeSeriesPointDTO[];
  playlistSeries?: TimeSeriesPointDTO[];
  playSeries?: TimeSeriesPointDTO[];
  userSeries?: TimeSeriesPointDTO[];
}

export interface DashboardMetricDTO {
  total: number;
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
  songSeries?: TimeSeriesPointDTO[];
  playlistSeries?: TimeSeriesPointDTO[];
  playSeries?: TimeSeriesPointDTO[];
}

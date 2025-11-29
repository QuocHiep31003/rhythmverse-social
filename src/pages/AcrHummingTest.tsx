import React, { useState, useRef, useEffect } from 'react';
import { arcApi } from '@/services/api';
import { apiClient } from '@/services/api/config';
import { useMusic } from '@/contexts/MusicContext';
import { mapToPlayerSong } from '@/lib/utils';
import { getAuthToken } from '@/services/api/config';
import Hls from 'hls.js';

type HummingSong = {
  id: number;
  name: string;
  [key: string]: unknown;
};

type HummingResult = {
  acrid: string;
  title?: string;
  score?: number;
  artists?: Array<{ name?: string }>;
  album?: string;
  releaseDate?: string;
  durationMs?: number;
  playOffsetMs?: number;
  matchedInSystem?: boolean;
  song?: HummingSong;
};

type HummingResponse = {
  matched: boolean;
  song?: HummingSong; // Kết quả từ finger match (custom_files)
  acrid?: string;
  score?: number;
  hummingResults?: HummingResult[]; // Kết quả từ humming
  acrResult?: Record<string, unknown>;
  error?: string;
};

const AcrHummingTest: React.FC = () => {
  const { playSong } = useMusic();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [results, setResults] = useState<HummingResponse | null>(null);
  
  // Test play-now state
  const [testSongId, setTestSongId] = useState<string>('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    songId?: number;
    streamUrl?: string;
    song?: Record<string, unknown>;
    playbackState?: Record<string, unknown>;
    deviceId?: string;
    message?: string;
  } | null>(null);
  const [testError, setTestError] = useState<string>('');
  
  // Simple audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  // Load and play HLS stream
  const loadAndPlayStream = (streamUrl: string) => {
    if (!audioRef.current) {
      const audio = document.createElement('audio');
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Get absolute URL - streamUrl từ API có thể là relative path
    const baseUrl = window.location.origin;
    let absoluteUrl = streamUrl;
    if (!streamUrl.startsWith('http')) {
      // Nếu là relative path, thêm base URL
      absoluteUrl = streamUrl.startsWith('/') 
        ? `${baseUrl}${streamUrl}` 
        : `${baseUrl}/${streamUrl}`;
    }

    if (Hls.isSupported()) {
      const token = getAuthToken();
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        xhrSetup: (xhr, url) => {
          // Thêm Authorization header vào tất cả HLS requests
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        },
      });
      
      hls.loadSource(absoluteUrl);
      hls.attachMedia(audio);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed, ready to play');
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error('Play failed:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
        }
      });

      hlsRef.current = hls;
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      audio.src = absoluteUrl;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Play failed:', err);
      });
    } else {
      console.error('HLS not supported');
      setTestError('Trình duyệt không hỗ trợ phát HLS stream');
    }

    // Setup audio event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    audio.volume = volume;
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      // Dùng recognizeMusic (recognize-audio) vì nó xử lý cả finger và humming
      const response = await arcApi.recognizeMusic(file);
      setResults(response);
    } catch (err) {
      const e = err as unknown as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || 'Error recognizing audio');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatScore = (score?: number): string => {
    if (score === undefined || score === null) return 'N/A';
    return (score * 100).toFixed(1) + '%';
  };

  const handleTestPlayNow = async () => {
    if (!testSongId || isNaN(Number(testSongId))) {
      setTestError('Vui lòng nhập Song ID hợp lệ');
      return;
    }

    setTestLoading(true);
    setTestError('');
    setTestResult(null);

    try {
      const response = await apiClient.post(`/songs/${testSongId}/play-now`, {});
      setTestResult(response.data);
      
      // Tự động phát nhạc trên simple player nếu có streamUrl
      if (response.data?.streamUrl) {
        loadAndPlayStream(response.data.streamUrl);
      }
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (err instanceof Error ? err.message : 'Error playing song');
      setTestError(errorMessage);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h2>ACR Audio Recognition Test</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Upload một file audio để nhận diện bài hát. Hệ thống sẽ tự động kiểm tra:
        <br />
        • <strong>Audio Fingerprint</strong> (custom_files) - tìm trong hệ thống
        <br />
        • <strong>Humming Recognition</strong> - gợi ý từ ACR Cloud database nếu không tìm thấy
      </p>

      {/* Test Play Now Section */}
      <div style={{ 
        padding: 16, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 8, 
        marginBottom: 24,
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>🎵 Test Play Now (Đơn giản hóa phát nhạc)</h3>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
          Test endpoint mới: chỉ cần click 1 nút là phát nhạc ngay (tự động setup playback state + stream URL đã signed)
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Nhập Song ID (ví dụ: 1)"
            value={testSongId}
            onChange={(e) => setTestSongId(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 14,
              minWidth: 200
            }}
          />
          <button
            onClick={handleTestPlayNow}
            disabled={!testSongId || testLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: testLoading || !testSongId ? 'not-allowed' : 'pointer',
              opacity: testLoading || !testSongId ? 0.6 : 1,
              fontWeight: 'bold'
            }}
          >
            {testLoading ? 'Đang phát...' : '▶️ Phát Nhạc Ngay'}
          </button>
        </div>

        {testError && (
          <div style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: 4,
            fontSize: 14
          }}>
            <strong>Lỗi:</strong> {testError}
          </div>
        )}

        {testResult && (
          <div style={{
            marginTop: 12,
            padding: 16,
            backgroundColor: '#d4edda',
            borderRadius: 4,
            border: '1px solid #c3e6cb'
          }}>
            <h4 style={{ margin: 0, marginBottom: 8, color: '#155724' }}>✅ Thành công!</h4>
            <div style={{ fontSize: 14, color: '#155724' }}>
              <div><strong>Song ID:</strong> {testResult.songId}</div>
              {testResult.song && (
                <div><strong>Song Name:</strong> {
                  (typeof testResult.song.title === 'string' ? testResult.song.title : null) ||
                  (typeof testResult.song.name === 'string' ? testResult.song.name : 'Unknown')
                }</div>
              )}
              <div style={{ marginTop: 8 }}>
                <strong>Stream URL:</strong>
                <code style={{
                  display: 'block',
                  marginTop: 4,
                  padding: 8,
                  backgroundColor: '#fff',
                  borderRadius: 4,
                  fontSize: 12,
                  wordBreak: 'break-all',
                  border: '1px solid #c3e6cb'
                }}>
                  {testResult.streamUrl}
                </code>
              </div>
              {testResult.playbackState && (
                <div style={{ marginTop: 8 }}>
                  <strong>Playback State:</strong>
                  <pre style={{
                    marginTop: 4,
                    padding: 8,
                    backgroundColor: '#fff',
                    borderRadius: 4,
                    fontSize: 11,
                    overflow: 'auto',
                    maxHeight: 200,
                    border: '1px solid #c3e6cb'
                  }}>
                    {JSON.stringify(testResult.playbackState, null, 2)}
                  </pre>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                <strong>Device ID:</strong> {testResult.deviceId}
              </div>
            </div>
          </div>
        )}

        {/* Simple Audio Player */}
        {testResult?.streamUrl && (
          <div style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: '#fff',
            borderRadius: 8,
            border: '2px solid #28a745',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: 0, marginBottom: 12, color: '#28a745' }}>🎵 Simple Player</h4>
            
            {/* Song Info */}
            {testResult.song && (
              <div style={{ marginBottom: 12, fontSize: 14 }}>
                <strong>{(typeof testResult.song.title === 'string' ? testResult.song.title : null) ||
                  (typeof testResult.song.name === 'string' ? testResult.song.name : 'Unknown')}</strong>
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <button
                onClick={togglePlay}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#28a745',
                  color: 'white',
                  fontSize: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>

              {/* Progress Bar */}
              <div style={{ flex: 1 }}>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginTop: 4 }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                <span style={{ fontSize: 18 }}>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, minWidth: 30 }}>{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input 
          type="file" 
          accept="audio/*" 
          onChange={handleFileChange}
          style={{ marginRight: 8 }}
        />
        <button 
          type="submit" 
          disabled={!file || loading}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: loading || !file ? 'not-allowed' : 'pointer',
            opacity: loading || !file ? 0.6 : 1
          }}
        >
          {loading ? 'Recognizing...' : 'Recognize Humming'}
        </button>
      </form>

      {error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#fee', 
          color: '#c33', 
          borderRadius: 4,
          marginBottom: 16
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: 24 }}>
          {/* Hiển thị kết quả match từ finger (custom_files) */}
          {results.song && (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#d4edda', 
              borderRadius: 8,
              marginBottom: 16,
              border: '2px solid #c3e6cb'
            }}>
              <h3 style={{ margin: 0, marginBottom: 12, color: '#155724' }}>
                ✅ Found Match in System!
              </h3>
              <div style={{ fontSize: 16 }}>
                <div><strong>Song:</strong> {results.song.name}</div>
                {results.song.artists && Array.isArray(results.song.artists) && results.song.artists.length > 0 && (
                  <div><strong>Artists:</strong> {(results.song.artists as Array<{ name?: string }>).map((a) => a.name).filter(Boolean).join(', ')}</div>
      )}
                <div><strong>ACRID:</strong> <code style={{ fontSize: 12 }}>{results.acrid}</code></div>
                {results.score && (
                  <div><strong>Score:</strong> {results.score}</div>
                )}
              </div>
            </div>
          )}

          {/* Hiển thị status nếu không có match */}
          {!results.song && (
            <div style={{ 
              padding: 12, 
              backgroundColor: results.matched ? '#d4edda' : '#fff3cd', 
              borderRadius: 4,
              marginBottom: 16
            }}>
              <strong>Status:</strong> {results.matched 
                ? '✅ Found match in system!' 
                : '⚠️ No match found in system, showing results from ACR Cloud database'}
            </div>
          )}

          {/* Hiển thị humming results */}
          {results.hummingResults && results.hummingResults.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 16 }}>
                Suggested Songs from ACR Cloud ({results.hummingResults.length} results)
              </h3>
              <div style={{ display: 'grid', gap: 16 }}>
                {results.hummingResults.map((result, index) => (
                  <div 
                    key={result.acrid || index}
                    style={{
                      padding: 16,
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      backgroundColor: result.matchedInSystem ? '#e7f3ff' : '#fff',
                      boxShadow: result.matchedInSystem ? '0 2px 4px rgba(0,123,255,0.2)' : '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div>
                        <h4 style={{ margin: 0, marginBottom: 4, fontSize: 18 }}>
                          {result.title || '(No title)'}
                        </h4>
                        {result.artists && result.artists.length > 0 && (
                          <div style={{ color: '#666', marginBottom: 4 }}>
                            <strong>Artists:</strong> {result.artists.map(a => a.name).filter(Boolean).join(', ') || 'Unknown'}
                          </div>
                        )}
                        {result.album && (
                          <div style={{ color: '#666', fontSize: 14 }}>
                            <strong>Album:</strong> {result.album}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: 20, 
                          fontWeight: 'bold',
                          color: result.score && result.score > 0.5 ? '#28a745' : '#ffc107'
                        }}>
                          {formatScore(result.score)}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          Score: {result.score?.toFixed(3) || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 8,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid #eee',
                      fontSize: 13,
                      color: '#666'
                    }}>
                      <div>
                        <strong>ACRID:</strong> 
                        <code style={{ 
                          display: 'block', 
                          marginTop: 4,
                          fontSize: 11,
                          wordBreak: 'break-all'
                        }}>
                          {result.acrid}
                        </code>
                      </div>
                      {result.durationMs && (
                        <div>
                          <strong>Duration:</strong> {formatDuration(result.durationMs)}
                        </div>
                      )}
                      {result.playOffsetMs && (
                        <div>
                          <strong>Play Offset:</strong> {formatDuration(result.playOffsetMs)}
                        </div>
                      )}
                      {result.releaseDate && (
                        <div>
                          <strong>Release Date:</strong> {result.releaseDate}
                        </div>
                      )}
                    </div>

                    {result.matchedInSystem && result.song && (
                      <div style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: '#d4edda',
                        borderRadius: 4,
                        border: '1px solid #c3e6cb'
                      }}>
                        <strong>✅ Matched in System:</strong>
                        <div style={{ marginTop: 4 }}>
                          Song ID: {result.song.id} - {result.song.name}
                        </div>
                      </div>
                )}
                  </div>
            ))}
              </div>
            </div>
          )}

          {(!results.hummingResults || results.hummingResults.length === 0) && (
            <div style={{ padding: 16, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
              No humming results found. Please try again with a different audio file.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AcrHummingTest;


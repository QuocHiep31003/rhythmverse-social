import React, { useState } from 'react';
import { arcApi } from '@/services/api';

type Song = {
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
  song?: Song;
};

type HummingResponse = {
  matched: boolean;
  song?: Song; // Kết quả từ finger match (custom_files)
  acrid?: string;
  score?: number;
  hummingResults?: HummingResult[]; // Kết quả từ humming
  acrResult?: Record<string, unknown>;
  error?: string;
};

const AcrHummingTest: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [results, setResults] = useState<HummingResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

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


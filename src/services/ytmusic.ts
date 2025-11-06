import YTMusic from 'ytmusic-api';

let ytClient: YTMusic | null = null;

async function getClient(): Promise<YTMusic> {
  if (ytClient) return ytClient;
  const client = new YTMusic();
  await client.initialize();
  ytClient = client;
  return client;
}

export async function searchYouTubeMusicVideoId(title: string, artists?: string): Promise<string | null> {
  try {
    if (!title || !title.trim()) return null;
    const yt = await getClient();
    const query = [title, artists || ''].filter(Boolean).join(' ');

    // Prefer songs, fallback to videos
    const songs = await yt.search(query, 'songs');
    if (songs && songs.length > 0) {
      const first: any = songs[0];
      return (first.videoId as string) || null;
    }

    const videos = await yt.search(query, 'videos');
    if (videos && videos.length > 0) {
      const first: any = videos[0];
      return (first.videoId as string) || null;
    }
    return null;
  } catch (e) {
    console.error('[ytmusic] search error:', (e as Error)?.message);
    return null;
  }
}



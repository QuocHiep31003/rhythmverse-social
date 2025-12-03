export interface DisplayableSong {
  id?: string | number;
  title?: string;
  name?: string;
  songName?: string;
  artist?: string;
  cover?: string;
  artistNames?: string[];
  urlImageAlbum?: string | null;
  song?: {
    name?: string;
    title?: string;
    songName?: string;
    cover?: string;
    urlImageAlbum?: string | null;
    artistNames?: string[];
  };
}

export const getSongDisplay = (song: DisplayableSong | null | undefined) => {
  if (!song) {
    return {
      title: "",
      artist: "",
      cover: undefined as string | undefined,
    };
  }

  const title =
    song.songName ||
    song.title ||
    song.name ||
    song.song?.name ||
    song.song?.title ||
    song.song?.songName ||
    "";

  const artistFromArray =
    Array.isArray(song.artistNames) && song.artistNames.length > 0
      ? song.artistNames.join(", ")
      : undefined;

  const artistFromNestedArray =
    song.song &&
    Array.isArray(song.song.artistNames) &&
    song.song.artistNames.length > 0
      ? song.song.artistNames.join(", ")
      : undefined;

  const artist =
    song.artist ||
    artistFromArray ||
    artistFromNestedArray ||
    "";

  const cover =
    song.cover ||
    song.urlImageAlbum ||
    song.song?.cover ||
    song.song?.urlImageAlbum ||
    undefined;

  return { title, artist, cover };
};





export interface CandidateArtist {
  name: string;
  votes: number;
  imageUrl?: string;
}

export interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  genre: string;
  secondGenre?: string;
  year: number;
  coverUrl: string;
  audioUrl: string;
  lyrics: string;
  plays: number;
  candidateArtists?: CandidateArtist[];
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  songIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface LicensingRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  songId: string;
  songName: string;
  purpose: string;
  audioFormat?: string;
  message: string;
  offerValue?: number;
  status: 'Novo' | 'Em andamento' | 'Fechado';
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  likedSongs: string[];
  likedPlaylists: string[];
  isAdmin: boolean;
  createdAt: string;
}

export type PlayMode = 'regular' | 'repeat' | 'shuffle';

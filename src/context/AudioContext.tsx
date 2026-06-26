import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Song, PlayMode, UserProfile, Playlist } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  onSnapshot,
  increment,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentIndex: number;
  progress: number; // percentage (0-100)
  currentTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 to 1
  isMuted: boolean;
  playMode: PlayMode;
  isLyricsExpanded: boolean;
  setIsLyricsExpanded: (val: boolean) => void;
  likedSongs: string[];
  likedPlaylists: string[];
  history: string[];
  songs: Song[];
  isLoadingSongs: boolean;
  userProfile: UserProfile | null;
  customPlaylists: Playlist[];
  
  // Audio playback controls
  playSong: (song: Song, customQueue?: Song[]) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (percent: number) => void;
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  setPlayMode: (mode: PlayMode) => void;
  toggleLikeSong: (songId: string) => Promise<void>;
  toggleLikePlaylist: (playlistId: string) => Promise<void>;
  recordListen: (songId: string) => Promise<void>;
  reloadSongs: () => Promise<void>;
  updateQueue: (newQueue: Song[]) => void;
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  voteCandidate: (songId: string, artistName: string) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Fallback high-fidelity MP3s for immediate rich playback in iframe
const DEFAULT_PRELOADS: Song[] = [
  {
    id: "cs-horizons",
    name: "Neon Horizons",
    artist: "CS Estúdio",
    album: "Synthwave Odyssey",
    genre: "Synthwave",
    year: 2026,
    coverUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=600&auto=format&fit=crop&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    lyrics: "Luzes piscam na cidade vazia\nO horizonte brilha em neon azul\nSinto a batida guiar meus passos\nSeguindo o asfalto em direção ao sul\n\n(Refrão)\nNeon Horizons vão nos levar\nOnde a noite nunca vai acabar\nSe perca na frequência desse som\nO CS Estúdio dita o tom\n\nViajando através do tempo e espaço\nNa velocidade constante do sintetizador\nEsquecendo de todas as dores do mundo\nVivendo apenas a melodia e o amor.",
    plays: 1420,
    candidateArtists: [
      { name: "Roberto Carlos", votes: 45, imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" },
      { name: "Luan Santana", votes: 32, imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face" },
      { name: "Alok", votes: 88, imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face" },
      { name: "Anitta", votes: 19, imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face" }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "cs-lofibeats",
    name: "Café de Outono",
    artist: "CS Estúdio",
    album: "Chill Lo-Fi Sessions",
    genre: "Lo-Fi",
    year: 2025,
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    lyrics: "Gosto de café morno nas manhãs cinzentas\nA chuva bate leve de leve na janela\nA batida abafada conforta o peito\nLembranças de uma estação amarela\n\n(Instrumental chill)\n\nDeixe o som acalmar seus pensamentos\nO ruído do vinil gira sem parar\nUm gole de inspiração e paciência\nO CS Estúdio ajuda a respirar.",
    plays: 980,
    candidateArtists: [
      { name: "Caetano Veloso", votes: 15, imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" },
      { name: "Marisa Monte", votes: 54, imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face" },
      { name: "Chico Buarque", votes: 29, imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face" },
      { name: "Silva", votes: 41, imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face" }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "cs-cyberpunk",
    name: "Digital Rebellion",
    artist: "CS Estúdio",
    album: "Metropolis 2099",
    genre: "Cyberpunk",
    year: 2026,
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    lyrics: "Cérebros conectados na grande rede\nSem privacidade, sem controle, sem paz\nMas abaixo dos cabos de fibra óptica\nNós fazemos a música que o sistema desfaz\n\n(Refrão)\nRebelião Digital!\nSob as sombras corporativas\nNossas frequências continuam vivas\nA frequência do amanhã!\n\nCodifique, decole, transmita!\nO som cibernético que agita.",
    plays: 2310,
    candidateArtists: [
      { name: "Pitty", votes: 62, imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face" },
      { name: "Vintage Culture", votes: 95, imageUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&h=150&fit=crop&crop=face" },
      { name: "Supla", votes: 12, imageUrl: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=150&h=150&fit=crop&crop=face" },
      { name: "Andreas Kisser", votes: 40, imageUrl: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150&h=150&fit=crop&crop=face" }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "cs-acoustic",
    name: "Vento da Alvorada",
    artist: "CS Estúdio",
    album: "Singles Acústicos",
    genre: "Acoustic",
    year: 2026,
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    lyrics: "Corda por corda conto os segredos do dia\nQue nasce por cima da grande serra verde\nO vento fresco desata os nós da corda\nE mata do cansaço a nossa sede\n\n(Solo de Violão)\n\nFiz essa canção simples para te lembrar\nQue o sol amanhã vai brilhar de novo\nE o CS Estúdio vai cantar com as vozes do povo.",
    plays: 750,
    candidateArtists: [
      { name: "Ana Vitória", votes: 73, imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face" },
      { name: "Tiago Iorc", votes: 50, imageUrl: "https://images.unsplash.com/photo-1504257404162-c3b99b9e1715?w=150&h=150&fit=crop&crop=face" },
      { name: "Rubel", votes: 31, imageUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&crop=face" },
      { name: "Vitor Kley", votes: 18, imageUrl: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=150&h=150&fit=crop&crop=face" }
    ],
    createdAt: new Date().toISOString()
  }
];

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>('regular');
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cs_liked_songs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [likedPlaylists, setLikedPlaylists] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cs_liked_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cs_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Synchronize guest favorites and history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cs_liked_songs', JSON.stringify(likedSongs));
    } catch (e) {
      console.error("Failed to save liked songs to localStorage: ", e);
    }
  }, [likedSongs]);

  useEffect(() => {
    try {
      localStorage.setItem('cs_liked_playlists', JSON.stringify(likedPlaylists));
    } catch (e) {
      console.error("Failed to save liked playlists to localStorage: ", e);
    }
  }, [likedPlaylists]);

  useEffect(() => {
    try {
      localStorage.setItem('cs_history', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage: ", e);
    }
  }, [history]);

  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('cs_user_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cs_user_playlists', JSON.stringify(customPlaylists));
    } catch (e) {
      console.error("Failed to save custom playlists to localStorage: ", e);
    }
  }, [customPlaylists]);

  const createPlaylist = (name: string, description?: string) => {
    const playlistId = 'pl_' + Math.random().toString(36).substring(2, 9);
    const createdBy = auth.currentUser ? auth.currentUser.uid : 'guest';
    const newPlaylist: Playlist = {
      id: playlistId,
      name,
      description: description || 'Playlist pessoal criada no CS Music',
      coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
      songIds: [],
      createdBy,
      createdAt: new Date().toISOString()
    };

    if (auth.currentUser) {
      setDoc(doc(db, 'playlists', playlistId), newPlaylist).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `playlists/${playlistId}`);
      });
    } else {
      setCustomPlaylists(prev => [...prev, newPlaylist]);
    }
    return newPlaylist;
  };

  const deletePlaylist = (playlistId: string) => {
    if (auth.currentUser) {
      deleteDoc(doc(db, 'playlists', playlistId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `playlists/${playlistId}`);
      });
    } else {
      setCustomPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    }
  };

  const addSongToPlaylist = (playlistId: string, songId: string) => {
    if (auth.currentUser) {
      updateDoc(doc(db, 'playlists', playlistId), {
        songIds: arrayUnion(songId)
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `playlists/${playlistId}`);
      });
    } else {
      setCustomPlaylists(prev => prev.map(pl => {
        if (pl.id === playlistId) {
          if (pl.songIds.includes(songId)) return pl;
          return {
            ...pl,
            songIds: [...pl.songIds, songId]
          };
        }
        return pl;
      }));
    }
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    if (auth.currentUser) {
      updateDoc(doc(db, 'playlists', playlistId), {
        songIds: arrayRemove(songId)
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `playlists/${playlistId}`);
      });
    } else {
      setCustomPlaylists(prev => prev.map(pl => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            songIds: pl.songIds.filter(id => id !== songId)
          };
        }
        return pl;
      }));
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load and bootstrap songs in Firestore if empty
  const fetchSongs = async () => {
    setIsLoadingSongs(true);
    const path = 'songs';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      if (querySnapshot.empty) {
        // Bootstrap Default Preloaded Songs!
        for (const s of DEFAULT_PRELOADS) {
          await setDoc(doc(db, 'songs', s.id), s);
        }
        setSongs(DEFAULT_PRELOADS);
      } else {
        const loadedSongs: Song[] = [];
        querySnapshot.forEach((docSnap) => {
          loadedSongs.push(docSnap.data() as Song);
        });
        // Sort songs by plays desc to show best first, or by createdAt
        loadedSongs.sort((a, b) => b.plays - a.plays);
        setSongs(loadedSongs);
      }
    } catch (error) {
      console.error("Failed to load songs from Firestore: ", error);
      // Fallback local if firebase quota is exhausted
      setSongs(DEFAULT_PRELOADS);
    } finally {
      setIsLoadingSongs(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const reloadSongs = async () => {
    await fetchSongs();
  };

  // Listen to Auth changes to fetch / initialize user profiles
  useEffect(() => {
    let activeUnsubProfile: (() => void) | null = null;
    let activeUnsubPlaylists: (() => void) | null = null;

    const unsub = auth.onAuthStateChanged(async (user) => {
      // Clean up previous listeners if any
      if (activeUnsubProfile) {
        activeUnsubProfile();
        activeUnsubProfile = null;
      }
      if (activeUnsubPlaylists) {
        activeUnsubPlaylists();
        activeUnsubPlaylists = null;
      }

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Listen to realtime user profile updates (likes, admin flags)
        activeUnsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUserProfile(data);
            setLikedSongs(data.likedSongs || []);
            setLikedPlaylists(data.likedPlaylists || []);
          } else {
            // First time registration inside Firestore
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuário CS',
              likedSongs: [],
              likedPlaylists: [],
              isAdmin: user.email === 'carlosrs.email@gmail.com', // Autoset developer as admin
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
              setLikedSongs([]);
              setLikedPlaylists([]);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
            }
          }
        }, (err) => {
          console.warn("Realtime profile listening restricted or failed: ", err);
        });

        // Listen to realtime custom playlists where createdBy matches the current user uid
        try {
          const playlistsColRef = collection(db, 'playlists');
          const userPlaylistsQuery = query(playlistsColRef, where('createdBy', '==', user.uid));
          activeUnsubPlaylists = onSnapshot(userPlaylistsQuery, (querySnapshot) => {
            const loadedPlaylists: Playlist[] = [];
            querySnapshot.forEach((docSnap) => {
              loadedPlaylists.push(docSnap.data() as Playlist);
            });
            setCustomPlaylists(loadedPlaylists);
          }, (err) => {
            console.warn("Failed to listen to custom playlists: ", err);
          });
        } catch (err) {
          console.error("Could not construct custom playlist listener: ", err);
        }

      } else {
        setUserProfile(null);
        // Persist local guest favorites from localStorage
        try {
          const localSongs = localStorage.getItem('cs_liked_songs');
          if (localSongs) setLikedSongs(JSON.parse(localSongs));
        } catch {}
        try {
          const localPlaylists = localStorage.getItem('cs_liked_playlists');
          if (localPlaylists) setLikedPlaylists(JSON.parse(localPlaylists));
        } catch {}
        try {
          const localHistory = localStorage.getItem('cs_history');
          if (localHistory) setHistory(JSON.parse(localHistory));
        } catch {}
        try {
          const localPlaylists = localStorage.getItem('cs_user_playlists');
          if (localPlaylists) {
            setCustomPlaylists(JSON.parse(localPlaylists));
          } else {
            setCustomPlaylists([]);
          }
        } catch {}
      }
    });

    return () => {
      unsub();
      if (activeUnsubProfile) activeUnsubProfile();
      if (activeUnsubPlaylists) activeUnsubPlaylists();
    };
  }, []);

  // A ref to keep track of the absolute latest state to completely avoid any stale closures in HTML5 Audio event listeners
  const playerStateRef = useRef({
    queue: [] as Song[],
    currentIndex: -1,
    playMode: 'regular' as PlayMode,
    songs: [] as Song[]
  });

  // Keep the ref strictly up-to-date
  useEffect(() => {
    playerStateRef.current = {
      queue,
      currentIndex,
      playMode,
      songs
    };
  }, [queue, currentIndex, playMode, songs]);

  // Sync state parameters to HTML5 audio element (Initialize once to avoid resetting playback on state updates)
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Listen for song completion and play next separately so we don't recreate the Audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const { playMode: currentPlayMode } = playerStateRef.current;
      if (currentPlayMode === 'repeat') {
        audio.currentTime = 0;
        audio.play().catch(err => console.log("Audio replay error: ", err));
      } else {
        handleNextSong();
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Sync mute and volume level changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Method to increment play count
  const recordListen = async (songId: string) => {
    try {
      const songRef = doc(db, 'songs', songId);
      await updateDoc(songRef, {
        plays: increment(1)
      });
      // Update local copy too
      setSongs(prev => prev.map(s => s.id === songId ? { ...s, plays: s.plays + 1 } : s));
    } catch (e) {
      console.warn("Could not increment plays counter in Firestore: ", e);
    }
  };

  const playSong = async (song: Song, customQueue?: Song[]) => {
    if (!audioRef.current) return;

    // Record previous song to history
    if (currentSong && !history.includes(currentSong.id)) {
      setHistory(prev => [currentSong.id, ...prev.slice(0, 19)]); // keep max 20
    }

    const currentQ = customQueue || songs;
    setQueue(currentQ);
    
    const index = currentQ.findIndex(s => s.id === song.id);
    setCurrentIndex(index >= 0 ? index : 0);
    setCurrentSong(song);

    audioRef.current.src = song.audioUrl;
    audioRef.current.load();
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      recordListen(song.id);
    } catch (err) {
      console.error("Audio playback policy blocker triggered. Ready to play on user gesture", err);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.log("Play failed: ", err));
    }
  };

  const handleNextSong = () => {
    const { queue: currentQueue, currentIndex: currentIdx, playMode: currentPlayMode, songs: allSongs } = playerStateRef.current;
    const activeQueue = currentQueue.length > 0 ? currentQueue : allSongs;
    if (activeQueue.length === 0) return;
    
    let nextIdx = currentIdx;

    if (currentPlayMode === 'shuffle') {
      nextIdx = Math.floor(Math.random() * activeQueue.length);
    } else {
      nextIdx = (currentIdx + 1) % activeQueue.length;
    }

    const nextTrack = activeQueue[nextIdx];
    if (nextTrack) {
      playSong(nextTrack, activeQueue);
    }
  };

  const handlePrevSong = () => {
    const { queue: currentQueue, currentIndex: currentIdx, playMode: currentPlayMode, songs: allSongs } = playerStateRef.current;
    const activeQueue = currentQueue.length > 0 ? currentQueue : allSongs;
    if (activeQueue.length === 0) return;
    
    let prevIdx = currentIdx;
    if (currentPlayMode === 'shuffle') {
      prevIdx = Math.floor(Math.random() * activeQueue.length);
    } else {
      prevIdx = currentIdx - 1;
      if (prevIdx < 0) {
        prevIdx = activeQueue.length - 1;
      }
    }

    const prevTrack = activeQueue[prevIdx];
    if (prevTrack) {
      playSong(prevTrack, activeQueue);
    }
  };

  const updateQueue = (newQueue: Song[]) => {
    setQueue(newQueue);
    if (currentSong) {
      const idx = newQueue.findIndex(s => s.id === currentSong.id);
      setCurrentIndex(idx >= 0 ? idx : -1);
    } else {
      setCurrentIndex(-1);
    }
  };

  const seek = (percent: number) => {
    if (!audioRef.current || !duration) return;
    const targetTime = (percent / 100) * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    setProgress(percent);
  };

  const setVolume = (vol: number) => {
    const safeVol = Math.max(0, Math.min(1, vol));
    setVolumeState(safeVol);
    if (safeVol > 0) {
      setIsMuted(false);
    }
  };

  const toggleLikeSong = async (songId: string) => {
    if (!auth.currentUser) {
      // Offline / Local guest favorites mode using state fallback
      if (likedSongs.includes(songId)) {
        setLikedSongs(prev => prev.filter(id => id !== songId));
      } else {
        setLikedSongs(prev => [...prev, songId]);
      }
      return;
    }

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const isLiked = likedSongs.includes(songId);

    try {
      await updateDoc(userDocRef, {
        likedSongs: isLiked ? arrayRemove(songId) : arrayUnion(songId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const toggleLikePlaylist = async (playlistId: string) => {
    if (!auth.currentUser) {
      if (likedPlaylists.includes(playlistId)) {
        setLikedPlaylists(prev => prev.filter(id => id !== playlistId));
      } else {
        setLikedPlaylists(prev => [...prev, playlistId]);
      }
      return;
    }

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const isLiked = likedPlaylists.includes(playlistId);

    try {
      await updateDoc(userDocRef, {
        likedPlaylists: isLiked ? arrayRemove(playlistId) : arrayUnion(playlistId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const voteCandidate = async (songId: string, artistName: string) => {
    const targetSong = songs.find(s => s.id === songId);
    if (!targetSong) return;

    // Initialize candidateArtists if it doesn't exist
    const currentCandidates = targetSong.candidateArtists || [
      { name: "Roberto Carlos", votes: 0 },
      { name: "Luan Santana", votes: 0 },
      { name: "Alok", votes: 0 },
      { name: "Anitta", votes: 0 }
    ];

    const updatedCandidates = currentCandidates.map(candidate => {
      if (candidate.name.toLowerCase() === artistName.toLowerCase()) {
        return { ...candidate, votes: candidate.votes + 1 };
      }
      return candidate;
    });

    const updatedSongs = songs.map(s => {
      if (s.id === songId) {
        return { ...s, candidateArtists: updatedCandidates };
      }
      return s;
    });
    setSongs(updatedSongs);

    if (currentSong && currentSong.id === songId) {
      setCurrentSong({ ...currentSong, candidateArtists: updatedCandidates });
    }

    try {
      const songRef = doc(db, 'songs', songId);
      await updateDoc(songRef, {
        candidateArtists: updatedCandidates
      });
    } catch (err) {
      console.warn("Failed to write vote to Firestore (likely rules or connection), trying setDoc:", err);
      try {
        const songRef = doc(db, 'songs', songId);
        await setDoc(songRef, { ...targetSong, candidateArtists: updatedCandidates }, { merge: true });
      } catch (innerErr) {
        console.error("Failed to write vote with setDoc:", innerErr);
        const storedLocalVotes = JSON.parse(localStorage.getItem('cs_local_votes') || '{}');
        const songVotes = storedLocalVotes[songId] || {};
        songVotes[artistName] = (songVotes[artistName] || 0) + 1;
        storedLocalVotes[songId] = songVotes;
        localStorage.setItem('cs_local_votes', JSON.stringify(storedLocalVotes));
      }
    }
  };

  return (
    <AudioContext.Provider value={{
      currentSong,
      isPlaying,
      queue,
      currentIndex,
      progress,
      currentTime,
      duration,
      volume,
      isMuted,
      playMode,
      isLyricsExpanded,
      setIsLyricsExpanded,
      likedSongs,
      likedPlaylists,
      history,
      songs,
      isLoadingSongs,
      userProfile,
      playSong,
      togglePlay,
      nextSong: handleNextSong,
      prevSong: handlePrevSong,
      seek,
      setVolume,
      setMuted: setIsMuted,
      setPlayMode,
      toggleLikeSong,
      toggleLikePlaylist,
      recordListen,
      reloadSongs,
      updateQueue,
      customPlaylists,
      createPlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      voteCandidate
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

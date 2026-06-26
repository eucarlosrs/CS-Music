import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { Song } from '../types';
import { Search, Flame, Play, Music, ArrowRight, Disc, Sliders } from 'lucide-react';

export const SearchView: React.FC = () => {
  const { songs, playSong, currentSong, isPlaying, togglePlay } = useAudio();
  const [query, setQuery] = useState('');

  // Baseline Brazilian and standard electronic genres
  const BASELINE_GENRES = [
    'Samba',
    'Bossa Nova',
    'MPB',
    'Sertanejo',
    'Pagode',
    'Forró',
    'Funk',
    'Axé',
    'Rock Nacional',
    'Lo-Fi',
    'Acoustic'
  ];

  const formatGenre = (g: string) => {
    if (!g) return '';
    const trimmed = g.trim();
    if (trimmed.toUpperCase() === 'MPB') return 'MPB';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const songGenres: string[] = Array.from(
    new Set<string>(
      songs.flatMap(s => [
        formatGenre(s.genre),
        s.secondGenre ? formatGenre(s.secondGenre) : ''
      ]).filter(Boolean)
    )
  );

  const tags: string[] = Array.from(new Set<string>([
    ...BASELINE_GENRES.map(formatGenre),
    ...songGenres
  ])).slice(0, 12); // Limit to top 12 cards for a balanced layout grid

  const GENRE_COLORS: Record<string, string> = {
    'Samba': 'bg-[#1E3264]', // Brasil deep indigo-blue
    'Bossa Nova': 'bg-[#2E77D0]', // Spotify bright blue
    'Mpb': 'bg-[#E50914]', // Red
    'Sertanejo': 'bg-[#E68403]', // Warm orange/ochre
    'Pagode': 'bg-[#E81156]', // Deep pink
    'Forró': 'bg-[#BC4C2A]', // Ochre/bronze
    'Funk': 'bg-[#2D46B9]', // Vibrant Blue
    'Axé': 'bg-[#8D67AB]', // Purple/violet
    'Rock Nacional': 'bg-[#118A7E]', // Teal
    'Lo-Fi': 'bg-[#503750]', // Eggplant
    'Acoustic': 'bg-[#911B35]', // Crimson / Burgundy
  };

  const FALLBACK_COLORS = [
    'bg-[#1E3264]',
    'bg-[#E81156]',
    'bg-[#148A08]',
    'bg-[#D84000]',
    'bg-[#E8125C]',
    'bg-[#8D67AB]',
    'bg-[#7D4B32]',
    'bg-[#00E5FF]/80',
    'bg-[#9D50BB]/90',
    'bg-[#503750]',
  ];

  const getGenreColor = (genre: string, idx: number) => {
    const formatted = formatGenre(genre);
    const mapped = GENRE_COLORS[formatted];
    if (mapped) return mapped;
    return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  };

  const getGenreCover = (genre: string) => {
    const matchingSong = songs.find(
      s => s.genre.toLowerCase() === genre.toLowerCase() || 
           (s.secondGenre && s.secondGenre.toLowerCase() === genre.toLowerCase())
    );
    return matchingSong ? matchingSong.coverUrl : 'https://lh3.googleusercontent.com/d/1kpzAB3S4ebv0fz1CdBlB2Rbx0kLYCJJe';
  };

  const results = query.trim() !== ''
    ? songs.filter(song => 
        song.name.toLowerCase().includes(query.toLowerCase()) ||
        song.album.toLowerCase().includes(query.toLowerCase()) ||
        song.genre.toLowerCase().includes(query.toLowerCase()) ||
        (song.secondGenre && song.secondGenre.toLowerCase().includes(query.toLowerCase())) ||
        song.artist.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleTrackClick = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      const activeQueue = results.length > 0 ? results : songs;
      playSong(song, activeQueue);
    }
  };

  return (
    <div id="search-view-container" className="pb-32 space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buscar</h1>
        <p className="text-xs text-[#71717A] font-semibold mt-0.5">Pesquise por músicas, álbuns, estilos e muito mais do CS Estúdio.</p>
      </div>

      {/* Modern Neon Search query input */}
      <div className="relative shadow-lg">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-zinc-800" />
        <input 
          id="search-input-field"
          type="text" 
          placeholder="O que você quer ouvir?"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white text-zinc-950 border border-transparent focus:outline-none rounded-xl text-sm font-semibold placeholder-zinc-500 transition duration-300"
        />
      </div>

      {/* Grid of quick search tags */}
      {query.trim() === '' && (
        <div id="quick-search-genres-view" className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Navegar por gênero de produções</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pb-4">
            {tags.map((tag, idx) => {
              const bgColor = getGenreColor(tag, idx);
              const coverUrl = getGenreCover(tag);
              return (
                <div 
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className={`relative h-28 ${bgColor} rounded-xl overflow-hidden cursor-pointer select-none group shadow-lg border border-black/15`}
                >
                  <span className="absolute left-3 top-3 text-sm sm:text-base font-black text-white tracking-tight leading-4 break-words max-w-[65%] text-left">
                    {tag}
                  </span>
                  
                  {/* Tilted / rotated album cover on the bottom right corner exactly like Spotify */}
                  <div className="absolute -right-3 -bottom-3 w-16 h-16 sm:w-18 sm:h-18 rotate-[24deg] transform translate-x-1 translate-y-1 group-hover:scale-115 group-hover:rotate-[15deg] transition-all duration-300 shadow-2xl rounded-md overflow-hidden select-none">
                    <img 
                      src={coverUrl} 
                      alt="" 
                      className="w-full h-full object-cover select-none"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://lh3.googleusercontent.com/d/1kpzAB3S4ebv0fz1CdBlB2Rbx0kLYCJJe';
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick popular shortcut */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717A] flex items-center gap-1">
              <Flame className="w-4 h-4 text-[#00E5FF] shrink-0" /> Buscas Recomendadas
            </h3>
            <div className="space-y-1">
              {songs.slice(0, 3).map((song) => (
                <div 
                  key={song.id}
                  onClick={() => handleTrackClick(song)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#18181B] cursor-pointer border border-transparent hover:border-[#1F1F22] transition"
                >
                  <img src={song.coverUrl} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{song.name}</h4>
                    <p className="text-[10px] text-[#A1A1AA] truncate">{song.album}</p>
                  </div>
                  <span className="p-1.5 rounded-full bg-[#18181B] border border-[#27272A] hover:bg-[#00E5FF] hover:text-black hover:border-transparent transition text-[#A1A1AA]">
                    <Play className="w-3.5 h-3.5 fill-current pl-0.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search results List view */}
      {query.trim() !== '' && (
        <div id="search-results-viewport" className="space-y-4">
          <h2 className="text-sm font-bold text-[#A1A1AA]">
            Encontrado {results.length} resultado{results.length !== 1 ? 's' : ''} para <span className="text-[#00E5FF] italic">"{query}"</span>
          </h2>

          <div className="space-y-2">
            {results.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={song.id}
                  onClick={() => handleTrackClick(song)}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition ${
                    isCurrent ? 'bg-[#27272A]/80 border border-[#00E5FF]/15' : 'hover:bg-[#18181B]'
                  }`}
                >
                  <img src={song.coverUrl} alt="" className="w-10 h-10 object-cover rounded-xl shrink-0 animate-fade-in" referrerPolicy="no-referrer" />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-extrabold truncate ${isCurrent ? 'text-[#00E5FF]' : 'text-white'}`}>
                      {song.name}
                    </h4>
                    <p className="text-[10px] text-[#A1A1AA] truncate mt-0.5">
                      {song.album} • {song.genre}{song.secondGenre ? ` + ${song.secondGenre}` : ''}
                    </p>
                  </div>

                  <span className="text-[10px] text-[#71717A] font-mono font-bold">{song.plays.toLocaleString()} reproduções</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

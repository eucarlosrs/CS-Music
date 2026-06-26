import React, { useState, useEffect, useMemo } from 'react';
import { useAudio } from '../context/AudioContext';
import { Song, Playlist } from '../types';
import { Play, Pause, Flame, Music, Disc, Sparkles, Filter, Clock, ShieldAlert, Sparkle, ShoppingBag, ChevronDown, ChevronUp, FolderHeart, Heart, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LicensingModal } from './LicensingModal';

interface HomeFeedProps {
  onSelectCategory: (category: string) => void;
  activeCategory: string | null;
  onNavigateToTab?: (tab: 'inicio' | 'buscar' | 'biblioteca' | 'artista' | 'admin') => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ onSelectCategory, activeCategory, onNavigateToTab }) => {
  const { songs, playSong, currentSong, isPlaying, togglePlay, userProfile, likedPlaylists, customPlaylists, likedSongs } = useAudio();
  const [selectedLicensingSong, setSelectedLicensingSong] = useState<Song | null>(null);
  const [isGenresExpanded, setIsGenresExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-dismiss toast helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  // Titlecase formatting helper
  const formatGenre = (g: string) => {
    if (!g) return '';
    const trimmed = g.trim();
    if (trimmed.toUpperCase() === 'MPB') return 'MPB';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  // Extract unique styles currently present in the active song catalogue
  const songGenres: string[] = Array.from(
    new Set<string>(
      songs.flatMap(s => [
        formatGenre(s.genre),
        s.secondGenre ? formatGenre(s.secondGenre) : ''
      ]).filter(Boolean)
    )
  );

  // Combine baseline plus actual uploaded styles dynamically
  const allGenresMapped: string[] = [
    'Todas',
    ...Array.from(new Set<string>([
      ...BASELINE_GENRES.map(formatGenre),
      ...songGenres
    ]))
  ];

  // Genres shown in the initial collapsed view (popular/curated subset)
  const collapsedBaseline = ['Todas', 'Sertanejo', 'MPB', 'Bossa Nova', 'Samba', 'Lo-Fi'];
  
  // Show popular ones, plus currently selected one if it's external, so it remains visible
  const visibleGenres = allGenresMapped.filter(g => 
    collapsedBaseline.includes(g) || 
    g === 'Todas' || 
    (activeCategory && formatGenre(activeCategory) === g)
  );

  // Filter songs based on current active category and search query
  const filteredSongs = useMemo(() => {
    let result = activeCategory && activeCategory !== 'Todas'
      ? songs.filter(s => 
          s.genre.toLowerCase() === activeCategory.toLowerCase() ||
          (s.secondGenre && s.secondGenre.toLowerCase() === activeCategory.toLowerCase())
        )
      : songs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        (s.secondGenre && s.secondGenre.toLowerCase().includes(q))
      );
    }

    if (activeCategory && activeCategory !== 'Todas') {
      return [...result].sort(() => 0.5 - Math.random());
    }
    return result;
  }, [activeCategory, songs, searchQuery]);

  const handleTrackClick = (song: Song, listContext: Song[] = filteredSongs) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, listContext);
    }
  };

  // Get songs for the popular songs carousel, filtering by active category and search query
  const popularSongs = useMemo(() => {
    if (!songs || songs.length === 0) return [];
    let result = songs;

    if (activeCategory && activeCategory !== 'Todas') {
      result = songs.filter(s => 
        s.genre.toLowerCase() === activeCategory.toLowerCase() ||
        (s.secondGenre && s.secondGenre.toLowerCase() === activeCategory.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        (s.secondGenre && s.secondGenre.toLowerCase().includes(q))
      );
    }

    return [...result].sort(() => 0.5 - Math.random());
  }, [songs, activeCategory, searchQuery]);

  const [popularPageIndex, setPopularPageIndex] = useState(0);

  // Reset page index to 0 whenever the category changes
  useEffect(() => {
    setPopularPageIndex(0);
  }, [activeCategory]);
  const [popularSlideDirection, setPopularSlideDirection] = useState<'left' | 'right'>('right');

  const popularPageSize = 4;
  const totalPopularPages = Math.ceil(popularSongs.length / popularPageSize);

  // Safely adjust page index if totalPopularPages changes
  useEffect(() => {
    if (popularPageIndex >= totalPopularPages && totalPopularPages > 0) {
      setPopularPageIndex(totalPopularPages - 1);
    }
  }, [totalPopularPages, popularPageIndex]);

  const currentPageSongs = useMemo(() => {
    const start = popularPageIndex * popularPageSize;
    return popularSongs.slice(start, start + popularPageSize);
  }, [popularSongs, popularPageIndex]);

  const handleNextPopularPage = () => {
    if (totalPopularPages > 0) {
      setPopularSlideDirection('right');
      setPopularPageIndex(prev => (prev + 1) % totalPopularPages);
    }
  };

  const handlePrevPopularPage = () => {
    if (totalPopularPages > 0) {
      setPopularSlideDirection('left');
      setPopularPageIndex(prev => (prev - 1 + totalPopularPages) % totalPopularPages);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (totalPopularPages > 0) {
      if (info.offset.x < -swipeThreshold) {
        // Swiped left (dragged left) -> next page
        setPopularSlideDirection('right');
        setPopularPageIndex(prev => (prev + 1) % totalPopularPages);
      } else if (info.offset.x > swipeThreshold) {
        // Swiped right (dragged right) -> prev page
        setPopularSlideDirection('left');
        setPopularPageIndex(prev => (prev - 1 + totalPopularPages) % totalPopularPages);
      }
    }
  };

  // Carousel transition animation variants
  const carouselVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? 150 : -150,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? -150 : 150,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  // System preloaded playlists
  const playlists: Playlist[] = [
    {
      id: "pl_energetic",
      name: "Foco & Energia",
      description: "Combinações eletrônicas intensas para programação ou gaming.",
      coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80",
      songIds: songs.filter(s => ['Synthwave', 'Cyberpunk'].includes(s.genre)).map(s => s.id),
      createdBy: "system",
      createdAt: new Date().toISOString()
    },
    {
      id: "pl_relaxing",
      name: "Cafézinho Lo-Fi",
      description: "Acústicos e batidas lentas ideais para noites relaxantes e estudo.",
      coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80",
      songIds: songs.filter(s => ['Lo-Fi', 'Acoustic'].includes(s.genre)).map(s => s.id),
      createdBy: "system",
      createdAt: new Date().toISOString()
    }
  ];

  return (
    <div id="home-feed-container" className="pb-32 space-y-5 text-white">
      {/* 1. HERO GRADIENT BANNER PANEL */}
      <div className="relative min-h-[220px] sm:min-h-[240px] rounded-3xl overflow-hidden shadow-xl flex items-center p-6 sm:p-8">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop')` }}
        />
        {/* Elegant Dark neon cyan and purple shade layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00E5FF]/30 to-[#9D50BB]/30 z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-[#050505]/90 z-10" />

        {/* Content detail overlay */}
        <div className="relative z-10 max-w-xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/20 uppercase tracking-widest shadow">
            <Sparkle className="w-3.5 h-3.5 fill-[#00E5FF] animate-pulse text-[#00E5FF]" /> Apoio à Cultura Musical
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight text-white font-sans">
            O hit de amanhã está aqui na CS Music... <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#D4AF37]">e pode ser seu!</span>
          </h2>
          <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed max-w-xl font-medium font-sans">
            Se apaixonou ou se arrepiou com o hit? O som pode ser seu! Você escolhe o valor que deseja pagar a partir de <strong>R$ 30,00</strong> e a licença comercial com os arquivos completos já é seu definitivamente.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
            <button 
              onClick={() => {
                const targetSong = filteredSongs.length > 0 ? filteredSongs[0] : (songs.length > 0 ? songs[0] : null);
                if (targetSong) {
                  handleTrackClick(targetSong, filteredSongs.length > 0 ? filteredSongs : songs);
                }
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#00E5FF] hover:bg-[#00E5FF]/90 hover:scale-[1.02] active:scale-95 text-black font-black text-xs rounded-xl shadow-lg shadow-[#00E5FF]/25 transition cursor-pointer font-sans"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Ouvir Lançamentos
            </button>
            <p className="text-[#D4AF37] text-[11.5px] sm:text-xs font-semibold italic tracking-wide font-sans self-center leading-relaxed">
              "Porque grandes sucessos não têm preço fixo. Eles têm valor para quem acredita neles."
            </p>
          </div>
        </div>
      </div>

      {/* 2. INSTANT SEARCH CHIPS / CATEGORIES STRIP */}
      <div className="space-y-3">
        {/* Search input field */}
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="w-4 h-4 text-zinc-500 group-focus-within:text-[#00E5FF] transition-colors" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por música, artista ou estilo..."
            className="w-full pl-10 pr-10 py-3 bg-[#121214]/95 border border-[#27272A] hover:border-[#BF5AF2]/50 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/25 rounded-2xl text-xs text-white placeholder-zinc-500 transition duration-300 font-sans shadow-lg shadow-black/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#A1A1AA] hover:text-[#00E5FF] transition cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <h3 className="text-xs font-extrabold text-[#71717A] uppercase tracking-widest flex items-center gap-1 leading-none">
            <Filter className="w-3.5 h-3.5 text-[#00E5FF]" /> Filtrar por Estilo
          </h3>
          <button
            onClick={() => setIsGenresExpanded(!isGenresExpanded)}
            className="text-[10px] font-bold text-[#00E5FF] hover:text-[#00E5FF]/80 transition flex items-center gap-1 bg-[#18181B] hover:bg-[#27272A] px-2.5 py-1.5 rounded-xl border border-[#1F1F22] cursor-pointer"
          >
            <span>{isGenresExpanded ? 'Ver Menos' : 'Ver Todos'}</span>
            {isGenresExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isGenresExpanded ? (
            <motion.div 
              key="expanded-genres"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2.5 pt-1.5 pb-2.5">
                {allGenresMapped.map((cat) => {
                  const isSelected = activeCategory === cat || (!activeCategory && cat === 'Todas');
                  return (
                    <button
                      key={cat}
                      onClick={() => onSelectCategory(cat)}
                      className={`px-4 py-2 text-xs font-bold rounded-full transition border uppercase tracking-wider cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-[#00E5FF] to-[#9D50BB] text-black border-transparent shadow-lg font-extrabold shadow-[#00E5FF]/10 scale-105' 
                          : 'bg-[#18181B] border-[#1F1F22] text-[#A1A1AA] hover:text-white hover:border-[#27272A]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="collapsed-genres"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
            >
              {visibleGenres.map((cat) => {
                const isSelected = activeCategory === cat || (!activeCategory && cat === 'Todas');
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={`px-4 py-2 text-xs font-bold rounded-full transition border uppercase tracking-wider shrink-0 whitespace-nowrap cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-[#00E5FF] to-[#9D50BB] text-black border-transparent shadow-md font-extrabold' 
                        : 'bg-[#18181B] border-[#1F1F22] text-[#A1A1AA] hover:text-white hover:border-[#27272A]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              <button
                onClick={() => setIsGenresExpanded(true)}
                className="px-4 py-2 text-xs font-bold rounded-full transition border border-dashed border-[#27272A] bg-[#18181B]/40 hover:bg-[#18181B] hover:border-[#3F3F46] text-[#00E5FF] hover:text-[#00E5FF]/85 shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1 font-extrabold uppercase tracking-wider"
              >
                <span>+ Ver Todos</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. MÚSICAS POPULARES SECTION */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-1.5 text-white">
            <Flame className="w-5 h-5 text-[#9D50BB]" />
            Músicas Populares
          </h2>
          
          {totalPopularPages > 1 && (
            <div className="flex items-center gap-3">
              {/* Pagination indicators (Dots) */}
              <div className="hidden sm:flex items-center gap-1.5 mr-1">
                {Array.from({ length: totalPopularPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPopularSlideDirection(idx > popularPageIndex ? 'right' : 'left');
                      setPopularPageIndex(idx);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === popularPageIndex 
                        ? 'bg-[#00E5FF] w-3 shadow-[0_0_8px_rgba(0,229,255,0.6)]' 
                        : 'bg-[#27272A] hover:bg-[#3F3F46]'
                    }`}
                    aria-label={`Ir para página ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Navigation arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevPopularPage}
                  className="p-1.5 rounded-lg border border-[#1F1F22] bg-[#18181B] text-white hover:border-[#00E5FF] hover:bg-[#27272A]/50 active:scale-95 transition duration-300 flex items-center justify-center cursor-pointer"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNextPopularPage}
                  className="p-1.5 rounded-lg border border-[#1F1F22] bg-[#18181B] text-white hover:border-[#00E5FF] hover:bg-[#27272A]/50 active:scale-95 transition duration-300 flex items-center justify-center cursor-pointer"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden w-full pb-2">
          <AnimatePresence mode="wait" custom={popularSlideDirection}>
            <motion.div
              key={popularPageIndex}
              custom={popularSlideDirection}
              variants={carouselVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 cursor-grab active:cursor-grabbing select-none touch-pan-y"
            >
              {currentPageSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div 
                    key={song.id}
                    onClick={() => handleTrackClick(song, popularSongs)}
                    className="w-full p-3.5 rounded-xl bg-[#18181B] border border-[#1F1F22] hover:border-[#27272A] hover:bg-[#27272A]/50 transition duration-300 group cursor-pointer flex flex-col justify-between h-full shadow-lg pointer-events-auto"
                  >
                    <div>
                      <div id={`song-artwork-container-popular-${song.id}`} className="relative aspect-square rounded-lg overflow-hidden mb-3 shadow select-none pointer-events-none">
                        <img 
                          src={song.coverUrl} 
                          alt={song.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          referrerPolicy="no-referrer"
                          draggable="false"
                        />
                        {/* Floating play state layout */}
                        <div className="absolute inset-0 bg-black/10 md:bg-black/40 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity flex items-center justify-center pointer-events-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackClick(song, popularSongs);
                            }}
                            className="relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full overflow-hidden border border-cyan-500/30 hover:border-fuchsia-500/60 shadow-[0_2px_10px_rgba(0,229,255,0.35)] hover:shadow-[0_4px_16px_rgba(236,72,153,0.5)] active:scale-95 transition duration-300 cursor-pointer"
                            aria-label={isCurrent && isPlaying ? "Pausar" : "Tocar"}
                          >
                            <img 
                              src="https://lh3.googleusercontent.com/d/1kpzAB3S4ebv0fz1CdBlB2Rbx0kLYCJJe" 
                              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
                              alt="Logo"
                              referrerPolicy="no-referrer"
                              draggable="false"
                            />
                            <div className="absolute inset-0 bg-black/45 hover:bg-black/25 flex items-center justify-center transition-colors">
                              {isCurrent && isPlaying ? (
                                <Pause className="w-4 h-4 text-white stroke-[2.5px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
                              ) : (
                                <Play className="w-4 h-4 text-white fill-white ml-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
                              )}
                            </div>
                          </button>
                        </div>
                        
                        {/* Elegant Genre Glass Badge Overlay */}
                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[8px] font-mono font-bold bg-[#050505]/85 backdrop-blur-sm text-[#00E5FF] border border-white/5 rounded-md uppercase tracking-wider shadow">
                          {song.genre}{song.secondGenre ? ` + ${song.secondGenre}` : ''}
                        </span>
                      </div>
                      <h4 className={`text-xs font-bold truncate leading-tight ${isCurrent ? 'text-[#00E5FF]' : 'text-[#F4F4F5]'}`}>
                        {song.name}
                      </h4>
                      <p className="text-[10px] text-[#71717A] truncate font-semibold mt-0.5">{song.artist}</p>
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-[#27272A]/60 pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLicensingSong(song);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/20 rounded-lg transition cursor-pointer"
                        title="Adquirir Licença (WAV/MP3)"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Comprar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 4. LANÇAMENTOS RECENTES GRID */}
      <div className="space-y-2.5">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-1.5 text-white">
          <Sparkles className="w-5 h-5 text-[#00E5FF]" />
          Lançamentos Recentes ({activeCategory || 'Todas'})
        </h2>

        {filteredSongs.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-[#18181B] rounded-2xl border border-neutral-800">
            Nenhuma música nesta categoria ainda.
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory pt-1">
            {filteredSongs.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={song.id}
                  onClick={() => handleTrackClick(song)}
                  className="w-[43%] sm:w-[30%] md:w-[22%] lg:w-[17.6%] shrink-0 snap-start snap-always p-3.5 rounded-xl bg-[#18181B] border border-transparent hover:border-[#27272A] hover:bg-[#27272A]/50 transition duration-300 group cursor-pointer flex flex-col justify-between h-full"
                >
                  <div>
                    <div id={`song-artwork-container-${song.id}`} className="relative aspect-square rounded-lg overflow-hidden mb-3 shadow">
                      <img 
                        src={song.coverUrl} 
                        alt={song.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        referrerPolicy="no-referrer"
                      />
                      {/* Floating play state layout */}
                      <div className="absolute inset-0 bg-black/10 md:bg-black/40 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackClick(song);
                          }}
                          className="relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full overflow-hidden border border-cyan-500/30 hover:border-fuchsia-500/60 shadow-[0_2px_10px_rgba(0,229,255,0.35)] hover:shadow-[0_4px_16px_rgba(236,72,153,0.5)] active:scale-95 transition duration-300 cursor-pointer"
                          aria-label={isCurrent && isPlaying ? "Pausar" : "Tocar"}
                        >
                          <img 
                            src="https://lh3.googleusercontent.com/d/1kpzAB3S4ebv0fz1CdBlB2Rbx0kLYCJJe" 
                            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
                            alt="Logo"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/45 hover:bg-black/25 flex items-center justify-center transition-colors">
                            {isCurrent && isPlaying ? (
                              <Pause className="w-4 h-4 text-white stroke-[2.5px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
                            ) : (
                              <Play className="w-4 h-4 text-white fill-white ml-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
                            )}
                          </div>
                        </button>
                      </div>
                      
                      {/* Elegant Genre Glass Badge Overlay */}
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[8px] font-mono font-bold bg-[#050505]/85 backdrop-blur-sm text-[#00E5FF] border border-white/5 rounded-md uppercase tracking-wider shadow">
                        {song.genre}{song.secondGenre ? ` + ${song.secondGenre}` : ''}
                      </span>
                    </div>
                    <h4 className={`text-xs font-bold truncate leading-tight ${isCurrent ? 'text-[#00E5FF]' : 'text-[#F4F4F5]'}`}>
                      {song.name}
                    </h4>
                    <p className="text-[10px] text-[#71717A] truncate font-semibold mt-0.5">{song.artist}</p>
                  </div>

                  <div className="mt-3.5 pt-2 border-t border-[#27272A]/60">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLicensingSong(song);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/20 rounded-lg transition cursor-pointer"
                      title="Adquirir Licença (WAV/MP3)"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Comprar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MÚSICAS CURTIDAS SECTION */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-1.5 text-white uppercase">
            <Heart className="w-5 h-5 text-red-500 fill-red-500/10" />
            Músicas Curtidas
          </h2>
          {songs.filter(s => likedSongs?.includes(s.id)).length > 0 && (
            <button
              onClick={() => onNavigateToTab?.('biblioteca')}
              className="text-[10px] text-[#00E5FF] hover:underline font-bold transition flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            >
              Ver Todas
            </button>
          )}
        </div>

        <div className="bg-[#111113] border border-[#1F1F22]/80 rounded-2xl p-4 space-y-1.5 shadow-xl">
          {(() => {
            const likedTracks = songs.filter(s => likedSongs?.includes(s.id));
            const latest6Liked = [...likedTracks].reverse().slice(0, 6);

            if (latest6Liked.length === 0) {
              return (
                <div className="py-8 text-center text-xs text-[#71717A] space-y-2">
                  <Heart className="w-6 h-6 text-[#27272A] mx-auto" />
                  <p>Você ainda não curtiu nenhuma música.</p>
                </div>
              );
            }

            return latest6Liked.map((song, idx) => {
              return (
                <div 
                  key={song.id}
                  onClick={() => playSong(song, likedTracks)}
                  className="flex items-center gap-3.5 py-2.5 px-3 hover:bg-[#27272A]/35 rounded-xl transition duration-300 group cursor-pointer"
                >
                  {/* Rank/Index number */}
                  <span className="text-[#52525B] text-xs font-bold w-4 shrink-0 text-center">
                    {idx + 1}
                  </span>
                  
                  {/* Song cover image */}
                  <div className="relative w-10 h-10 shrink-0">
                    <img 
                      src={song.coverUrl} 
                      alt="" 
                      className="w-10 h-10 object-cover rounded-xl shadow-lg border border-[#27272A]/30" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const sibling = (e.target as HTMLImageElement).nextElementSibling;
                        if (sibling) (sibling as HTMLDivElement).style.display = 'flex';
                      }}
                    />
                    <div 
                      style={{ display: 'none' }}
                      className="absolute inset-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF]/20 to-[#9D50BB]/30 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF]"
                    >
                      <Music className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Metadata details */}
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition duration-200" title={song.name}>
                      {song.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-[#71717A] font-medium truncate max-w-[120px]">
                        {song.artist || 'CS Estúdio'}
                      </p>
                      <span className="px-1.5 py-0.2 rounded bg-[#27272A]/40 text-[#71717A] border border-[#27272A]/60 text-[8px] font-semibold tracking-wider uppercase shrink-0">
                        {song.genre}
                      </span>
                    </div>
                  </div>

                  {/* "Ouvir" Action Button aligned to the right, styled like Comprar purple/cyan contrast */}
                  <button 
                    className="px-3 py-1.5 bg-[#9D50BB]/10 border border-[#9D50BB]/25 hover:bg-[#9D50BB]/20 rounded-lg text-[#00E5FF] text-[10px] font-bold flex items-center gap-1 shrink-0 transition duration-300 hover:scale-[1.02] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSong(song, likedTracks);
                    }}
                  >
                    <Play className="w-3 h-3 text-[#00E5FF] fill-[#00E5FF]/10 shrink-0" />
                    <span>Ouvir</span>
                  </button>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 6. PLAYLISTS DO USUÁRIO SECTION */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-1.5 text-white">
          <FolderHeart className="w-5 h-5 text-[#00E5FF]" />
          Minha Coleção de Playlists
        </h2>

        <div className="bg-[#111113] border border-[#1F1F22]/80 rounded-2xl p-4 space-y-1.5 shadow-xl">
          {customPlaylists.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71717A] space-y-2">
              <Music className="w-6 h-6 text-[#27272A] mx-auto" />
              <p>Você ainda não criou nenhuma playlist.</p>
            </div>
          ) : (
            customPlaylists.map((playlist, idx) => {
              const playlistSongs = songs.filter(s => playlist.songIds.includes(s.id));
              const trackCount = playlist.songIds?.length || 0;

              return (
                <div 
                  key={playlist.id}
                  onClick={() => {
                    if (playlistSongs.length > 0) {
                      playSong(playlistSongs[0], playlistSongs);
                    } else {
                      setToastMessage('Esta playlist ainda não possui músicas. Adicione músicas pelo feed ou player!');
                    }
                  }}
                  className="flex items-center gap-3.5 py-2.5 px-3 hover:bg-[#27272A]/35 rounded-xl transition duration-300 group cursor-pointer"
                >
                  {/* Rank/Index number */}
                  <span className="text-[#52525B] text-xs font-bold w-4 shrink-0 text-center">
                    {idx + 1}
                  </span>
                  
                  {/* Playlist cover image */}
                  {playlistSongs.length > 0 ? (
                    <div className="relative w-10 h-10 shrink-0">
                      <img 
                        src={playlistSongs[0].coverUrl} 
                        alt="" 
                        className="w-10 h-10 object-cover rounded-xl shadow-lg border border-[#27272A]/30" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const sibling = (e.target as HTMLImageElement).nextElementSibling;
                          if (sibling) (sibling as HTMLDivElement).style.display = 'flex';
                        }}
                      />
                      <div 
                        style={{ display: 'none' }}
                        className="absolute inset-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF]/20 to-[#9D50BB]/30 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF]"
                      >
                        <Music className="w-4 h-4 animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#27272A]/40 border border-[#27272A]/60 flex items-center justify-center text-[#00E5FF] shrink-0 transition duration-300">
                      <Music className="w-4 h-4" />
                    </div>
                  )}

                  {/* Metadata details */}
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-[#00E5FF] transition duration-200" title={playlist.name}>
                      {playlist.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-[#71717A] font-medium shrink-0">
                        {trackCount === 1 ? '1 faixa' : `${trackCount} faixas`}
                      </p>
                      <span className="px-1.5 py-0.2 rounded bg-[#27272A]/40 text-[#71717A] border border-[#27272A]/60 text-[8px] font-semibold tracking-wider uppercase shrink-0">
                        CRIADA
                      </span>
                    </div>
                  </div>

                  {/* "Ouvir" Action Button aligned to the right, styled like Comprar purple/cyan contrast */}
                  <button 
                    className="px-3 py-1.5 bg-[#9D50BB]/10 border border-[#9D50BB]/25 hover:bg-[#9D50BB]/20 rounded-lg text-[#00E5FF] text-[10px] font-bold flex items-center gap-1 shrink-0 transition duration-300 hover:scale-[1.02] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playlistSongs.length > 0) {
                        playSong(playlistSongs[0], playlistSongs);
                      } else {
                        setToastMessage('Esta playlist ainda não possui músicas. Adicione músicas pelo feed ou player!');
                      }
                    }}
                  >
                    <Play className="w-3 h-3 text-[#00E5FF] fill-[#00E5FF]/10 shrink-0" />
                    <span>Ouvir</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RENDER THE PURCHASE LICENSING MODAL ON TRACK REQUEST */}
      <AnimatePresence>
        {selectedLicensingSong && (
          <LicensingModal 
            song={selectedLicensingSong} 
            onClose={() => setSelectedLicensingSong(null)} 
          />
        )}
      </AnimatePresence>

      {/* CUSTOM FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 right-4 md:right-8 z-50 px-4 py-3 bg-[#18181B]/95 border border-[#27272A] text-xs text-[#00E5FF] font-semibold rounded-xl flex items-center gap-2 shadow-2xl"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { LicensingModal } from './LicensingModal';
import { SpotifyShareModal } from './SpotifyShareModal';
import { AudioWaveVisualizer } from './AudioWaveVisualizer';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Shuffle, 
  Heart, 
  Maximize2, 
  Minimize2, 
  Share2, 
  Copy, 
  FileText, 
  ShieldCheck, 
  Send,
  Check,
  ChevronUp,
  X,
  MessageCircle,
  Facebook,
  Twitter,
  Link,
  Plus,
  FolderHeart,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrizeRoulette } from './PrizeRoulette';

const MarqueeText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current && textRef.current) {
        const containerW = containerRef.current.offsetWidth;
        const textW = textRef.current.offsetWidth;
        setTextWidth(textW);
        setShouldScroll(textW > containerW);
      }
    };

    // A tiny timeout to ensure styling is applied and container dimensions are ready
    const timer = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [text]);

  return (
    <div ref={containerRef} className="overflow-hidden relative w-full whitespace-nowrap">
      {shouldScroll ? (
        <motion.div
          animate={{ x: [0, -(textWidth + 24)] }}
          transition={{
            ease: "linear",
            duration: Math.max(textWidth / 30, 5),
            repeat: Infinity,
            repeatType: "loop",
            repeatDelay: 2.5
          }}
          className="inline-flex gap-6 pr-6"
        >
          <span ref={textRef} className={className}>{text}</span>
          <span className={className}>{text}</span>
        </motion.div>
      ) : (
        <span ref={textRef} className={className}>{text}</span>
      )}
    </div>
  );
};

const CandidateAvatar: React.FC<{ imageUrl?: string; name: string }> = ({ imageUrl, name }) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (str: string) => {
    const cleanName = str.trim();
    if (!cleanName) return '??';
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setHasError(true)}
        className="w-9 h-9 rounded-full object-cover border border-[#27272A] shrink-0 shadow-md"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-neutral-800 border border-[#27272A] flex items-center justify-center shrink-0 shadow-md">
      <span className="text-[10px] font-bold text-neutral-400">
        {getInitials(name)}
      </span>
    </div>
  );
};

export const MainPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    progress,
    currentTime,
    duration,
    volume,
    isMuted,
    playMode,
    isLyricsExpanded,
    setIsLyricsExpanded,
    isPlayerExpanded: isExpanded,
    setIsPlayerExpanded: setIsExpanded,
    isVotingModalOpen: showVotingModal,
    setIsVotingModalOpen: setShowVotingModal,
    likedSongs,
    togglePlay,
    nextSong,
    prevSong,
    seek,
    setVolume,
    setMuted,
    setPlayMode,
    toggleLikeSong,
    customPlaylists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    voteCandidate
  } = useAudio();

  // Manipular o botão voltar (back button) para fechar o player em tela cheia ao invés de fechar o app
  useEffect(() => {
    if (isExpanded) {
      window.history.pushState({ playerExpanded: true }, "");

      const handlePopState = (event: PopStateEvent) => {
        if (!event.state || !event.state.playerExpanded) {
          setIsExpanded(false);
        }
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (window.history.state?.playerExpanded) {
          window.history.back();
        }
      };
    }
  }, [isExpanded]);

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showLicensing, setShowLicensing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [newPlName, setNewPlName] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // States for "Na voz desse artista vira hit"
  const [votedArtistsBySong, setVotedArtistsBySong] = useState<Record<string, string>>({});

  const votedArtistName = currentSong ? votedArtistsBySong[currentSong.id] : null;
  const votedCandidate = votedArtistName && currentSong
    ? currentSong.candidateArtists?.find(c => c.name === votedArtistName)
    : null;

  // Manipular o botão voltar (back button) para fechar o modal de votação ao invés de fechar o app
  useEffect(() => {
    if (showVotingModal) {
      window.history.pushState({ votingModalOpen: true }, "");

      const handlePopState = (event: PopStateEvent) => {
        setShowVotingModal(false);
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (window.history.state?.votingModalOpen) {
          window.history.back();
        }
      };
    }
  }, [showVotingModal]);

  // Control music volume during Vira Hit voting/roulette stage
  useEffect(() => {
    if (showVotingModal) {
      setVolume(0.2);
    } else {
      setVolume(1.0);
    }
  }, [showVotingModal, setVolume]);

  // Manipular o botão voltar (back button) para fechar o painel de compartilhamento ao invés de fechar o app
  useEffect(() => {
    if (showSharePanel) {
      window.history.pushState({ sharePanelOpen: true }, "");

      const handlePopState = (event: PopStateEvent) => {
        setShowSharePanel(false);
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (window.history.state?.sharePanelOpen) {
          window.history.back();
        }
      };
    }
  }, [showSharePanel]);

  // Check if there are differences between selected and original playlists
  const hasChanges = useMemo(() => {
    if (!currentSong) return false;
    const original = customPlaylists
      .filter(pl => pl.songIds.includes(currentSong.id))
      .map(pl => pl.id);
    
    const sortedOriginal = [...original].sort();
    const sortedSelected = [...selectedPlaylistIds].sort();
    
    return JSON.stringify(sortedOriginal) !== JSON.stringify(sortedSelected);
  }, [selectedPlaylistIds, customPlaylists, currentSong]);

  // Initialize selected playlists when modal opens or current song changes
  useEffect(() => {
    if (showAddPlaylistModal && currentSong) {
      const activeIds = customPlaylists
        .filter(pl => pl.songIds.includes(currentSong.id))
        .map(pl => pl.id);
      setSelectedPlaylistIds(activeIds);
      setIsSaved(false);
    }
  }, [showAddPlaylistModal, currentSong, customPlaylists]);

  const handleSavePlaylists = () => {
    customPlaylists.forEach((pl) => {
      const wasAdded = pl.songIds.includes(currentSong.id);
      const isNowSelected = selectedPlaylistIds.includes(pl.id);
      if (isNowSelected && !wasAdded) {
        addSongToPlaylist(pl.id, currentSong.id);
      } else if (!isNowSelected && wasAdded) {
        removeSongFromPlaylist(pl.id, currentSong.id);
      }
    });

    setIsSaved(true);
    setTimeout(() => {
      setShowAddPlaylistModal(false);
      setIsSaved(false);
    }, 1200);
  };

  const handleVote = async (artistName: string) => {
    if (!currentSong) return;
    
    // Check if already voted for this song to prevent duplicate spamming
    if (votedArtistsBySong[currentSong.id]) return;

    await voteCandidate(currentSong.id, artistName);
    
    const updatedVotes = { ...votedArtistsBySong, [currentSong.id]: artistName };
    setVotedArtistsBySong(updatedVotes);
  };

  // Close sharing panel automatically on song shift
  useEffect(() => {
    setShowSharePanel(false);
  }, [currentSong]);

  if (!currentSong) return null;

  const isLiked = likedSongs.includes(currentSong.id);

  // Helpers to format seconds into readable MM:SS
  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return "0:00";
    const minutes = Math.floor(timeInSecs / 60);
    const seconds = Math.floor(timeInSecs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleShareClick = (platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'copy') => {
    // Generate self-referencing song share URL link
    const shareUrl = `${window.location.origin}/?track=${currentSong.id}`;
    const textMsg = `Estou ouvindo a faixa incrível "${currentSong.name}" de CS Estúdio no CS Music! Vem conferir:`;

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg + ' ' + shareUrl)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(textMsg)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else if (platform === 'instagram') {
      // Instagram Stories sharing helper
      navigator.clipboard.writeText(shareUrl);
      alert('Link da música copiado! Abra o Instagram Stories e use a ferramenta de "Figurinha de Link" para compartilhar.');
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  return (
    <>
      {/* 1. PERSISTENT SPOTIFY-LIKE BOTTOM FIXED PLAYER HUB */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div 
            id="bottom-player-hud"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-[55px] md:bottom-3 left-0 right-0 md:left-3 md:right-3 z-40 bg-[#121214]/65 backdrop-blur-xl border-t border-b-0 border-x-0 md:border border-[#1F1F22]/50 rounded-none md:rounded-2xl h-16 px-4 py-2 flex items-center justify-between gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.8)] max-w-4xl mx-auto cursor-pointer overflow-hidden"
            onClick={() => setIsExpanded(true)}
          >
            {/* Ambient dynamic cover art background glow */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
              <img 
                src={currentSong.coverUrl} 
                alt="" 
                className="w-full h-full object-cover scale-150 blur-3xl opacity-60 brightness-90 saturate-150"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Embedded timeline timeline overlay on top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#1F1F22] rounded-t-none md:rounded-t-2xl overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00E5FF] to-[#9D50BB] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Song info visualizer */}
            <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-initial">
              <img 
                src={currentSong.coverUrl} 
                alt="" 
                className="w-10 h-10 object-cover rounded-xl shadow-md shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <MarqueeText text={currentSong.name} className="text-sm font-semibold text-white" />
                <p className="text-xs text-[#A1A1AA] truncate">{currentSong.artist}</p>
              </div>
            </div>

            {/* Quick controllers (Play/Pause, Like, licensing CTA) */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0" onClick={e => e.stopPropagation()}>
              <button 
                id="hud-like-btn"
                onClick={() => toggleLikeSong(currentSong.id)}
                className={`p-2 rounded-full transition ${isLiked ? 'text-pink-500' : 'text-[#71717A] hover:text-white'}`}
              >
                <Heart className={`w-4.5 h-4.5 ${isLiked ? 'fill-pink-500' : ''}`} />
              </button>

              <button 
                id="hud-add-playlist-btn"
                onClick={() => setShowAddPlaylistModal(true)}
                className="p-2 rounded-full text-[#71717A] hover:text-[#9D50BB] hover:scale-105 active:scale-95 transition"
                title="Salvar na playlist"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>

              <button 
                id="hud-play-btn"
                onClick={togglePlay}
                className="p-2.5 rounded-full bg-[#00E5FF] hover:scale-105 active:scale-95 text-black font-semibold shadow-md transition"
              >
                {isPlaying ? <Pause className="w-4.5 h-4.5 fill-black" /> : <Play className="w-4.5 h-4.5 fill-black pl-0.5" />}
              </button>

              <button 
                id="hud-expand-btn"
                onClick={() => setIsExpanded(true)}
                className="p-2 text-[#71717A] hover:text-white transition"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DETAILED FULL SCREEN SPOTIFY-INSPIRED PLAYER HUD CANVAS */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            id="fullscreen-player-canvas"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 bg-[#050505] flex flex-col justify-between overflow-hidden"
          >
            {/* Blurry colorful atmospheric backing */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div 
                className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-cover bg-center blur-3xl scale-125 select-none"
                style={{ backgroundImage: `url('${currentSong.coverUrl}')` }}
              />
            </div>

            {/* TOP BAR ACTION BAR */}
            <div className="relative flex items-center justify-between p-4 sm:p-6 z-10 shrink-0">
              <button 
                id="collapse-player-btn"
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-xl bg-[#18181B]/80 text-[#A1A1AA] hover:text-white border border-[#27272A] transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#71717A]">Tocando Agora</p>
                <p className="text-xs font-semibold text-neutral-300 truncate max-w-[150px] sm:max-w-[200px]">{currentSong.album}</p>
              </div>

              <button 
                id="trigger-licensing-btn"
                onClick={() => setShowLicensing(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-4 sm:py-1.5 bg-gradient-to-tr from-[#00E5FF] to-[#9D50BB] text-black rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition cursor-pointer shrink-0"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.18, 1],
                    color: ["#b91c1c", "#ff1744", "#b91c1c"]
                  }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="shrink-0 flex items-center justify-center"
                >
                  <Heart className="w-3.5 h-3.5" fill="currentColor" />
                </motion.div>
                <div className="flex flex-col items-center text-center leading-tight">
                  <span className="text-[8px] sm:text-[10px] font-black whitespace-nowrap">Licenciar / Apoiar</span>
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider opacity-90 whitespace-nowrap">CS DO BEM</span>
                </div>
              </button>
            </div>

            {/* BODY CANVAS VIEW (Split: Song detail / Scroll lyrics) */}
            <div className="relative flex-1 flex flex-col md:flex-row items-center justify-center p-4 sm:p-6 md:p-12 gap-4 sm:gap-8 z-20 max-w-5xl mx-auto w-full min-h-0 overflow-hidden">
              
              {/* Left Column: Visual Artwork panel (Visible unless lyrics take full screen on mobile) */}
              <div className={`w-full md:w-1/2 flex flex-col items-center justify-center space-y-3 sm:space-y-6 ${isLyricsExpanded ? 'hidden md:flex' : 'flex'} min-h-0`}>
                <motion.div 
                  layoutId={`fullscreen-artwork-${currentSong.id}`}
                  className="w-44 h-44 sm:w-72 sm:h-72 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,0.8)] border border-[#1F1F22] aspect-square shrink-1 min-h-0 max-h-[32vh] relative group"
                >
                  <img 
                    src={currentSong.coverUrl} 
                    alt={currentSong.name} 
                    className="w-full h-full object-cover transition duration-500" 
                    referrerPolicy="no-referrer"
                  />
                </motion.div>

                {/* Song and Author details */}
                <div className="w-full text-center md:text-left flex items-start justify-between gap-4 max-w-sm shrink-0">
                  <div className="text-left w-full min-w-0">
                    <MarqueeText text={currentSong.name} className="text-lg sm:text-xl md:text-2xl font-black text-white font-sans tracking-tight" />
                    <p className="text-xs sm:text-sm text-[#A1A1AA] font-medium truncate mt-0.5">{currentSong.artist}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      id="fullscreen-favorite-btn"
                      onClick={() => toggleLikeSong(currentSong.id)}
                      className={`p-2 sm:p-3 rounded-xl hover:bg-[#18181B] border border-[#27272A] transition ${isLiked ? 'text-pink-500 border-pink-500/20 bg-pink-500/5' : 'text-[#71717A] hover:text-white'}`}
                    >
                      <Heart className={`w-4 sm:w-5 h-4 sm:h-5 ${isLiked ? 'fill-pink-500' : ''}`} />
                    </button>
                    <button 
                      id="fullscreen-add-playlist-btn"
                      onClick={() => setShowAddPlaylistModal(true)}
                      className="p-2 sm:p-3 rounded-xl hover:bg-[#18181B] border border-[#27272A] text-[#71717A] hover:text-[#9D50BB] hover:border-[#9D50BB]/30 transition cursor-pointer"
                      title="Salvar na playlist"
                    >
                      <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Lyrics Scroller, or responsive sidebar spacing */}
              <div className={`w-full md:w-1/2 flex flex-col ${isLyricsExpanded ? 'flex flex-1 h-full' : 'hidden md:flex h-96'} min-h-0`}>
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#71717A] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Letra da música
                  </span>
                  <button 
                    id="lyrics-full-toggle-btn"
                    onClick={() => setIsLyricsExpanded(!isLyricsExpanded)}
                    className="text-xs font-semibold text-[#00E5FF] hover:text-[#00E5FF]/85 hover:underline transition"
                  >
                    {isLyricsExpanded ? 'Minimizar' : 'Expandir'}
                  </button>
                </div>

                {/* Lyrics box scrolling container */}
                <div className="flex-1 overflow-y-auto bg-[#18181B]/60 border border-[#1F1F22] p-5 rounded-3xl max-h-[300px] md:max-h-none h-full shadow-inner relative">
                  <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed font-sans font-medium text-center italic">
                    {currentSong.lyrics && currentSong.lyrics !== 'Instrumental' ? currentSong.lyrics : 'Esta é uma faixa instrumental original do CS Estúdio.'}
                  </p>
                </div>
              </div>
            </div>

            {/* CONTROLS BOX SECTION AT BOTTOM (Seeking, Timelines, Player triggers) */}
            <div className="relative p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 bg-black/65 backdrop-blur-md border-t border-[#1F1F22]/40 z-10 w-full shrink-0">
              {/* Smooth Glowing Bottom Wave Visualizer (Pulsing neon waveform sitting behind text, translucent and shifted slightly down) */}
              <div className="absolute left-0 right-0 bottom-[calc(100%-16px)] md:bottom-[calc(100%-10px)] pointer-events-none z-0 h-[120px] sm:h-[195px] md:h-[260px] overflow-hidden opacity-35 md:opacity-45 select-none">
                <AudioWaveVisualizer isPlaying={isPlaying} />
              </div>
              <div className="max-w-xl mx-auto space-y-3 sm:space-y-4">
                
                {/* Micro timing timeline slider */}
                <div className="space-y-1">
                  <input 
                    id="progress-seeker"
                    type="range" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    value={progress}
                    onChange={handleProgressChange}
                    className="w-full h-1 bg-[#1F1F22] rounded-lg appearance-none cursor-pointer accent-[#00E5FF] focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] sm:text-xs font-mono text-[#71717A] font-bold">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Core action bar controllers */}
                <div className="flex items-center justify-between gap-4">
                  {/* Shuffle click toggle */}
                  <button 
                    id="loop-shuffle-btn"
                    onClick={() => setPlayMode(playMode === 'shuffle' ? 'regular' : 'shuffle')}
                    className={`p-1.5 sm:p-2 transition ${playMode === 'shuffle' ? 'text-[#00E5FF]' : 'text-[#71717A] hover:text-white'}`}
                    title="Aleatório"
                  >
                    <Shuffle className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>

                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Previous Track */}
                    <button 
                      id="track-prev-btn"
                      onClick={prevSong}
                      className="p-2 sm:p-2.5 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-900 transition active:scale-95"
                    >
                      <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                    </button>

                    {/* Play/Pause center toggle featuring custom CS Estúdio logo */}
                    <button 
                      id="track-play-center-btn"
                      onClick={togglePlay}
                      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(0,195,255,0.45)] hover:shadow-[0_0_30px_rgba(157,80,187,0.65)] focus:outline-none border border-cyan-500/30 hover:border-fuchsia-500/50"
                    >
                      {/* Logo image with dynamic rotation or breath pulse animation on active play */}
                      <img 
                        src="https://lh3.googleusercontent.com/d/1kpzAB3S4ebv0fz1CdBlB2Rbx0kLYCJJe" 
                        alt="Play/Pause" 
                        className={`w-full h-full object-cover transition-transform duration-300 ${isPlaying ? 'scale-105 animate-[pulse_2.5s_infinite]' : 'scale-100'}`}
                        referrerPolicy="no-referrer"
                      />
                      {/* Subtly overlay transparent dark glass and responsive Play & Pause symbols */}
                      <div className="absolute inset-0 bg-black/45 hover:bg-black/25 flex items-center justify-center transition-colors">
                        {isPlaying ? (
                          <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5px] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                        ) : (
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white ml-1 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                        )}
                      </div>
                    </button>

                    {/* Next Track */}
                    <button 
                      id="track-next-btn"
                      onClick={nextSong}
                      className="p-2 sm:p-2.5 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-900 transition active:scale-95"
                    >
                      <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                    </button>
                  </div>

                  {/* Repeat click toggle */}
                  <button 
                    id="loop-repeat-btn"
                    onClick={() => setPlayMode(playMode === 'repeat' ? 'regular' : 'repeat')}
                    className={`p-1.5 sm:p-2 transition ${playMode === 'repeat' ? 'text-[#9D50BB]' : 'text-[#71717A] hover:text-white'}`}
                    title="Repetir música"
                  >
                    <Repeat className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>
                </div>

                {/* Foot Volume & Sharing triggers bar */}
                <div className="flex items-center justify-between pt-2.5 sm:pt-4 border-t border-[#1F1F22] text-[#71717A] text-[11px] sm:text-xs">
                  
                  {/* Adaptive Volume Controller */}
                  <div className="flex items-center gap-1.5 w-1/3 min-w-[110px] h-8" onClick={e => e.stopPropagation()}>
                    <button 
                      id="mute-unmute-btn"
                      onClick={() => setMuted(!isMuted)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-white/5 transition shrink-0"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input 
                      id="volume-seeker"
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={e => setVolume(Number(e.target.value))}
                      className="w-full h-1 bg-[#1F1F22] rounded-lg appearance-none cursor-pointer accent-[#00E5FF] focus:outline-none my-auto"
                    />
                  </div>

                  {/* Toggle Share Panel panel layout */}
                  <div className="flex items-center gap-2.5 relative shrink-0 h-8">
                    <button 
                      id="trigger-hit-vocal-btn"
                      onClick={() => {
                        // Limpa o voto da música atual para permitir votar novamente ao reabrir o modal
                        if (currentSong) {
                          const updated = { ...votedArtistsBySong };
                          delete updated[currentSong.id];
                          setVotedArtistsBySong(updated);
                        }
                        setShowVotingModal(true);
                      }}
                      className="h-8 inline-flex items-center gap-1.5 px-3 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 text-[#00E5FF] hover:bg-[#00E5FF]/15 hover:border-[#00E5FF]/40 transition text-xs font-bold shrink-0"
                      title="Na voz desse artista vira hit"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                      <span className="hidden sm:inline">Votar no vira hit</span>
                      <span className="sm:hidden">Votar no vira hit</span>
                    </button>

                    <button 
                      id="trigger-share-panel-btn"
                      onClick={() => setShowSharePanel(true)}
                      className={`w-8 h-8 inline-flex items-center justify-center rounded-xl border border-[#1F1F22] bg-[#18181B] hover:border-[#27272A] hover:text-white transition shrink-0 ${showSharePanel ? 'text-[#00E5FF] border-[#00E5FF]/20' : 'text-[#A1A1AA]'}`}
                      title="Compartilhar música"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. LICENSING POPUP TRIGGER */}
      <AnimatePresence>
        {showLicensing && (
          <LicensingModal 
            song={currentSong} 
            onClose={() => setShowLicensing(false)} 
          />
        )}
      </AnimatePresence>

      {/* SPOTIFY-LIKE SHARE STICKER MODAL */}
      <AnimatePresence>
        {showSharePanel && currentSong && (
          <SpotifyShareModal 
            song={currentSong} 
            isOpen={showSharePanel} 
            onClose={() => setShowSharePanel(false)} 
          />
        )}
      </AnimatePresence>

      {/* 4. ADD SONG TO CUSTOM PLAYLIST MODAL */}
      <AnimatePresence>
        {showAddPlaylistModal && (
          <div 
            id="add-playlist-modal" 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => {
              setShowAddPlaylistModal(false);
              setShowQuickCreate(false);
              setNewPlName('');
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#121214] border border-[#1F1F22] p-6 rounded-2xl space-y-4 shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setShowAddPlaylistModal(false);
                  setShowQuickCreate(false);
                  setNewPlName('');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FolderHeart className="w-4.5 h-4.5 text-[#9D50BB]" /> Salvar na Playlist
                </h3>
                <p className="text-[11px] text-[#71717A] font-semibold">
                  Escolha uma playlist para salvar a música <strong className="text-[#00E5FF]">"{currentSong.name}"</strong>
                </p>
              </div>

              {/* Playlists List */}
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {customPlaylists.length === 0 ? (
                  <div className="py-6 text-center text-[#71717A] text-xs font-semibold">
                    Você ainda não possui playlists criadas.
                  </div>
                ) : (
                  customPlaylists.map((pl) => {
                    const isAdded = selectedPlaylistIds.includes(pl.id);
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setSelectedPlaylistIds(prev => prev.filter(id => id !== pl.id));
                          } else {
                            setSelectedPlaylistIds(prev => [...prev, pl.id]);
                          }
                        }}
                        className="w-full text-left flex items-center justify-between p-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A]/45 border border-[#1F1F22] hover:border-[#27272A] transition group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs font-bold text-white truncate">{pl.name}</h4>
                          <p className="text-[9px] text-[#71717A] font-semibold mt-0.5">
                            {pl.songIds.includes(currentSong.id) && !isAdded 
                              ? pl.songIds.length - 1 
                              : !pl.songIds.includes(currentSong.id) && isAdded 
                                ? pl.songIds.length + 1 
                                : pl.songIds.length} faixas
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isAdded 
                            ? 'bg-[#00E5FF] border-[#00E5FF] text-black shadow-[0_0_8px_rgba(0,229,255,0.4)]' 
                            : 'border-[#27272A] group-hover:border-[#71717A]'
                        }`}>
                          {isAdded && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Direct Quick Create Module */}
              <div className="pt-2 border-t border-[#1F1F22]">
                {!showQuickCreate ? (
                  <button
                    type="button"
                    onClick={() => setShowQuickCreate(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#9D50BB] bg-[#9D50BB]/10 hover:bg-[#9D50BB]/20 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Criar nova playlist
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="text"
                      value={newPlName}
                      onChange={(e) => setNewPlName(e.target.value)}
                      placeholder="Nome da nova playlist..."
                      className="w-full px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-xl focus:border-[#9D50BB] focus:outline-none text-xs text-white placeholder-[#71717A] transition"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickCreate(false);
                          setNewPlName('');
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold text-[#71717A] hover:text-white transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (newPlName.trim()) {
                            const newPl = createPlaylist(newPlName.trim());
                            setSelectedPlaylistIds(prev => [...prev, newPl.id]);
                            addSongToPlaylist(newPl.id, currentSong.id);
                            setNewPlName('');
                            setShowQuickCreate(false);
                            
                            setIsSaved(true);
                            setTimeout(() => {
                              setShowAddPlaylistModal(false);
                              setIsSaved(false);
                            }, 1200);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#9D50BB] hover:bg-[#9D50BB]/90 text-[10px] font-bold text-black rounded-xl transition cursor-pointer"
                      >
                        Criar e Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button: Save chosen playlist state */}
              {customPlaylists.length > 0 && (
                <div className="pt-2 border-t border-[#1F1F22]">
                  <button
                    type="button"
                    disabled={!hasChanges && !isSaved}
                    onClick={handleSavePlaylists}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 shadow-lg ${
                      isSaved 
                        ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.45)] cursor-default' 
                        : !hasChanges
                          ? 'bg-[#1C1C1E] text-[#71717A] border border-[#27272A] cursor-not-allowed opacity-40 shadow-none'
                          : 'bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-semibold hover:scale-[1.02] active:scale-95 shadow-[0_0_8px_rgba(0,229,255,0.2)] cursor-pointer'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3px]" />
                        <span>Salvo com sucesso!</span>
                      </>
                    ) : (
                      <>
                        <FolderHeart className={`w-4 h-4 ${!hasChanges ? 'text-[#71717A] fill-none' : 'text-black fill-black/10'}`} />
                        <span>Salvar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. NA VOZ DESSE ARTISTA VIRA HIT MODAL/PAGINA OVERLAY */}
      <AnimatePresence>
        {showVotingModal && (
          votedCandidate ? (
            <PrizeRoulette 
              votedArtist={votedCandidate} 
              onClose={() => {
                setShowVotingModal(false);
                setIsExpanded(false);
              }} 
            />
          ) : (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-[#0F0F11] border border-[#1F1F22] p-6 rounded-2xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative text-left"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowVotingModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>

                <>
                  {/* Title & Description */}
                  <div className="space-y-1.5 pr-8 font-sans">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 text-[9px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-[#00E5FF] animate-pulse" /> Votação Popular
                    </div>
                    <h3 className="text-base font-black text-white font-sans tracking-tight">
                      Na Voz Desse Artista Vira Hit?
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                      Selecione qual artista ficaria melhor interpretando esta obra e dê o seu voto para virar um grande sucesso!
                    </p>
                  </div>

                  {/* Current Song Card Context */}
                  {currentSong ? (
                    <div className="flex items-center gap-3 bg-[#161619] border border-[#1F1F22] p-3 rounded-xl font-sans">
                      <img
                        src={currentSong.coverUrl}
                        alt={currentSong.name}
                        className="w-12 h-12 rounded-lg object-cover border border-[#27272A]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{currentSong.name}</p>
                        <p className="text-[10px] text-[#A1A1AA] truncate mt-0.5">{currentSong.artist}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-[#161619] border border-[#1F1F22] rounded-xl text-xs text-[#71717A] font-semibold font-sans">
                      Nenhuma música selecionada para votação.
                    </div>
                  )}

                  {/* Candidate Artists List */}
                  {currentSong && (
                    <div className="space-y-2.5 font-sans">
                      {(!currentSong.candidateArtists || currentSong.candidateArtists.length === 0) ? (
                        <div className="text-center p-6 border border-dashed border-[#1F1F22] rounded-xl text-xs text-[#71717A] font-sans">
                          Nenhum artista foi cadastrado para votação nesta música.
                        </div>
                      ) : (
                        currentSong.candidateArtists.map((candidate, idx) => {
                          const hasVotedThis = votedArtistsBySong[currentSong.id] === candidate.name;
                          const hasVotedAny = !!votedArtistsBySong[currentSong.id];
                          
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                                hasVotedThis
                                  ? 'bg-[#00E5FF]/10 border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                                  : 'bg-[#141417] border-[#1F1F22] hover:border-[#27272A]'
                              }`}
                            >
                              <div className="min-w-0 pr-3 flex items-center gap-3">
                                <span className="w-5 h-5 rounded-md bg-neutral-900 text-[10px] font-black text-[#A1A1AA] flex items-center justify-center border border-[#1F1F22] shrink-0">
                                  {idx + 1}
                                </span>

                                <CandidateAvatar imageUrl={candidate.imageUrl} name={candidate.name} />

                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{candidate.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <TrendingUp className="w-3 h-3 text-[#71717A]" />
                                    <span className="text-[10px] text-[#A1A1AA] font-semibold">
                                      {candidate.votes || 0} {candidate.votes === 1 ? 'voto' : 'votos'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={hasVotedAny}
                                onClick={() => handleVote(candidate.name)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-300 flex items-center gap-1 cursor-pointer ${
                                  hasVotedThis
                                    ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 cursor-default'
                                    : hasVotedAny
                                      ? 'bg-[#1C1C1E] text-[#71717A] border border-transparent cursor-not-allowed opacity-40'
                                      : 'bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black hover:scale-105 active:scale-95 shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                                }`}
                              >
                                {hasVotedThis ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3px]" />
                                    <span>Votado!</span>
                                  </>
                                ) : (
                                  <span>Votar</span>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Bottom Information */}
                  <div className="text-center font-sans">
                    <p className="text-[9px] text-[#71717A] font-semibold uppercase tracking-wider">
                      CS Music Votos Seguros • Licenciado em tempo real
                    </p>
                  </div>
                </>
              </motion.div>
            </div>
          )
        )}
      </AnimatePresence>
    </>
  );
};

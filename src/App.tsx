import React, { useState, useEffect } from 'react';
import { AudioProvider, useAudio } from './context/AudioContext';
import { HomeFeed } from './components/HomeFeed';
import { SearchView } from './components/SearchView';
import { FavoritesView } from './components/FavoritesView';
import { ArtistProfile } from './components/ArtistProfile';
import { CsDoBem } from './components/CsDoBem';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { MainPlayer } from './components/MainPlayer';
import { auth, db } from './firebase';
import { 
  Music, 
  Home as HomeIcon, 
  Search as SearchIcon, 
  Library as LibraryIcon, 
  User as UserIcon, 
  Settings as AdminIcon, 
  LogOut, 
  LogIn,
  Sliders,
  Sparkle,
  ArrowUp,
  Heart as HeartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function CSAppContent() {
  const [activeTab, setActiveTab] = useState<'inicio' | 'buscar' | 'biblioteca' | 'artista' | 'csdobem' | 'admin'>('inicio');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [authSuccessAction, setAuthSuccessAction] = useState<() => void>(() => {});
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const { songs, playSong, userProfile, isLoadingSongs, updateQueue, isPlayerExpanded, isVotingModalOpen } = useAudio();

  // Handle scroll detection for Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Listen to popstate event from phone back button or browser navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state || !state.tab || state.tab === 'inicio') {
        setActiveTab('inicio');
      } else {
        setActiveTab(state.tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set initial history state if not populated
    if (!window.history.state) {
      window.history.replaceState({ tab: 'inicio' }, '');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Listen to activeTab changes to keep browser history synchronized and manage back buffer
  useEffect(() => {
    const currentState = window.history.state;
    const currentHistoryTab = currentState ? currentState.tab : null;

    if (activeTab === 'inicio') {
      // If we are at 'inicio' but the browser history currently holds a non-inicio state,
      // going back in history pops it cleanly.
      if (currentHistoryTab && currentHistoryTab !== 'inicio') {
        window.history.back();
      }
    } else {
      // If navigating to any other tab (buscar, biblioteca, artista, admin)
      if (!currentHistoryTab || currentHistoryTab === 'inicio') {
        window.history.pushState({ tab: activeTab }, '');
      } else if (currentHistoryTab !== activeTab) {
        window.history.replaceState({ tab: activeTab }, '');
      }
    }
  }, [activeTab]);

  // 1. Direct song link sharing logic! Handles `?track=cs-cyberpunk`
  useEffect(() => {
    if (isLoadingSongs || songs.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track') || params.get('song');
    
    if (trackId) {
      const targetSong = songs.find(s => s.id === trackId);
      if (targetSong) {
        console.log("Direct shared track code found. Direct playing: ", targetSong.name);
        playSong(targetSong);
      }
    }
  }, [isLoadingSongs, songs]);

  const handleSelectCategory = (category: string) => {
    setActiveCategory(category);
    setActiveTab('inicio');
    
    // Automatically update player's queue context to match the chosen category so that natural playlist traversal stays in context!
    const filtered = category && category !== 'Todas'
      ? songs.filter(s => 
          s.genre.toLowerCase() === category.toLowerCase() ||
          (s.secondGenre && s.secondGenre.toLowerCase() === category.toLowerCase())
        )
      : songs;
    updateQueue(filtered);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    await auth.signOut();
    setShowLogoutConfirm(false);
  };

  const handleTabClick = (tab: typeof activeTab) => {
    if (tab === 'admin') {
      const isAdmin = auth.currentUser?.email === 'carlosrs.email@gmail.com';
      if (!auth.currentUser) {
        // Force authentication for accessing Admin panel
        setAuthSuccessAction(() => () => {
          if (auth.currentUser?.email === 'carlosrs.email@gmail.com') {
            setActiveTab('admin');
          } else {
            setActiveTab('inicio');
          }
        });
        setShowAuth(true);
        return;
      } else if (!isAdmin) {
        // Direct click fallback with warning (rendered inside AdminPanel or redirected back)
        setActiveTab('admin');
        return;
      }
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F4F4F5] flex flex-col items-center justify-start antialiased relative font-sans select-none">
      
      {/* 2. RESPONSIVE COMPACT ENCLOSURE (Aesthetic centered device view on Wide Monitors) */}
      <div className="w-full max-w-md md:max-w-xl md:border-x md:border-[#1F1F22] min-h-screen bg-[#050505] flex flex-col relative pb-36">
        
        {/* APP HEADER */}
        <header className="sticky top-0 z-40 bg-[#000000]/80 backdrop-blur-md px-5 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <button 
            onClick={() => {
              setActiveTab('inicio');
              setActiveCategory(null);
            }}
            className="flex items-center gap-2 hover:opacity-80 active:scale-95 transition cursor-pointer text-left focus:outline-none"
            aria-label="Voltar para o início"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-black/40 shadow-[0_0_12px_rgba(157,80,187,0.35)] hover:shadow-[0_0_16px_rgba(0,229,255,0.45)] transition-all duration-300">
              <img 
                src="https://lh3.googleusercontent.com/d/1E37nd5lZ180Zy_RijgYI_U1PIIkkM1Lu" 
                alt="CS Music Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1">
                CS Music
                <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 uppercase tracking-widest">Music</span>
              </h1>
            </div>
          </button>

          {/* Quick Member Auth action */}
          <div className="flex items-center gap-2">
            {auth.currentUser?.email === 'carlosrs.email@gmail.com' && (
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-[#A1A1AA] font-bold max-w-[120px] truncate leading-none">
                    {userProfile?.displayName || 'Administrador'}
                  </p>
                  <span className="text-[8px] text-[#9D50BB] uppercase font-black tracking-widest leading-none">Admin</span>
                </div>
                <button 
                  id="header-logout-btn"
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-[#050505]/60 border border-[#27272A] text-[#A1A1AA] hover:text-red-400 transition"
                  title="Sair do Painel"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* MAIN PANEL CONTENT (Tabs switcher component canvas) */}
        <main className="flex-1 px-5 pt-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (activeCategory || '')}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'inicio' && (
                <HomeFeed 
                  onSelectCategory={handleSelectCategory} 
                  activeCategory={activeCategory} 
                  onNavigateToTab={handleTabClick}
                />
              )}
              {activeTab === 'buscar' && <SearchView />}
              {activeTab === 'biblioteca' && <FavoritesView />}
              {activeTab === 'artista' && <ArtistProfile />}
              {activeTab === 'csdobem' && <CsDoBem />}
              {activeTab === 'admin' && (
                <AdminPanel 
                  onTriggerLogin={() => {
                    setAuthSuccessAction(() => () => setActiveTab('admin'));
                    setShowAuth(true);
                  }} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* 3. MOBILE BOTTOM FIXED SPOTIFY-STYLE NAVIGATION BAR */}
        <nav 
          id="mobile-nav-stripe" 
          translate="no" 
          className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-0 bg-black/40 backdrop-blur-xl border-t border-white/5 z-40 px-2 py-2 flex items-center justify-around notranslate h-[56px]"
        >
          
          <button 
            id="tab-home-btn"
            onClick={() => handleTabClick('inicio')}
            translate="no"
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wider min-w-[50px] cursor-pointer transition notranslate ${
              activeTab === 'inicio' ? 'text-[#00E5FF]' : 'text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <HomeIcon className="w-5 h-5 shrink-0" />
            <span translate="no" className="whitespace-nowrap notranslate">Início</span>
          </button>

          <button 
            id="tab-search-btn"
            onClick={() => handleTabClick('buscar')}
            translate="no"
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wider min-w-[50px] cursor-pointer transition notranslate ${
              activeTab === 'buscar' ? 'text-[#00E5FF]' : 'text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <SearchIcon className="w-5 h-5 shrink-0" />
            <span translate="no" className="whitespace-nowrap notranslate">Buscar</span>
          </button>

          <button 
            id="tab-library-btn"
            onClick={() => handleTabClick('biblioteca')}
            translate="no"
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wider min-w-[50px] cursor-pointer transition notranslate ${
              activeTab === 'biblioteca' ? 'text-[#9D50BB]' : 'text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <LibraryIcon className="w-5 h-5 shrink-0" />
            <span translate="no" className="whitespace-nowrap notranslate">Biblioteca</span>
          </button>

          <button 
            id="tab-csdobem-btn"
            onClick={() => handleTabClick('csdobem')}
            translate="no"
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wider min-w-[45px] cursor-pointer transition notranslate ${
              activeTab === 'csdobem' ? 'text-[#9D50BB]' : 'text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2.0,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="shrink-0 flex items-center justify-center text-red-500"
            >
              <HeartIcon className="w-5 h-5 fill-currentColor" />
            </motion.div>
            <span translate="no" className="whitespace-nowrap notranslate">CS do Bem</span>
          </button>

          <button 
            id="tab-artist-btn"
            onClick={() => handleTabClick('artista')}
            translate="no"
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wider min-w-[45px] cursor-pointer transition notranslate ${
              activeTab === 'artista' ? 'text-[#9D50BB]' : 'text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <UserIcon className="w-5 h-5 shrink-0" />
            <span translate="no" className="whitespace-nowrap notranslate">CS Estúdio</span>
          </button>

          {/* Secure interactive button for Admins */}
          <button 
            id="tab-admin-btn"
            onClick={() => handleTabClick('admin')}
            translate="no"
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wider min-w-[50px] cursor-pointer transition relative notranslate ${
              activeTab === 'admin' ? 'text-[#9D50BB]' : 'text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <div className="relative shrink-0">
              <AdminIcon className="w-5 h-5" />
              {auth.currentUser?.email !== 'carlosrs.email@gmail.com' && (
                <div className="absolute -top-1 -right-1 w-2 bg-[#27272A] border border-[#050505] rounded-full flex items-center justify-center text-[7px]" />
              )}
            </div>
            <span translate="no" className="whitespace-nowrap notranslate">Admin</span>
          </button>
        </nav>

        {/* BOTTOM FLOATING PLAYER HUD */}
        <MainPlayer />

        {/* BACK TO TOP FLOATING BUTTON */}
        <AnimatePresence>
          {showBackToTop && !isPlayerExpanded && !isVotingModalOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              onClick={scrollToTop}
              className="fixed bottom-28 right-4 md:right-[calc(50%-260px)] z-50 p-2.5 rounded-full bg-[#121214]/95 border border-[#BF5AF2]/40 text-[#BF5AF2] hover:text-[#00E5FF] hover:border-[#00E5FF]/50 active:scale-90 active:text-[#00E5FF] active:border-[#00E5FF] shadow-[0_0_12px_rgba(191,90,242,0.35)] hover:shadow-[0_0_16px_rgba(0,229,255,0.5)] transition-all duration-300 cursor-pointer focus:outline-none flex items-center justify-center"
              aria-label="Voltar ao topo"
            >
              <ArrowUp className="w-4.5 h-4.5" />
            </motion.button>
          )}
        </AnimatePresence>

      </div>

      {/* 4. PASSIVE AUTH CARD ON-DEMAND MODAL OVERLAYS */}
      <AnimatePresence>
        {showAuth && (
          <AuthScreen 
            onSuccess={() => {
              setShowAuth(false);
              authSuccessAction();
            }}
            onClose={() => setShowAuth(false)}
          />
        )}
      </AnimatePresence>

      {/* LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#121214] border border-[#1F1F22] p-6 rounded-xl space-y-4 shadow-2xl text-left"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                <LogOut className="w-4.5 h-4.5 text-[#00E5FF]" /> Confirmar Saída
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans">
                Deseja realmente sair da sua conta no <strong className="text-white">CS Music</strong>?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 rounded-xl text-[10px] font-bold text-[#71717A] hover:text-white transition cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleLogoutConfirm}
                  className="px-4 py-2 bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/20 text-[#00E5FF] text-[10px] font-bold rounded-xl transition cursor-pointer font-sans"
                >
                  Sair da Conta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <CSAppContent />
    </AudioProvider>
  );
}

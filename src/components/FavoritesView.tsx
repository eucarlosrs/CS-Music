import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { Song, Playlist } from '../types';
import { 
  Heart, 
  Plus, 
  Music, 
  Trash2, 
  Play, 
  FolderHeart, 
  History, 
  Download, 
  CheckCircle, 
  Clock, 
  Volume2, 
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FavoritesView: React.FC = () => {
  const { 
    songs, 
    likedSongs, 
    playSong, 
    currentSong, 
    isPlaying, 
    togglePlay, 
    history,
    toggleLikeSong,
    userProfile,
    customPlaylists,
    createPlaylist,
    deletePlaylist,
    setIsPlayerExpanded
  } = useAudio();

  const [activeTab, setActiveTab] = useState<'liked' | 'playlists' | 'history'>('liked');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Filter out songs that the user has favorited
  const likedTracks = songs.filter(song => likedSongs.includes(song.id));

  // Filter out songs that exist in history
  const historyTracks = songs.filter(song => history.includes(song.id));

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName) return;

    createPlaylist(newPlaylistName, newPlaylistDesc);

    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setShowCreateModal(false);
    setToastMessage('Playlist criada com sucesso!');
  };

  const handleDeleteConfirm = async () => {
    if (!playlistToDelete) return;
    deletePlaylist(playlistToDelete.id);
    setPlaylistToDelete(null);
    setToastMessage('Playlist excluída com sucesso!');
  };

  // Offline caching simulator status bar
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [offlineDownloadedIds, setOfflineDownloadedIds] = useState<string[]>([]);

  useEffect(() => {
    const loaded = JSON.parse(localStorage.getItem('cs_downloaded_ids') || '[]');
    setOfflineDownloadedIds(loaded);
  }, []);

  const handleDownloadOffline = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (offlineDownloadedIds.includes(songId)) {
      // Uninstall/delete offline file
      const updated = offlineDownloadedIds.filter(id => id !== songId);
      setOfflineDownloadedIds(updated);
      localStorage.setItem('cs_downloaded_ids', JSON.stringify(updated));
      return;
    }

    setDownloadingIds(prev => [...prev, songId]);
    setTimeout(() => {
      setDownloadingIds(prev => prev.filter(id => id !== songId));
      const updated = [...offlineDownloadedIds, songId];
      setOfflineDownloadedIds(updated);
      localStorage.setItem('cs_downloaded_ids', JSON.stringify(updated));
    }, 2500); // simulate fast neon buffer progress
  };

  const handleTrackPlay = (song: Song, list: Song[]) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, list);
    }
    setIsPlayerExpanded(true);
  };

  return (
    <div id="library-view-container" className="pb-32 space-y-6 text-white text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
        <p className="text-xs text-[#71717A] font-semibold mt-0.5">Gerencie suas curtidas e crie playlists autorais.</p>
      </div>

      {/* Library tab bar menu */}
      <div className="flex border-b border-[#1F1F22]">
        <button 
          onClick={() => setActiveTab('liked')}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider relative transition ${
            activeTab === 'liked' ? 'text-white font-extrabold' : 'text-[#71717A] hover:text-[#D4D4D8]'
          }`}
        >
          Curtidas
          {activeTab === 'liked' && (
            <motion.div layoutId="library-active-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00E5FF]" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('playlists')}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider relative transition ${
            activeTab === 'playlists' ? 'text-white font-extrabold' : 'text-[#71717A] hover:text-[#D4D4D8]'
          }`}
        >
          Minhas Playlists
          {activeTab === 'playlists' && (
            <motion.div layoutId="library-active-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9D50BB]" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider relative transition ${
            activeTab === 'history' ? 'text-white font-extrabold' : 'text-[#71717A] hover:text-[#D4D4D8]'
          }`}
        >
          Histórico
          {activeTab === 'history' && (
            <motion.div layoutId="library-active-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9D50BB]" />
          )}
        </button>
      </div>

      {/* Tab contexts */}
      <div className="relative">
        
        {/* --- TAB 1: CURTIDAS (LIKED SONGS) --- */}
        {activeTab === 'liked' && (
          <div className="space-y-4">
            {likedTracks.length === 0 ? (
              <div id="no-favorites-alert" className="py-12 text-center text-[#71717A] space-y-4 max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-xl bg-[#18181B] border border-[#1F1F22] text-[#71717A] flex items-center justify-center mx-auto">
                  <Heart className="w-5 h-5" />
                </div>
                <p className="text-xs leading-relaxed font-semibold">Você ainda não curtiu nenhuma música do CS Estúdio.</p>
                <p className="text-[10px] text-[#71717A]">Navegue pelas trilhas no início do aplicativo e clique no coração para salvá-las aqui!</p>
              </div>
            ) : (
              <div className="space-y-1 bg-[#18181B] p-4 border border-[#1F1F22] rounded-xl shadow-lg">
                {likedTracks.map((song, i) => {
                  const isCurrent = currentSong?.id === song.id;
                  const isDownloading = downloadingIds.includes(song.id);
                  const isDownloaded = offlineDownloadedIds.includes(song.id);
                  return (
                    <div 
                      key={song.id}
                      onClick={() => handleTrackPlay(song, likedTracks)}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#27272A]/40 transition group"
                    >
                      <img src={song.coverUrl} alt="" className="w-10 h-10 object-cover rounded-xl shrink-0" referrerPolicy="no-referrer" />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-[#00E5FF]' : 'text-white'}`}>
                          {song.name}
                        </h4>
                        <p className="text-[9px] text-[#71717A] truncate font-semibold mt-0.5">
                          {song.genre}{song.secondGenre ? ` + ${song.secondGenre}` : ''} • {song.artist}
                        </p>
                      </div>

                      {/* Dislike button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeSong(song.id);
                        }}
                        className="p-2 rounded-xl bg-[#050505]/40 hover:bg-red-500/10 text-pink-500 border border-[#1F1F22] hover:border-red-500/20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: PLAYLISTS --- */}
        {activeTab === 'playlists' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-extrabold text-[#71717A] uppercase tracking-widest">Minhas Listas Autorais</h2>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#9D50BB] hover:bg-[#9D50BB]/95 text-[10px] font-extrabold text-black rounded-full transition shadow-lg shadow-[#9D50BB]/20"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Playlist
              </button>
            </div>

            {customPlaylists.length === 0 ? (
              <div className="py-12 text-center text-[#71717A] space-y-3 max-w-xs mx-auto">
                <FolderHeart className="w-10 h-10 text-neutral-500 mx-auto" />
                <p className="text-xs font-semibold">Crie e organize suas próprias playlists.</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-1.5 border border-[#9D50BB]/20 bg-[#9D50BB]/5 hover:bg-[#9D50BB]/15 rounded-full text-[10px] font-extrabold text-[#9D50BB] transition"
                >
                  Criar agora mesmo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customPlaylists.map((pl) => {
                  const plSongs = songs.filter(s => pl.songIds?.includes(s.id));
                  return (
                    <div 
                      key={pl.id}
                      onClick={() => {
                        if (plSongs.length > 0) {
                          playSong(plSongs[0], plSongs);
                        } else {
                          setToastMessage('Esta playlist está vazia. Adicione músicas clicando no "+" do player ou feed!');
                        }
                      }}
                      className="p-3 bg-[#18181B] hover:bg-[#27272A]/40 border border-[#1F1F22] hover:border-[#27272A] rounded-xl transition relative overflow-hidden flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {plSongs.length > 0 ? (
                          <div className="relative w-10 h-10 shrink-0">
                            <img 
                              src={plSongs[0].coverUrl} 
                              alt="" 
                              className="w-10 h-10 object-cover rounded-xl shadow" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const sibling = (e.target as HTMLImageElement).nextElementSibling;
                                if (sibling) (sibling as HTMLDivElement).style.display = 'flex';
                              }}
                            />
                            <div 
                              style={{ display: 'none' }}
                              className="absolute inset-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D50BB]/20 to-[#00E5FF]/30 border border-[#9D50BB]/20 flex items-center justify-center text-[#9D50BB]"
                            >
                              <Music className="w-4 h-4 animate-pulse" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#9D50BB]/10 border border-[#9D50BB]/20 flex items-center justify-center text-[#9D50BB] shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{pl.name}</h4>
                          <p className="text-[9px] text-[#71717A] truncate font-semibold mt-0.5">{pl.songIds?.length || 0} faixas • {pl.createdBy === 'guest' ? 'Local' : 'Nuvem'}</p>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToDelete(pl);
                        }}
                        className="p-2 mr-1 rounded-xl bg-[#050505]/60 text-[#71717A] border border-[#27272A] hover:text-red-400 transition cursor-pointer"
                        title="Excluir playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: LISTENING HISTORY --- */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyTracks.length === 0 ? (
              <div className="py-12 text-center text-[#71717A] space-y-2 max-w-xs mx-auto">
                <History className="w-10 h-10 text-neutral-500 mx-auto" />
                <p className="text-xs font-semibold">Seu histórico de audições está vazio.</p>
                <p className="text-[10px] text-neutral-600">Trilhas tocadas por pelo menos alguns segundos aparecerão registradas aqui.</p>
              </div>
            ) : (
              <div className="bg-[#18181B] p-4 rounded-xl border border-[#1F1F22] space-y-1 shadow-lg">
                {historyTracks.map((song) => {
                  const isCurrent = currentSong?.id === song.id;
                  return (
                    <div 
                      key={song.id}
                      onClick={() => handleTrackPlay(song, historyTracks)}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#27272A]/40 transition"
                    >
                      <img src={song.coverUrl} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-[#00E5FF]' : 'text-white'}`}>
                          {song.name}
                        </h4>
                        <p className="text-[9px] text-[#71717A] truncate font-semibold mt-0.5">
                          {song.genre}{song.secondGenre ? ` + ${song.secondGenre}` : ''} • {song.artist}
                        </p>
                      </div>
                      <Volume2 className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* CREATE PLAYLIST POPUP MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-md">
            <motion.form 
              onSubmit={handleCreatePlaylist}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#121214] border border-[#1F1F22] p-6 rounded-xl space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4.5 h-4.5 text-[#9D50BB]" /> Criar Playlist Autoral
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1AA] font-semibold">Nome da Lista *</label>
                <input 
                  type="text" 
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  placeholder="Ex: Synthesizers de Madrugada"
                  required
                  className="w-full px-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl focus:border-[#9D50BB] focus:outline-none text-xs text-white placeholder-[#71717A] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1AA] font-semibold">Descrição (Opcional)</label>
                <input 
                  type="text" 
                  value={newPlaylistDesc}
                  onChange={e => setNewPlaylistDesc(e.target.value)}
                  placeholder="Ex: Trilha lo-fi lenta para focar"
                  className="w-full px-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl focus:border-[#9D50BB] focus:outline-none text-xs text-white placeholder-[#71717A] transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-[10px] font-bold text-[#71717A] hover:text-white transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#9D50BB] hover:bg-[#9D50BB]/95 text-[10px] font-bold text-black rounded-xl transition shadow-lg shadow-[#9D50BB]/20"
                >
                  Salvar Playlist
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {playlistToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#121214] border border-[#1F1F22] p-6 rounded-xl space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" /> Excluir Playlist?
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Tem certeza que deseja excluir a playlist <strong className="text-white">"{playlistToDelete.name}"</strong>? Esta ação é permanente e não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setPlaylistToDelete(null)}
                  className="px-4 py-2 rounded-xl text-[10px] font-bold text-[#71717A] hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-[10px] font-bold text-white rounded-xl transition cursor-pointer"
                >
                  Excluir Permanentemente
                </button>
              </div>
            </motion.div>
          </div>
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

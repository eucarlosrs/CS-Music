import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { Song, LicensingRequest } from '../types';
import { db, auth, storage } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Sliders, 
  FileText, 
  TrendingUp, 
  Music, 
  Mail, 
  Phone, 
  FileCheck, 
  Disc, 
  RefreshCw, 
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Building,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageLinkValidatorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label: string;
}

const ImageLinkValidator: React.FC<ImageLinkValidatorProps> = ({ value, onChange, placeholder, label }) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    const trimmed = (typeof value === 'string' ? value : '').trim();
    if (!trimmed) {
      setStatus('idle');
      setPreviewUrl('');
      return;
    }

    // Check if it's a URL-like string
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setStatus('invalid');
      setPreviewUrl('');
      return;
    }

    setStatus('checking');
    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        setStatus('valid');
        setPreviewUrl(trimmed);
      };
      img.onerror = () => {
        setStatus('invalid');
        setPreviewUrl('');
      };
      img.src = trimmed;
    }, 600); // debounce input

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-[#A1A1AA] font-bold">{label}</label>
        {status === 'checking' && (
          <span className="text-[9px] text-amber-400 font-medium flex items-center gap-1 animate-pulse">
            <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" /> Verificando...
          </span>
        )}
        {status === 'valid' && (
          <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-2.5 h-2.5" /> Válida
          </span>
        )}
        {status === 'invalid' && (
          <span className="text-[9px] text-red-400 font-bold flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5 text-red-400" /> Link inválido/quebrado
          </span>
        )}
      </div>
      
      <div className="flex gap-2 items-center">
        <input 
          type="text" 
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 bg-[#18181B] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition font-mono"
        />
        {/* Instant Preview Badge */}
        <div className="w-8 h-8 rounded-full bg-[#18181B] border border-[#27272A] shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
          {status === 'valid' && previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : status === 'checking' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          ) : status === 'invalid' ? (
            <ShieldAlert className="w-4 h-4 text-red-400" />
          ) : (
            <span className="text-[9px] text-neutral-600 font-bold">Sem</span>
          )}
        </div>
      </div>
    </div>
  );
};

interface ArtistInputWithAutocompleteProps {
  nameValue: string;
  onNameChange: (val: string) => void;
  imgValue: string;
  onImgChange: (val: string) => void;
  label: string;
  placeholder: string;
  songs: Song[];
}

const ArtistInputWithAutocomplete: React.FC<ArtistInputWithAutocompleteProps> = ({
  nameValue,
  onNameChange,
  imgValue,
  onImgChange,
  label,
  placeholder,
  songs,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract unique candidate artists with valid image URLs
  const uniqueArtists = useMemo(() => {
    const list: Array<{ name: string; imageUrl: string }> = [];
    const seen = new Set<string>();

    songs.forEach((song) => {
      if (song.candidateArtists) {
        song.candidateArtists.forEach((artist) => {
          if (artist.name && artist.imageUrl) {
            const norm = artist.name.trim().toLowerCase();
            if (!seen.has(norm)) {
              seen.add(norm);
              list.push({ name: artist.name.trim(), imageUrl: artist.imageUrl.trim() });
            }
          }
        });
      }
    });
    return list;
  }, [songs]);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    const trimmed = nameValue.trim().toLowerCase();
    if (!trimmed) return [];
    return uniqueArtists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(trimmed) &&
        artist.name.toLowerCase() !== trimmed
    );
  }, [nameValue, uniqueArtists]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (artist: { name: string; imageUrl: string }) => {
    onNameChange(artist.name);
    onImgChange(artist.imageUrl);
    setShowSuggestions(false);
  };

  return (
    <div className="p-3 bg-[#131315] border border-[#1F1F22] rounded-xl space-y-2.5 relative" ref={containerRef}>
      <div className="space-y-1 relative">
        <label className="text-[10px] text-[#A1A1AA] font-bold">{label} - Nome *</label>
        <div className="relative">
          <input
            type="text"
            required
            value={nameValue}
            onChange={(e) => {
              onNameChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 bg-[#18181B] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition"
          />

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 left-0 right-0 mt-1 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl max-h-36 overflow-y-auto divide-y divide-[#27272A]"
              >
                {suggestions.map((artist, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(artist)}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#27272A]/50 transition text-left text-xs text-white"
                  >
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-6 h-6 rounded-full object-cover border border-[#27272A]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="truncate font-bold">{artist.name}</span>
                    <span className="text-[9px] text-[#00E5FF] ml-auto font-semibold">Preencher</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ImageLinkValidator
        value={imgValue}
        onChange={onImgChange}
        label={`${label} - Link da Miniatura (Opcional)`}
        placeholder="Link da imagem (Unsplash, etc.)"
      />
    </div>
  );
};

interface AdminPanelProps {
  onTriggerLogin?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onTriggerLogin }) => {
  const { songs, reloadSongs, userProfile } = useAudio();
  const [licensingRequests, setLicensingRequests] = useState<LicensingRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'musicas' | 'licenciamento' | 'estatisticas'>('musicas');
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Song uploading states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [audioFileError, setAudioFileError] = useState('');
  
  // Storage upload states
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [coverProgress, setCoverProgress] = useState<number>(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);

  // Form fields
  const [songName, setSongName] = useState('');
  const [songAlbum, setSongAlbum] = useState('');
  const [songGenre, setSongGenre] = useState('');
  const [songSecondGenre, setSongSecondGenre] = useState('');
  const [songYear, setSongYear] = useState(new Date().getFullYear());
  const [songCoverUrl, setSongCoverUrl] = useState('');
  const [songAudioUrl, setSongAudioUrl] = useState('');
  const [songLyrics, setSongLyrics] = useState('');

  // 4 Candidate Artists for "Na voz desse artista vira hit"
  const [candidateArtist1, setCandidateArtist1] = useState('');
  const [candidateArtist1Img, setCandidateArtist1Img] = useState('');
  const [candidateArtist2, setCandidateArtist2] = useState('');
  const [candidateArtist2Img, setCandidateArtist2Img] = useState('');
  const [candidateArtist3, setCandidateArtist3] = useState('');
  const [candidateArtist3Img, setCandidateArtist3Img] = useState('');
  const [candidateArtist4, setCandidateArtist4] = useState('');
  const [candidateArtist4Img, setCandidateArtist4Img] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminStatusMsg, setAdminStatusMsg] = useState('');

  // Firebase Storage Upload Handlers
  const handleUploadAudio = async (file: File) => {
    if (!file) return;
    setIsUploadingAudio(true);
    setAudioProgress(0);
    setAudioFileError('');
    
    const fileId = Math.random().toString(36).substring(2, 9);
    const storageRef = ref(storage, `songs/audio/${fileId}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setAudioProgress(progress);
      },
      (error) => {
        console.error("Audio upload error:", error);
        setAudioFileError(`Erro no upload do áudio: ${error.message}`);
        setIsUploadingAudio(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setSongAudioUrl(downloadUrl);
          setAudioFileError('');
        } catch (err: any) {
          setAudioFileError(`Erro ao obter URL do áudio: ${err.message}`);
        } finally {
          setIsUploadingAudio(false);
        }
      }
    );
  };

  const handleUploadCover = async (file: File) => {
    if (!file) return;
    setIsUploadingCover(true);
    setCoverProgress(0);
    
    const fileId = Math.random().toString(36).substring(2, 9);
    const storageRef = ref(storage, `songs/covers/${fileId}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setCoverProgress(progress);
      },
      (error) => {
        console.error("Cover upload error:", error);
        setAdminStatusMsg(`Erro no upload da capa: ${error.message}`);
        setIsUploadingCover(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setSongCoverUrl(downloadUrl);
        } catch (err: any) {
          setAdminStatusMsg(`Erro ao obter URL da imagem de capa: ${err.message}`);
        } finally {
          setIsUploadingCover(false);
        }
      }
    );
  };

  // Fetch licensing requests in real-time
  useEffect(() => {
    const path = 'licensing_requests';
    setIsLoadingRequests(true);
    
    // Subscribe to licensing requests
    const unsub = onSnapshot(collection(db, path), (querySnapshot) => {
      const requestsList: LicensingRequest[] = [];
      querySnapshot.forEach((docSnap) => {
        requestsList.push(docSnap.data() as LicensingRequest);
      });
      // Sort newest first
      requestsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLicensingRequests(requestsList);
      setIsLoadingRequests(false);
    }, (error) => {
      console.warn("Requests snap error: (likely missing permissions if not admin)", error);
      // Fallback local storage
      const fallbackRequests = JSON.parse(localStorage.getItem('cs_licensing_requests') || '[]');
      setLicensingRequests(fallbackRequests);
      setIsLoadingRequests(false);
    });

    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingSong(null);
    setSongName('');
    setSongAlbum('');
    setSongGenre('Synthwave');
    setSongSecondGenre('');
    setSongYear(new Date().getFullYear());
    setSongCoverUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80');
    setSongAudioUrl(''); // Empty so we prompt upload
    setSongLyrics('');
    setCandidateArtist1('');
    setCandidateArtist1Img('');
    setCandidateArtist2('');
    setCandidateArtist2Img('');
    setCandidateArtist3('');
    setCandidateArtist3Img('');
    setCandidateArtist4('');
    setCandidateArtist4Img('');
    setShowAddForm(true);
    setAdminStatusMsg('');
    setAudioProgress(0);
    setCoverProgress(0);
    setIsUploadingAudio(false);
    setIsUploadingCover(false);
    setAudioFileError('');
  };

  const handleOpenEdit = (song: Song) => {
    setEditingSong(song);
    setSongName(song.name);
    setSongAlbum(song.album);
    setSongGenre(song.genre);
    setSongSecondGenre(song.secondGenre || '');
    setSongYear(song.year);
    setSongCoverUrl(song.coverUrl);
    setSongAudioUrl(song.audioUrl);
    setSongLyrics(song.lyrics);
    setCandidateArtist1(song.candidateArtists?.[0]?.name || '');
    setCandidateArtist1Img(song.candidateArtists?.[0]?.imageUrl || '');
    setCandidateArtist2(song.candidateArtists?.[1]?.name || '');
    setCandidateArtist2Img(song.candidateArtists?.[1]?.imageUrl || '');
    setCandidateArtist3(song.candidateArtists?.[2]?.name || '');
    setCandidateArtist3Img(song.candidateArtists?.[2]?.imageUrl || '');
    setCandidateArtist4(song.candidateArtists?.[3]?.name || '');
    setCandidateArtist4Img(song.candidateArtists?.[3]?.imageUrl || '');
    setShowAddForm(true);
    setAdminStatusMsg('');
    setAudioProgress(100);
    setCoverProgress(100);
    setIsUploadingAudio(false);
    setIsUploadingCover(false);
    setAudioFileError('');
  };

  const handleDeleteSong = async (songId: string) => {
    try {
      await deleteDoc(doc(db, 'songs', songId));
      setAdminStatusMsg('Música removida com sucesso!');
      reloadSongs();
      setSongToDelete(null);
    } catch (e: any) {
      setAdminStatusMsg('Erro de permissão ou rede ao remover música.');
      setSongToDelete(null);
    }
  };

  const handleSaveSongForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songName || !songAudioUrl) return;
    setIsSubmitting(true);

    const songId = editingSong ? editingSong.id : 'cs_' + Math.random().toString(36).substring(2, 9);
    
    const payload: Song = {
      id: songId,
      name: songName,
      artist: 'CS Estúdio',
      album: 'CS Estúdio',
      genre: songGenre || 'Ambient',
      year: isNaN(Number(songYear)) || Number(songYear) <= 0 ? new Date().getFullYear() : Number(songYear),
      coverUrl: songCoverUrl || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=600&auto=format&fit=crop&q=80',
      audioUrl: songAudioUrl,
      lyrics: songLyrics || 'Instrumental',
      plays: editingSong ? editingSong.plays : 0,
      createdAt: editingSong ? editingSong.createdAt : new Date().toISOString()
    };

    if (songSecondGenre.trim()) {
      payload.secondGenre = songSecondGenre.trim();
    }

    const oldArtists = editingSong?.candidateArtists || [];
    const getVotes = (index: number, newName: string) => {
      const oldArt = oldArtists[index];
      if (oldArt && oldArt.name.trim().toLowerCase() === newName.trim().toLowerCase()) {
        return oldArt.votes;
      }
      return 0;
    };

    payload.candidateArtists = [
      { 
        name: candidateArtist1.trim() || 'Artista 1', 
        votes: getVotes(0, candidateArtist1),
        imageUrl: candidateArtist1Img.trim() || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      },
      { 
        name: candidateArtist2.trim() || 'Artista 2', 
        votes: getVotes(1, candidateArtist2),
        imageUrl: candidateArtist2Img.trim() || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
      },
      { 
        name: candidateArtist3.trim() || 'Artista 3', 
        votes: getVotes(2, candidateArtist3),
        imageUrl: candidateArtist3Img.trim() || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face'
      },
      { 
        name: candidateArtist4.trim() || 'Artista 4', 
        votes: getVotes(3, candidateArtist4),
        imageUrl: candidateArtist4Img.trim() || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
      },
    ];

    try {
      await setDoc(doc(db, 'songs', songId), payload);
      setAdminStatusMsg(editingSong ? 'Música atualizada com sucesso!' : 'Música adicionada com sucesso!');
      setShowAddForm(false);
      reloadSongs();
    } catch (err: any) {
      console.error(err);
      const detailedError = err?.message || 'Erro de permissão ou rede';
      setAdminStatusMsg(`Erro ao salvar música: ${detailedError}. Verifique permissões do Firebase.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, currentStatus: any, nextStatus: 'Novo' | 'Em andamento' | 'Fechado') => {
    try {
      const requestRef = doc(db, 'licensing_requests', requestId);
      await updateDoc(requestRef, {
        status: nextStatus
      });
      // update local storage fallback if needed
      const fallbackRequests = JSON.parse(localStorage.getItem('cs_licensing_requests') || '[]');
      const updated = fallbackRequests.map((r: LicensingRequest) => r.id === requestId ? { ...r, status: nextStatus } : r);
      localStorage.setItem('cs_licensing_requests', JSON.stringify(updated));
    } catch (err) {
      console.warn("Failed to update status in Firestore: ", err);
      // fallback local update
      const fallbackRequests = JSON.parse(localStorage.getItem('cs_licensing_requests') || '[]');
      const updated = fallbackRequests.map((r: LicensingRequest) => r.id === requestId ? { ...r, status: nextStatus } : r);
      localStorage.setItem('cs_licensing_requests', JSON.stringify(updated));
      setLicensingRequests(updated);
    }
  };

  // Authenticate Admin access (strictly restricted to carlosrs.email@gmail.com)
  const isUserAdmin = auth.currentUser?.email === 'carlosrs.email@gmail.com';

  if (!isUserAdmin) {
    return (
      <div id="admin-forbidden-view" className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-sm mx-auto space-y-4 text-white">
        <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">Acesso Restrito ao Administrador</h2>
        <p className="text-[#A1A1AA] text-xs leading-relaxed">
          O Painel de Gerenciamento do CS Estúdio é restrito apenas à nossa equipe de licenciamento e administração.
        </p>

        {onTriggerLogin && (
          <button
            onClick={onTriggerLogin}
            className="w-full mt-2 py-2.5 px-4 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black text-xs font-bold rounded-xl transition duration-150 active:scale-95 shadow-lg shadow-[#00E5FF]/10 cursor-pointer"
          >
            Fazer Login como Administrador
          </button>
        )}

        <div className="p-3.5 bg-[#18181B] border border-[#1F1F22] rounded-xl text-[11px] text-[#71717A] mt-2">
          Dica para testadores: Faça login com o email de desenvolvedores cadastrado (<strong>carlosrs.email@gmail.com</strong>) para liberar todas as funcionalidades deste painel de controle.
        </div>
      </div>
    );
  }

  // Calculate statistics totals
  const totalPlays = songs.reduce((sum, s) => sum + s.plays, 0);
  const mostPopularSong = [...songs].sort((a, b) => b.plays - a.plays)[0];

  return (
    <div id="admin-panel-container" className="pb-32 space-y-6 text-white">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Painel Administrativo CS Estúdio</h1>
          <p className="text-xs text-[#71717A] font-medium">Controle de músicas originais, licenciamento comercial e métricas de desempenho.</p>
        </div>
        <button 
          id="refresh-assets-btn"
          onClick={() => { reloadSongs(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1F1F22] hover:border-[#27272A] bg-[#18181B] text-xs text-[#A1A1AA] hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar Catálogo
        </button>
      </div>

      {adminStatusMsg && (
        <div className="p-3 bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded-xl text-[#00E5FF] text-xs font-semibold">
          {adminStatusMsg}
        </div>
      )}

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl shadow-lg">
          <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">Faixas Ativas</p>
          <p className="text-xl font-bold font-mono text-[#9D50BB] font-extrabold mt-1">{songs.length}</p>
        </div>
        <div className="p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl shadow-lg">
          <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">Licenciamentos</p>
          <p className="text-xl font-bold font-mono text-[#00E5FF] font-extrabold mt-1">{licensingRequests.length}</p>
        </div>
        <div className="p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl shadow-lg">
          <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">Total Audições</p>
          <p className="text-xl font-bold font-mono text-[#00E5FF] font-extrabold mt-1">{totalPlays.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl shadow-lg">
          <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">Destaque Atual</p>
          <p className="text-xs font-bold text-[#9D50BB] truncate mt-1.5 font-extrabold">{mostPopularSong ? mostPopularSong.name : 'Vazio'}</p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-[#1F1F22]">
        {(['musicas', 'licenciamento', 'estatisticas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider relative transition ${
              activeTab === tab ? 'text-white font-extrabold' : 'text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="admin-active-bar" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9D50BB]" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content view switching */}
      <div className="mt-4">
        {/* --- TABS: MUSIC LIST AND UPLOADING --- */}
        {activeTab === 'musicas' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-[#F4F4F5]">Catálogo de Reprodução</h2>
              <button 
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9D50BB] hover:bg-[#9D50BB]/95 text-xs font-extrabold text-black shadow-lg shadow-[#9D50BB]/20 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" /> Cadastrar Música
              </button>
            </div>

            {/* Upload / Edit form modal inline */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#121214] border border-[#1F1F22] p-5 md:p-6 rounded-xl space-y-4 shadow-2xl"
                >
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Music className="w-4.5 h-4.5 text-[#9D50BB]" />
                    {editingSong ? 'Editar Informações da Trilha' : 'Efetuar Cadastro de Nova Trilha original'}
                  </h3>

                  <form onSubmit={handleSaveSongForm} className="space-y-4">
                    {/* Guia de Solução para Firebase Storage */}
                    <div className="bg-[#1D120B] border border-orange-500/30 rounded-2xl p-4 text-xs text-orange-200/95 space-y-2 leading-relaxed">
                      <p className="font-extrabold flex items-center gap-2 text-sm text-orange-300">
                        <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />
                        Upload travado em 0%? Como ativar o Firebase Storage gratuito em 1 minuto:
                      </p>
                      <p>
                        Por padrão, o <strong>Firebase Storage</strong> não vem ativado de fábrica no projeto do Firebase. Se você nunca clicou nele no painel do Firebase, o navegador ficará tentando fazer o upload indefinidamente (ficando em 0% ou com erro).
                      </p>
                      <p className="font-semibold text-white">
                        Siga estes passos simples para consertar:
                      </p>
                      <ul className="list-decimal pl-4.5 space-y-1">
                        <li>
                          Acesse diretamente o console de Storage do seu projeto:{" "}
                          <a 
                            href="https://console.firebase.google.com/project/gen-lang-client-0472481079/storage" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="underline text-[#00E5FF] font-black hover:text-[#00E5FF]/80 transition inline-flex items-center gap-0.5"
                          >
                            Ir para o Firebase Storage <ExternalLink className="w-3 h-3 inline" />
                          </a>
                        </li>
                        <li>Clique no botão azul <strong>"Começar" (Get Started)</strong>.</li>
                        <li>Escolha a primeira opção <strong>"Iniciar no modo de teste"</strong> (desta forma, as regras de segurança permitirão gravações e uploads de arquivos do aplicativo).</li>
                        <li>Avance clicando em <strong>Próximo</strong> e depois em <strong>Concluído</strong> para criar o bucket de arquivos.</li>
                        <li>Uma vez concluído, volte aqui de imediato e tente fazer o upload novamente. Ele carregará com sucesso a 100%!</li>
                      </ul>
                      <p className="text-[10px] text-[#A1A1AA]/80 italic pt-1 border-t border-[#27272A]">
                        Dica Extra: Enquanto você não ativa o Storage, se quiser experimentar a música no player imediatamente, você pode simplesmente digitar ou colar qualquer link direto de MP3 válido (ou usar o link pré-carregado) no campo "Link do áudio ativo" ao final do formulário!
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="text-xs text-[#A1A1AA] font-semibold">Título da Faixa *</label>
                        <input 
                          type="text" 
                          required
                          value={songName}
                          onChange={e => setSongName(e.target.value)}
                          placeholder="Ex: Neon Horizon II"
                          className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] focus:border-[#9D50BB] focus:outline-none rounded-xl text-sm text-white placeholder-[#71717A] transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-[#A1A1AA] font-semibold">Gênero Musical *</label>
                        <input 
                          type="text" 
                          required
                          value={songGenre}
                          onChange={e => setSongGenre(e.target.value)}
                          placeholder="Ex: Synthwave, Lo-Fi, Cinematic"
                          className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] focus:border-[#9D50BB] focus:outline-none rounded-xl text-sm text-white placeholder-[#71717A] transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-[#A1A1AA] font-semibold">Segundo Gênero (Opcional)</label>
                        <input 
                          type="text" 
                          value={songSecondGenre}
                          onChange={e => setSongSecondGenre(e.target.value)}
                          placeholder="Ex: Pop, Rock, Electronica (para híbridos)"
                          className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] focus:border-[#9D50BB] focus:outline-none rounded-xl text-sm text-white placeholder-[#71717A] transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-[#A1A1AA] font-semibold">Ano de Lançamento</label>
                        <input 
                          type="number" 
                          value={songYear}
                          onChange={e => setSongYear(Number(e.target.value))}
                          placeholder="Ex: 2026"
                          className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] focus:border-[#9D50BB] focus:outline-none rounded-xl text-sm text-white placeholder-[#71717A] transition"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-xs text-[#A1A1AA] font-semibold">Imagem de Capa (Arte de Álbum opcional)</label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center bg-[#18181B]/50 p-3 rounded-xl border border-[#27272A]">
                          {songCoverUrl ? (
                            <img 
                              src={songCoverUrl} 
                              alt="Capa" 
                              className="w-16 h-16 rounded-xl object-cover mx-auto border border-[#27272A]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=600&auto=format&fit=crop&q=80';
                              }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-xs text-[#71717A] mx-auto">
                              Sem Foto
                            </div>
                          )}
                          <div className="sm:col-span-3 space-y-2">
                            <div className="relative group/cover flex flex-col items-center justify-center border border-dashed border-[#27272A] hover:border-[#9D50BB]/40 rounded-xl p-3 transition text-center cursor-pointer">
                              <input 
                                type="file" 
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadCover(e.target.files[0]);
                                  }
                                }}
                              />
                              <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA] group-hover/cover:text-white transition font-medium">
                                <Upload className="w-4 h-4 text-[#9D50BB]" />
                                <span>{isUploadingCover ? 'Fazendo upload...' : 'Fazer upload de imagem'}</span>
                              </div>
                            </div>
                            
                            {isUploadingCover && (
                              <div className="space-y-1">
                                <div className="h-1 bg-[#27272A] rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-[#9D50BB]" 
                                    style={{ width: `${coverProgress}%` }}
                                    animate={{ width: `${coverProgress}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] text-[#71717A] font-mono">
                                  <span>Progresso...</span>
                                  <span>{coverProgress}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <input 
                          type="text" 
                          value={songCoverUrl}
                          onChange={e => setSongCoverUrl(e.target.value)}
                          placeholder="Cole o endereço HTTPS da capa ou faça o upload acima"
                          className="w-full px-4 py-2 bg-[#18181B] border border-[#27272A] focus:border-[#9D50BB] focus:outline-none rounded-xl text-xs text-white placeholder-[#71717A] transition"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs text-[#A1A1AA] font-semibold">Arquivo de Áudio (.MP3/Suno/etc) *</label>
                        
                        <div className="bg-[#18181B]/50 p-4 rounded-xl border border-[#27272A] space-y-3">
                          <div className="relative group/audio flex flex-col items-center justify-center border border-dashed border-[#27272A] hover:border-[#00E5FF]/40 rounded-xl p-4 transition text-center cursor-pointer">
                            <input 
                              type="file" 
                              accept="audio/*"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadAudio(e.target.files[0]);
                                  }
                              }}
                            />
                            <div className="space-y-1">
                              <Upload className="w-5 h-5 mx-auto text-[#00E5FF] group-hover/audio:scale-110 transition duration-300" />
                              <p className="text-xs font-semibold text-[#A1A1AA] group-hover/audio:text-white transition">
                                {isUploadingAudio ? 'Fazendo upload do áudio para o Firebase Storage...' : 'Clique ou selecione um arquivo de áudio local'}
                              </p>
                              <p className="text-[10px] text-[#71717A]">
                                O arquivo será hospedado gratuitamente no Firebase Storage da sua conta com reprodução garantida
                              </p>
                            </div>
                          </div>

                          {isUploadingAudio && (
                            <div className="space-y-1">
                              <div className="h-1 bg-[#27272A] rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-[#00E5FF]" 
                                  style={{ width: `${audioProgress}%` }}
                                  animate={{ width: `${audioProgress}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-[#71717A] font-mono font-bold">
                                <span>Progresso do upload...</span>
                                <span>{audioProgress}%</span>
                              </div>
                            </div>
                          )}

                          {audioFileError && (
                            <p className="text-[11px] text-red-500 font-medium">{audioFileError}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-[#71717A] font-medium">Link do áudio ativo (preenchido dinamicamente com o upload acima):</span>
                          <input 
                            type="text" 
                            required
                            value={songAudioUrl}
                            onChange={e => setSongAudioUrl(e.target.value)}
                            placeholder="Link de áudio direto ou preenchido dinamicamente pelo upload acima"
                            className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-xl text-xs font-mono text-[#00E5FF] placeholder-[#71717A] transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs text-[#A1A1AA] font-semibold">Letra da Música (opcional, suporta quebras de linha)</label>
                        <textarea 
                          rows={4}
                          value={songLyrics}
                          onChange={e => setSongLyrics(e.target.value)}
                          placeholder="Escreva a letra da composição..."
                          className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] focus:border-[#9D50BB] focus:outline-none rounded-xl text-sm text-white placeholder-[#71717A] transition"
                        />
                      </div>

                      {/* Candidate Artists Section */}
                      <div className="space-y-3 md:col-span-2 border-t border-[#1F1F22] pt-4 mt-2">
                        <label className="text-xs text-[#00E5FF] font-bold block uppercase tracking-wider">
                          Artistas Candidatos - "Na Voz Desse Artista Vira Hit" (Exatamente 4)
                        </label>
                        <p className="text-[11px] text-[#71717A] font-semibold leading-tight">
                          Defina os 4 artistas sugeridos e coloque um link de imagem/avatar opcional para que apareçam miniaturas na tela de votação. Se deixar em branco, o sistema utilizará um avatar bonito automaticamente!
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          {/* Artista 1 */}
                          <ArtistInputWithAutocomplete
                            nameValue={candidateArtist1}
                            onNameChange={setCandidateArtist1}
                            imgValue={candidateArtist1Img}
                            onImgChange={setCandidateArtist1Img}
                            label="Artista 1"
                            placeholder="Ex: Roberto Carlos"
                            songs={songs}
                          />

                          {/* Artista 2 */}
                          <ArtistInputWithAutocomplete
                            nameValue={candidateArtist2}
                            onNameChange={setCandidateArtist2}
                            imgValue={candidateArtist2Img}
                            onImgChange={setCandidateArtist2Img}
                            label="Artista 2"
                            placeholder="Ex: Marília Mendonça"
                            songs={songs}
                          />

                          {/* Artista 3 */}
                          <ArtistInputWithAutocomplete
                            nameValue={candidateArtist3}
                            onNameChange={setCandidateArtist3}
                            imgValue={candidateArtist3Img}
                            onImgChange={setCandidateArtist3Img}
                            label="Artista 3"
                            placeholder="Ex: Alok"
                            songs={songs}
                          />

                          {/* Artista 4 */}
                          <ArtistInputWithAutocomplete
                            nameValue={candidateArtist4}
                            onNameChange={setCandidateArtist4}
                            imgValue={candidateArtist4Img}
                            onImgChange={setCandidateArtist4Img}
                            label="Artista 4"
                            placeholder="Ex: Gustavo Lima"
                            songs={songs}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A] hover:text-white transition"
                      >
                        Descartar
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00E5FF] text-black font-extrabold text-xs shadow-lg shadow-[#00E5FF]/20 active:scale-95 transition disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {editingSong ? 'Atualizar Trilha' : 'Salvar no Catálogo'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List of active songs with management controls */}
            <div className="bg-[#18181B] border border-[#1F1F22] rounded-xl overflow-hidden divide-y divide-[#1F1F22] shadow-lg">
              {songs.length === 0 ? (
                <div className="py-12 text-center text-[#71717A] text-xs font-medium">
                  Nenhuma música encontrada no catálogo.
                </div>
              ) : (
                songs.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 p-3 hover:bg-[#27272A]/40 transition group">
                    <img 
                      src={song.coverUrl} 
                      alt="" 
                      className="w-11 h-11 rounded-xl object-cover shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate text-white" title={song.name}>{song.name}</h4>
                      <p className="text-xs text-[#71717A] truncate font-medium mt-0.5">
                        {song.genre}{song.secondGenre ? ` + ${song.secondGenre}` : ''} • {song.year} • <span className="font-mono text-[10px] text-[#A1A1AA]">{song.plays} {song.plays === 1 ? 'play' : 'plays'}</span>
                      </p>
                    </div>

                    {/* Manage row */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => handleOpenEdit(song)}
                        className="p-2 rounded-xl bg-[#050505] border border-[#1F1F22] text-[#71717A] hover:text-[#00E5FF] transition shadow-sm cursor-pointer"
                        title="Editar Música"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setSongToDelete(song)}
                        className="p-2 rounded-xl bg-[#050505] border border-[#1F1F22] text-red-500 hover:text-red-400 transition shadow-sm cursor-pointer"
                        title="Excluir Música"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TABS: LICENSING APPLICATIONS --- */}
        {activeTab === 'licenciamento' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#F4F4F5]">Solicitações de Licenciamento Comercial</h2>

            {isLoadingRequests ? (
              <div className="py-12 text-center text-[#71717A] text-xs font-semibold">
                Carregando solicitações ativas...
              </div>
            ) : licensingRequests.length === 0 ? (
              <div className="py-12 text-center text-[#71717A] text-xs leading-relaxed max-w-sm mx-auto font-semibold">
                Nenhuma solicitação comercial pendente.
              </div>
            ) : (
              <div className="space-y-4">
                {licensingRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-5 bg-[#18181B] border border-[#1F1F22] rounded-xl relative overflow-hidden shadow-lg"
                  >
                    {/* Lateral indicator ribbon */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                      req.status === 'Novo' ? 'bg-[#00E5FF]' :
                      req.status === 'Em andamento' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 ml-2">
                      <div className="space-y-3 flex-1 min-w-0">
                        {/* Title details */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{req.fullName}</span>
                          {req.offerValue !== undefined && (
                            <span className="inline-flex items-center gap-1 text-xs bg-[#00E5FF]/10 border border-[#00E5FF]/25 px-2 py-0.5 font-black text-[#00E5FF] rounded-lg font-mono">
                              Ofertou: R$ {req.offerValue.toFixed(2)}
                            </span>
                          )}
                          {req.company && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-[#050505] border border-[#1F1F22] rounded-lg px-2 py-0.5 text-[#A1A1AA]">
                              <Building className="w-3 h-3" /> {req.company}
                            </span>
                          )}
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-lg ${
                            req.status === 'Novo' ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20' :
                            req.status === 'Em andamento' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        {/* Contact info block */}
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[#71717A] font-medium font-mono">
                          {req.email && (
                            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {req.email}</span>
                          )}
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {req.phone}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(req.createdAt).toLocaleDateString('pt-BR')}</span>
                          <a 
                            href={`https://wa.me/${req.phone.replace(/\D/g, '').startsWith('55') || req.phone.replace(/\D/g, '').length < 10 ? req.phone.replace(/\D/g, '') : '55' + req.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 font-extrabold"
                            title="Chamar no WhatsApp"
                          >
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            WhatsApp
                          </a>
                        </div>

                        {/* Highlighted core target song */}
                        <div className="p-3 bg-[#050505] rounded-xl border border-[#1F1F22] flex items-center gap-3 shadow-inner">
                          <div id={`target-song-${req.songId}`} className="w-7 h-7 rounded bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-[#71717A] uppercase font-mono">Trilha Comercial requisitada:</p>
                            <h4 className="text-xs font-bold text-white truncate">"{req.songName}"</h4>
                          </div>
                        </div>

                        {/* Custom project description */}
                        <div className="space-y-1">
                          <p className="text-xs text-[#71717A] font-bold">Tipo de Uso / Projeto:</p>
                          <p className="text-xs text-[#D4D4D8] bg-[#050505] p-3 rounded-xl border border-[#1F1F22] leading-relaxed whitespace-pre-wrap">{req.purpose}</p>
                        </div>

                        {req.message && (
                          <div className="space-y-1">
                            <p className="text-xs text-[#71717A] font-bold">Mensagem Adicional:</p>
                            <p className="text-xs text-[#A1A1AA] italic bg-[#050505] p-3 border border-[#1F1F22] rounded-xl">{req.message}</p>
                          </div>
                        )}
                      </div>

                      {/* Control panel for updating order statuses */}
                      <div className="flex md:flex-col items-center gap-2 pt-2 shrink-0">
                        <span className="text-[10px] text-[#71717A] font-extrabold uppercase">Ações do Negócio</span>
                        <div className="flex flex-wrap md:flex-col gap-1.5">
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, req.status, 'Novo')}
                            disabled={req.status === 'Novo'}
                            className="px-3 py-1.5 rounded-lg border border-[#1F1F22] text-[10px] font-extrabold bg-[#050505] hover:bg-[#27272A] text-[#71717A] hover:text-white transition disabled:opacity-30"
                          >
                            Novo
                          </button>
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, req.status, 'Em andamento')}
                            disabled={req.status === 'Em andamento'}
                            className="px-3 py-1.5 rounded-lg border border-amber-500/20 text-[10px] font-extrabold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition disabled:opacity-30"
                          >
                            Em andamento
                          </button>
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, req.status, 'Fechado')}
                            disabled={req.status === 'Fechado'}
                            className="px-3 py-1.5 rounded-lg border border-emerald-500/20 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition disabled:opacity-30"
                          >
                            Fechado
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TABS: STATISTICS --- */}
        {activeTab === 'estatisticas' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-[#F4F4F5]">Análise de Performance de faixas</h2>

            {/* Simulated analytics boards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Popular list */}
              <div className="bg-[#18181B] border border-[#1F1F22] rounded-xl p-6 space-y-4 shadow-lg">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#9D50BB]" />
                  Métricas de Alcance Individual
                </h3>

                <div className="space-y-3">
                  {songs.slice(0, 4).map((s, i) => (
                    <div key={s.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-[#D4D4D8] truncate max-w-xs">{s.name}</span>
                        <span className="font-mono text-[#71717A] font-bold">{s.plays.toLocaleString()} plays</span>
                      </div>
                      {/* Bar graph item */}
                      <div className="relative h-2 bg-[#050505] border border-[#1F1F22] rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-gradient-to-r from-[#00E5FF] to-[#9D50BB] rounded-full"
                          style={{ width: `${mostPopularSong ? (s.plays / mostPopularSong.plays) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audience breakdown widget */}
              <div className="bg-[#18181B] border border-[#1F1F22] rounded-xl p-6 space-y-4 shadow-lg">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-4.5 h-4.5 text-[#00E5FF]" />
                  Distribuição Geográfica de Engajamento
                </h3>

                <div className="space-y-2.5 text-xs text-[#A1A1AA] font-medium">
                  <div className="flex items-center justify-between p-2 bg-[#050505] border border-[#1F1F22]/50 rounded-lg text-xs hover:border-[#1F1F22] transition">
                    <span>São Paulo, BR</span>
                    <span className="font-semibold text-white">42%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#050505] border border-[#1F1F22]/50 rounded-lg text-xs hover:border-[#1F1F22] transition">
                    <span>Rio de Janeiro, BR</span>
                    <span className="font-semibold text-white">21%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#050505] border border-[#1F1F22]/50 rounded-lg text-xs hover:border-[#1F1F22] transition">
                    <span>Lisboa, PT</span>
                    <span className="font-semibold text-white">15%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#9D50BB]/5 border border-[#9D50BB]/10 rounded-lg font-bold text-[#9D50BB]">
                    <span>Outras Cidades e Países</span>
                    <span>22%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {songToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSongToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-6 text-white"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-lg font-bold text-white">Remover Música?</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                    Você está prestes a remover <strong className="text-white italic">"{songToDelete.name}"</strong> do catálogo do CS Estúdio definitivamente.
                  </p>
                  <span className="inline-block text-[10px] text-red-400 font-bold bg-red-500/5 border border-red-500/10 rounded px-2 py-1 leading-none">
                    ⚠️ Atenção: Esta ação é irreversível e o arquivo não poderá ser restaurado.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSongToDelete(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDeleteSong(songToDelete.id)}
                  className="px-5 py-2.5 text-xs font-black rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/10 transition active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sim, Remover do Catálogo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

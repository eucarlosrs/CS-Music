import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { Song, LicensingRequest, CsDoBemAction, CsDoBemStats } from '../types';
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
  Upload,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Heart,
  Calendar,
  DollarSign,
  Globe,
  Instagram,
  Youtube,
  ShieldCheck,
  Image as ImageIcon
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
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      // Run once on mount and also inside a timeout to ensure element is rendered
      checkScroll();
      const timer = setTimeout(checkScroll, 200);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        clearTimeout(timer);
      };
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'musicas' | 'licenciamento' | 'estatisticas' | 'roleta' | 'csdobem'>('musicas');
  const [licensingRequests, setLicensingRequests] = useState<LicensingRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const autoTotalPaidLicensing = useMemo(() => {
    return licensingRequests
      .filter(req => req.status === 'Pago' || req.status === 'Fechado')
      .reduce((sum, req) => sum + (req.offerValue || 0), 0);
  }, [licensingRequests]);

  // CS do Bem stats state
  const [adminTotalRaised, setAdminTotalRaised] = useState(1250);
  const [adminInstagramUrl, setAdminInstagramUrl] = useState('https://instagram.com');
  const [adminTiktokUrl, setAdminTiktokUrl] = useState('https://tiktok.com');
  const [adminYoutubeUrl, setAdminYoutubeUrl] = useState('https://youtube.com');
  const [isSavingCsDoBemStats, setIsSavingCsDoBemStats] = useState(false);

  // CS do Bem Actions state
  const [csDoBemActions, setCsDoBemActions] = useState<CsDoBemAction[]>([]);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingAction, setEditingAction] = useState<CsDoBemAction | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDate, setActionDate] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionAmountSpent, setActionAmountSpent] = useState(0);
  const [actionVideoUrl, setActionVideoUrl] = useState('');
  const [actionPhotos, setActionPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Check scroll when activeTab or songs change
  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, [activeTab, songs]);

  // Roulette settings states
  const [sponsor1Name, setSponsor1Name] = useState('Sponsor A');
  const [sponsor1Logo, setSponsor1Logo] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&h=150&fit=crop');
  const [sponsor1Prize, setSponsor1Prize] = useState('um copo térmico personalizado');
  const [sponsor2Name, setSponsor2Name] = useState('Sponsor B');
  const [sponsor2Logo, setSponsor2Logo] = useState('https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&h=150&fit=crop');
  const [sponsor2Prize, setSponsor2Prize] = useState('um lindo boné exclusivo');
  const [csEstudioPrize, setCsEstudioPrize] = useState('Fone bluetooth do CS Estúdio');
  const [artistPrize, setArtistPrize] = useState('Fone bluetooth do CS Estúdio');
  const [isSavingRoulette, setIsSavingRoulette] = useState(false);

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
  const [showStorageGuide, setShowStorageGuide] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');

  const filteredSongsList = useMemo(() => {
    if (!songSearchQuery.trim()) return songs;
    const q = songSearchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    
    return songs.filter(s => {
      const nameNorm = s.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const artistNorm = s.artist ? s.artist.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      const albumNorm = s.album ? s.album.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      const genreNorm = s.genre ? s.genre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      const secondGenreNorm = s.secondGenre ? s.secondGenre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      
      return (
        nameNorm.includes(q) ||
        artistNorm.includes(q) ||
        albumNorm.includes(q) ||
        genreNorm.includes(q) ||
        secondGenreNorm.includes(q)
      );
    });
  }, [songs, songSearchQuery]);

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

  // Fetch roulette configuration in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'roulette', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.sponsor1Name) setSponsor1Name(data.sponsor1Name);
        if (data.sponsor1Logo) setSponsor1Logo(data.sponsor1Logo);
        if (data.sponsor1Prize) setSponsor1Prize(data.sponsor1Prize);
        if (data.sponsor2Name) setSponsor2Name(data.sponsor2Name);
        if (data.sponsor2Logo) setSponsor2Logo(data.sponsor2Logo);
        if (data.sponsor2Prize) setSponsor2Prize(data.sponsor2Prize);
        if (data.csEstudioPrize) setCsEstudioPrize(data.csEstudioPrize);
        if (data.artistPrize) setArtistPrize(data.artistPrize);
      }
    }, (error) => {
      console.warn("Error fetching roulette config:", error);
    });

    return () => unsub();
  }, []);

  const handleSaveRouletteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRoulette(true);
    try {
      await setDoc(doc(db, 'roulette', 'config'), {
        sponsor1Name,
        sponsor1Logo,
        sponsor1Prize,
        sponsor2Name,
        sponsor2Logo,
        sponsor2Prize,
        csEstudioPrize,
        artistPrize,
        updatedAt: new Date().toISOString()
      });
      setAdminStatusMsg('Configuração da roleta salva com sucesso!');
    } catch (err: any) {
      console.error("Error saving roulette config:", err);
      setAdminStatusMsg('Erro ao salvar configuração da roleta: ' + err.message);
    } finally {
      setIsSavingRoulette(false);
    }
  };

  // Subscribe to CS do Bem stats and actions
  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, 'csdobem_stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.totalRaised !== undefined) setAdminTotalRaised(data.totalRaised);
        if (data.instagramUrl) setAdminInstagramUrl(data.instagramUrl);
        if (data.tiktokUrl) setAdminTiktokUrl(data.tiktokUrl);
        if (data.youtubeUrl) setAdminYoutubeUrl(data.youtubeUrl);
      }
    });

    const unsubActions = onSnapshot(collection(db, 'csdobem_actions'), (querySnapshot) => {
      const list: CsDoBemAction[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CsDoBemAction);
      });
      list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setCsDoBemActions(list);
    });

    return () => {
      unsubStats();
      unsubActions();
    };
  }, []);

  const handleSaveCsDoBemStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCsDoBemStats(true);
    try {
      await setDoc(doc(db, 'csdobem_stats', 'global'), {
        id: 'global',
        totalRaised: Number(adminTotalRaised),
        instagramUrl: adminInstagramUrl,
        tiktokUrl: adminTiktokUrl,
        youtubeUrl: adminYoutubeUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setAdminStatusMsg('Estatísticas do CS do Bem salvas com sucesso!');
    } catch (err: any) {
      console.error("Error saving CS do Bem stats:", err);
      setAdminStatusMsg('Erro ao salvar estatísticas: ' + err.message);
    } finally {
      setIsSavingCsDoBemStats(false);
    }
  };

  const handleOpenAddAction = () => {
    setEditingAction(null);
    setActionTitle('');
    setActionDate(new Date().toLocaleDateString('pt-BR'));
    setActionDescription('');
    setActionAmountSpent(0);
    setActionVideoUrl('');
    setActionPhotos([]);
    setNewPhotoUrl('');
    setShowActionForm(true);
  };

  const handleOpenEditAction = (action: CsDoBemAction) => {
    setEditingAction(action);
    setActionTitle(action.title);
    setActionDate(action.date);
    setActionDescription(action.description);
    setActionAmountSpent(action.amountSpent);
    setActionVideoUrl(action.videoUrl || '');
    setActionPhotos(action.photos || []);
    setNewPhotoUrl('');
    setShowActionForm(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle || !actionDate) {
      alert("Título e Data são obrigatórios.");
      return;
    }
    setIsSavingAction(true);
    try {
      const actionId = editingAction ? editingAction.id : `act_${Date.now()}`;
      const payload: CsDoBemAction = {
        id: actionId,
        title: actionTitle,
        date: actionDate,
        description: actionDescription,
        amountSpent: Number(actionAmountSpent),
        photos: actionPhotos,
        videoUrl: actionVideoUrl,
        createdAt: editingAction ? (editingAction.createdAt || new Date().toISOString()) : new Date().toISOString()
      };
      await setDoc(doc(db, 'csdobem_actions', actionId), payload);
      setAdminStatusMsg(editingAction ? 'Ação social editada com sucesso!' : 'Ação social adicionada com sucesso!');
      setShowActionForm(false);
      setEditingAction(null);
    } catch (err: any) {
      console.error("Error saving social action:", err);
      setAdminStatusMsg('Erro ao salvar ação social: ' + err.message);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm("Deseja realmente excluir esta ação social definitivamente?")) return;
    try {
      await deleteDoc(doc(db, 'csdobem_actions', actionId));
      setAdminStatusMsg('Ação social excluída com sucesso!');
    } catch (err: any) {
      console.error("Error deleting social action:", err);
      setAdminStatusMsg('Erro ao excluir ação social: ' + err.message);
    }
  };

  const handleAddPhotoUrl = () => {
    if (!newPhotoUrl) return;
    setActionPhotos([...actionPhotos, newPhotoUrl]);
    setNewPhotoUrl('');
  };

  const handleRemovePhotoUrl = (idx: number) => {
    setActionPhotos(actionPhotos.filter((_, i) => i !== idx));
  };

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

      {/* Nav Tabs with side scroll arrows on Mobile */}
      <div className="relative flex items-center border-b border-[#1F1F22] select-none">
        {/* Left scroll arrow (mobile only) */}
        {canScrollLeft && (
          <div className="md:hidden absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#050505] via-[#050505]/90 to-transparent flex items-center pr-6 pl-1 z-10">
            <button 
              onClick={() => {
                if (tabsContainerRef.current) {
                  tabsContainerRef.current.scrollBy({ left: -100, behavior: 'smooth' });
                }
              }}
              className="p-1.5 rounded-full bg-[#18181B]/95 border border-[#1F1F22] text-[#9D50BB] hover:text-[#00E5FF] hover:bg-[#1F1F22] active:scale-90 transition shadow-md flex items-center justify-center cursor-pointer"
              title="Voltar guias"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab List */}
        <div 
          ref={tabsContainerRef}
          className="flex-1 flex overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth md:overflow-x-visible md:flex-wrap"
        >
          {(['musicas', 'licenciamento', 'roleta', 'estatisticas', 'csdobem'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider relative transition shrink-0 ${
                activeTab === tab ? 'text-white font-extrabold' : 'text-[#71717A] hover:text-[#D4D4D8]'
              }`}
            >
              {tab === 'musicas' ? 'Músicas' : 
               tab === 'licenciamento' ? 'Licenças / Apoios' : 
               tab === 'roleta' ? 'Roleta Premiada' : 
               tab === 'estatisticas' ? 'Estatísticas' : 'CS do Bem'}
              {activeTab === tab && (
                <motion.div 
                  layoutId="admin-active-bar" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9D50BB]" 
                />
              )}
            </button>
          ))}
        </div>

        {/* Right scroll arrow (mobile only) */}
        {canScrollRight && (
          <div className="md:hidden absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#050505] via-[#050505]/90 to-transparent flex items-center pl-6 pr-1 z-10">
            <button 
              onClick={() => {
                if (tabsContainerRef.current) {
                  tabsContainerRef.current.scrollBy({ left: 100, behavior: 'smooth' });
                }
              }}
              className="p-1.5 rounded-full bg-[#18181B]/95 border border-[#1F1F22] text-[#9D50BB] hover:text-[#00E5FF] hover:bg-[#1F1F22] active:scale-90 transition shadow-md flex items-center justify-center cursor-pointer"
              title="Avançar guias"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tab content view switching */}
      <div className="mt-4">
        {/* --- TABS: MUSIC LIST AND UPLOADING --- */}
        {activeTab === 'musicas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/30 p-2 rounded-2xl border border-[#1F1F22]/50">
              <div className="flex items-center justify-between sm:justify-start gap-4 flex-1">
                <h2 className="text-base font-black text-[#F4F4F5] font-sans tracking-tight shrink-0">
                  <span className="hidden sm:inline">Catálogo de </span>Reprodução
                </h2>
                
                {/* Lupa de busca por nome da musica e estilo */}
                <div className="relative flex items-center bg-[#18181B] border border-[#1F1F22] focus-within:border-[#00E5FF]/50 text-white rounded-xl px-3 py-1.5 w-full max-w-[180px] sm:max-w-[240px] shadow-sm transition-all duration-300">
                  <Search className="w-3.5 h-3.5 text-[#00E5FF] shrink-0 stroke-[2.5px]" />
                  <div className="h-4 w-[1px] bg-[#27272A] mx-2 shrink-0" />
                  <input
                    type="text"
                    value={songSearchQuery}
                    onChange={(e) => setSongSearchQuery(e.target.value)}
                    placeholder="Música ou Estilo"
                    className="bg-transparent text-white font-extrabold text-[11px] placeholder-[#71717A] focus:outline-none w-full font-sans cursor-text"
                  />
                  {songSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSongSearchQuery('')}
                      className="text-[#71717A] hover:text-white transition ml-1 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3px]" />
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={handleOpenAdd}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-xs font-extrabold text-black shadow-lg shadow-[#00E5FF]/10 active:scale-95 transition shrink-0 cursor-pointer"
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
                    <Music className="w-4.5 h-4.5 text-[#00E5FF]" />
                    {editingSong ? 'Editar Informações da Trilha' : 'Efetuar Cadastro de Nova Trilha original'}
                  </h3>

                  <form onSubmit={handleSaveSongForm} className="space-y-4">
                    {/* Guia de Solução para Firebase Storage */}
                    <div className="bg-[#1D120B] border border-orange-500/30 rounded-2xl p-4 text-xs text-orange-200/95 space-y-2 leading-relaxed">
                      <button
                        type="button"
                        onClick={() => setShowStorageGuide(!showStorageGuide)}
                        className="w-full flex items-center justify-between font-extrabold text-sm text-orange-300 focus:outline-none cursor-pointer"
                      >
                        <span className="flex items-center gap-2 text-left">
                          <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />
                          Upload travado em 0%? Como ativar o Firebase Storage gratuito em 1 minuto
                        </span>
                        {showStorageGuide ? (
                          <ChevronUp className="w-4.5 h-4.5 text-orange-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4.5 h-4.5 text-orange-400 shrink-0" />
                        )}
                      </button>

                      {showStorageGuide && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2 mt-2 pt-2 border-t border-orange-500/10"
                        >
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
                        </motion.div>
                      )}
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
              ) : filteredSongsList.length === 0 ? (
                <div className="py-12 text-center text-[#71717A] text-xs font-medium">
                  Nenhuma música encontrada para os critérios de busca "{songSearchQuery}".
                </div>
              ) : (
                filteredSongsList.map((song) => (
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

        {activeTab === 'roleta' && (
          <div className="space-y-6">
            <div className="bg-neutral-900/30 p-4 rounded-2xl border border-[#1F1F22]/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#F4F4F5] font-sans tracking-tight">
                  Configurações da Roleta de Prêmios
                </h2>
                <p className="text-xs text-[#71717A] font-semibold">
                  Personalize os patrocinadores, logos e prêmios que serão sorteados após o voto computado.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRouletteConfig} className="bg-[#121214] border border-[#1F1F22] p-6 rounded-xl space-y-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Patrocinador 1 */}
                <div className="space-y-4 p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl">
                  <h3 className="text-xs uppercase tracking-widest text-[#00E5FF] font-black">Patrocinador 1</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#A1A1AA] font-bold">Nome da Empresa</label>
                    <input
                      type="text"
                      required
                      value={sponsor1Name}
                      onChange={(e) => setSponsor1Name(e.target.value)}
                      placeholder="Ex: Coca-Cola"
                      className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#A1A1AA] font-bold">URL do Logo</label>
                    <input
                      type="text"
                      required
                      value={sponsor1Logo}
                      onChange={(e) => setSponsor1Logo(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#A1A1AA] font-bold">Descrição do Prêmio</label>
                    <input
                      type="text"
                      required
                      value={sponsor1Prize}
                      onChange={(e) => setSponsor1Prize(e.target.value)}
                      placeholder="Ex: um copo térmico personalizado"
                      className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition"
                    />
                  </div>
                </div>

                {/* Patrocinador 2 */}
                <div className="space-y-4 p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl">
                  <h3 className="text-xs uppercase tracking-widest text-[#9D50BB] font-black">Patrocinador 2</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#A1A1AA] font-bold">Nome da Empresa</label>
                    <input
                      type="text"
                      required
                      value={sponsor2Name}
                      onChange={(e) => setSponsor2Name(e.target.value)}
                      placeholder="Ex: Heineken"
                      className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#A1A1AA] font-bold">URL do Logo</label>
                    <input
                      type="text"
                      required
                      value={sponsor2Logo}
                      onChange={(e) => setSponsor2Logo(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#A1A1AA] font-bold">Descrição do Prêmio</label>
                    <input
                      type="text"
                      required
                      value={sponsor2Prize}
                      onChange={(e) => setSponsor2Prize(e.target.value)}
                      placeholder="Ex: um lindo boné exclusivo"
                      className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition"
                    />
                  </div>
                </div>

                {/* CS Music e Artista */}
                <div className="space-y-4 p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl md:col-span-2">
                  <h3 className="text-xs uppercase tracking-widest text-[#E4E4E7] font-black">Prêmios Especiais</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#A1A1AA] font-bold">Prêmio do CS Music</label>
                      <input
                        type="text"
                        required
                        value={csEstudioPrize}
                        onChange={(e) => setCsEstudioPrize(e.target.value)}
                        placeholder="Ex: Fone bluetooth do CS Music"
                        className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#A1A1AA] font-bold">Prêmio do Artista Votado</label>
                      <input
                        type="text"
                        required
                        value={artistPrize}
                        onChange={(e) => setArtistPrize(e.target.value)}
                        placeholder="Ex: Fone bluetooth do CS Music"
                        className="w-full px-3 py-1.5 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-lg text-xs text-white placeholder-[#71717A] transition"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingRoulette}
                  className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-xs font-extrabold text-black shadow-lg shadow-[#00E5FF]/10 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingRoulette ? 'Salvando...' : 'Salvar Configurações da Roleta'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TABS: CS DO BEM SOCIAL PROJECT --- */}
        {activeTab === 'csdobem' && (
          <div className="space-y-6">
            <div className="bg-neutral-900/30 p-4 rounded-2xl border border-[#1F1F22]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#F4F4F5] flex items-center gap-2 tracking-tight">
                  <Heart className="w-5 h-5 text-emerald-400 fill-emerald-500/10 animate-pulse" />
                  Gerenciador do Projeto Social - CS do Bem
                </h2>
                <p className="text-xs text-[#71717A] font-semibold">
                  A transparência é o maior patrimônio. Controle a arrecadação, destinação de recursos e o feed de ações sociais.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddAction}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs font-black text-white flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova Ação Social
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* GLOBAL METRICS & NETWORKS (LEFT) */}
              <div className="lg:col-span-5 bg-[#18181B] border border-[#1F1F22] rounded-xl p-6 space-y-5 shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" /> Métricas e Redes
                </h3>

                <form onSubmit={handleSaveCsDoBemStats} className="space-y-4">
                  {/* Total Raised Input */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-[#A1A1AA] font-bold block uppercase tracking-wider">Total Arrecadado (R$)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-[#71717A] text-xs font-mono font-bold">R$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={adminTotalRaised}
                        onChange={(e) => setAdminTotalRaised(Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 bg-[#131315] border border-[#27272A] focus:border-emerald-500 focus:outline-none rounded-xl text-xs font-semibold text-white font-mono transition"
                      />
                    </div>
                    
                    {/* Auto aggregate button */}
                    {autoTotalPaidLicensing > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdminTotalRaised(autoTotalPaidLicensing)}
                        className="mt-1 text-[10px] font-black uppercase text-[#00E5FF] hover:text-[#00E5FF]/80 transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Sincronizar com Licenças Pagas (R$ {autoTotalPaidLicensing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </button>
                    )}
                  </div>

                  {/* Instagram URL */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-[#A1A1AA] font-bold block uppercase tracking-wider">Instagram (Vídeos do Projeto)</label>
                    <input
                      type="url"
                      required
                      value={adminInstagramUrl}
                      onChange={(e) => setAdminInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/seu-perfil"
                      className="w-full px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-xl text-xs text-white placeholder-[#71717A] transition"
                    />
                  </div>

                  {/* YouTube URL */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-[#A1A1AA] font-bold block uppercase tracking-wider">YouTube (Vídeos de Entregas)</label>
                    <input
                      type="url"
                      required
                      value={adminYoutubeUrl}
                      onChange={(e) => setAdminYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/seu-canal"
                      className="w-full px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-xl text-xs text-white placeholder-[#71717A] transition"
                    />
                  </div>

                  {/* TikTok URL */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-[#A1A1AA] font-bold block uppercase tracking-wider">TikTok (Bastidores)</label>
                    <input
                      type="url"
                      required
                      value={adminTiktokUrl}
                      onChange={(e) => setAdminTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@seu-usuario"
                      className="w-full px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-[#00E5FF] focus:outline-none rounded-xl text-xs text-white placeholder-[#71717A] transition"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingCsDoBemStats}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-black text-white shadow-lg active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSavingCsDoBemStats ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                        </>
                      ) : (
                        'Salvar Métricas & Redes'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* ACTIONS LIST (RIGHT) */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Ações Cadastradas ({csDoBemActions.length})
                </h3>

                {csDoBemActions.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-[#18181B] border border-[#1F1F22] text-[#71717A] text-xs font-semibold">
                    Nenhuma ação cadastrada. Use o botão "Nova Ação Social" acima para criar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {csDoBemActions.map((act) => (
                      <div 
                        key={act.id}
                        className="p-4 bg-[#18181B] border border-[#1F1F22] rounded-xl flex items-start justify-between gap-4 shadow-md hover:border-neutral-700 transition"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold font-mono text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20 px-1.5 py-0.5 rounded">
                              {act.date}
                            </span>
                            <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.5 rounded">
                              R$ {act.amountSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-white truncate max-w-md">{act.title}</h4>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 max-w-md font-semibold leading-relaxed">{act.description}</p>
                          {act.photos && act.photos.length > 0 && (
                            <div className="text-[9px] text-[#A1A1AA] font-bold flex items-center gap-1 font-mono">
                              <ImageIcon className="w-3 h-3 text-emerald-500" /> {act.photos.length} fotos anexadas
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAction(act)}
                            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-[#00E5FF] active:scale-90 transition cursor-pointer"
                            title="Editar Ação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(act.id)}
                            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-red-500 active:scale-90 transition cursor-pointer"
                            title="Excluir Ação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- FORM OVERLAY MODAL FOR SOCIAL ACTIONS (ADD / EDIT) --- */}
        <AnimatePresence>
          {showActionForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-xl bg-[#18181B] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto text-left"
              >
                <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-emerald-400 fill-emerald-500/10" />
                    {editingAction ? 'Editar Ação Social' : 'Nova Ação Social'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionForm(false);
                      setEditingAction(null);
                    }}
                    className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveAction} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Title */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Título da Ação</label>
                      <input
                        type="text"
                        required
                        value={actionTitle}
                        onChange={(e) => setActionTitle(e.target.value)}
                        placeholder="Ex: Entrega de Cobertores de Inverno"
                        className="w-full px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-emerald-500 focus:outline-none rounded-xl text-xs text-white font-semibold placeholder-[#71717A] transition"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Data da Ação</label>
                      <input
                        type="text"
                        required
                        value={actionDate}
                        onChange={(e) => setActionDate(e.target.value)}
                        placeholder="Ex: 12/07/2026"
                        className="w-full px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-emerald-500 focus:outline-none rounded-xl text-xs text-white font-semibold font-mono placeholder-[#71717A] transition"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Descrição Detalhada</label>
                    <textarea
                      required
                      rows={3}
                      value={actionDescription}
                      onChange={(e) => setActionDescription(e.target.value)}
                      placeholder="Descreva a ação que foi realizada, como as pessoas receberam, os sentimentos, etc. (Sem citar marmitas ou cobertores se preferir um tom natural)"
                      className="w-full px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-emerald-500 focus:outline-none rounded-xl text-xs text-white placeholder-[#71717A] transition leading-relaxed resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Amount Spent */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Recursos Destinados (R$)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-[#71717A] text-xs font-mono font-bold">R$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={actionAmountSpent}
                          onChange={(e) => setActionAmountSpent(Number(e.target.value))}
                          className="w-full pl-9 pr-3 py-2 bg-[#131315] border border-[#27272A] focus:border-emerald-500 focus:outline-none rounded-xl text-xs font-semibold text-white font-mono transition"
                        />
                      </div>
                    </div>

                    {/* Video URL (Optional) */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Link do Vídeo (Instagram, TikTok, YouTube)</label>
                      <input
                        type="url"
                        value={actionVideoUrl}
                        onChange={(e) => setActionVideoUrl(e.target.value)}
                        placeholder="Ex: https://instagram.com/reel/xyz"
                        className="w-full px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-emerald-500 focus:outline-none rounded-xl text-xs text-white font-semibold placeholder-[#71717A] transition"
                      />
                    </div>
                  </div>

                  {/* Photos Addition */}
                  <div className="space-y-2.5 text-left border-t border-[#27272A] pt-3">
                    <label className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Fotos da Ação (URLs de imagens)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newPhotoUrl}
                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                        placeholder="Cole a URL da foto (Ex: link do Unsplash ou do drive público)"
                        className="flex-1 px-3 py-2 bg-[#131315] border border-[#27272A] focus:border-emerald-500 focus:outline-none rounded-xl text-xs text-white placeholder-[#71717A] transition"
                      />
                      <button
                        type="button"
                        onClick={handleAddPhotoUrl}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-xs font-bold text-white transition cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>

                    {/* Photo Previews */}
                    {actionPhotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-1.5">
                        {actionPhotos.map((photo, idx) => (
                          <div key={idx} className="aspect-square relative rounded-lg overflow-hidden bg-neutral-950 border border-[#27272A]">
                            <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhotoUrl(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/75 hover:bg-red-600 text-white transition cursor-pointer"
                              title="Remover foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submission Row */}
                  <div className="flex justify-end gap-2 border-t border-[#27272A] pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionForm(false);
                        setEditingAction(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition active:scale-95 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAction}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-black text-white shadow-lg active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingAction ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                        </>
                      ) : (
                        'Salvar Ação Social'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
                    Você está prestes a remover <strong className="text-white italic">"{songToDelete.name}"</strong> do catálogo do CS Music definitivamente.
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

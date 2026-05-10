'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as db from '@/lib/db';
import { Tournament, Match, Player, getSingleMatchWinner, getDoubleElimWinner, getBo3Winner } from '@/lib/db';
import { ThemeToggle } from '@/components/ThemeProvider';
import { generateBracket } from '@/lib/bracket';
import { v4 as uuidv4 } from 'uuid';
import { Trophy, Trash2, Check, History, AlertTriangle, RotateCcw, Upload, ImageIcon, X, Video } from 'lucide-react';
import { supabase, resetAllData } from '@/lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'tournament' | 'results' | 'players' | 'finish' | 'history' | 'danger'>('general');

  useEffect(() => {
    const key = searchParams.get('key');
    if (key === 'cup2025') setAuthorized(true);
    else router.push('/');
  }, [searchParams, router]);

  if (!authorized) return null;

  return (
    <div className="min-h-screen max-w-2xl mx-auto p-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--gold)' }}>Admin Panel</h1>
        <ThemeToggle />
      </div>

      <div className="flex flex-wrap gap-2 mb-8 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {[
          { id: 'general', label: 'Settings' },
          { id: 'tournament', label: 'Configure' },
          { id: 'results', label: 'Results' },
          { id: 'players', label: 'Players' },
          { id: 'finish', label: 'Finish' },
          { id: 'history', label: 'History' },
          { id: 'danger', label: '⚠️ Reset' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="px-4 py-2 rounded transition-colors font-semibold"
            style={{
              backgroundColor: activeTab === tab.id ? (tab.id === 'danger' ? '#dc2626' : 'var(--gold)') : 'var(--bg-card)',
              color: activeTab === tab.id ? (tab.id === 'danger' ? 'white' : 'var(--bg-primary)') : 'var(--text-primary)',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'tournament' && <TournamentSetup />}
        {activeTab === 'results' && <ResultsEntry />}
        {activeTab === 'players' && <PlayersManagement />}
        {activeTab === 'finish' && <FinishTournament />}
        {activeTab === 'history' && <HistoryManagement />}
        {activeTab === 'danger' && <DangerZone />}
      </div>
    </div>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────
function DangerZone() {
  const [resetting, setResetting] = useState(false);
  const [deletingTournament, setDeletingTournament] = useState(false);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.loadActiveTournament().then(t => {
      setActiveTournament(t);
      setLoading(false);
    });
  }, []);

  const handleForceDeleteTournament = async () => {
    if (!activeTournament) return;
    if (!confirm(`⚠️ Supprimer définitivement le tournoi "${activeTournament.name}" sans archiver ? Cette action est irréversible.`)) return;
    setDeletingTournament(true);
    try {
      await db.forceDeleteActiveTournament();
      setActiveTournament(null);
      alert('Tournoi supprimé avec succès.');
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err as any).message);
    } finally {
      setDeletingTournament(false);
    }
  };

  const handleNuclearReset = async () => {
    const confirm1 = confirm('⚠️ ATTENTION : Cette action va supprimer TOUTES les données. Continuer ?');
    if (!confirm1) return;
    const confirm2 = confirm('🔴 DERNIÈRE CHANCE : Êtes-vous absolument sûr ?');
    if (!confirm2) return;

    setResetting(true);
    try {
      await resetAllData();
      alert('✅ Toutes les données ont été supprimées.');
      window.location.reload();
    } catch (err) {
      alert('Erreur lors du reset : ' + (err as any).message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '2px solid #dc2626' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} color="#dc2626" />
          <h3 className="font-bold text-lg" style={{ color: '#dc2626' }}>Supprimer le tournoi actif</h3>
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
        ) : activeTournament ? (
          <>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="font-semibold" style={{ color: 'var(--gold)' }}>{activeTournament.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {activeTournament.format} · {activeTournament.size} joueurs
              </p>
            </div>
            <button onClick={handleForceDeleteTournament} disabled={deletingTournament}
              className="w-full font-bold py-3 rounded flex items-center justify-center gap-2"
              style={{ backgroundColor: '#dc2626', color: 'white', cursor: deletingTournament ? 'not-allowed' : 'pointer' }}>
              <Trash2 size={18} />
              {deletingTournament ? 'Suppression...' : 'Supprimer le tournoi actif'}
            </button>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Aucun tournoi actif.</p>
        )}
      </div>

      <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '2px solid #7f1d1d' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} color="#ef4444" />
          <h3 className="font-bold text-lg" style={{ color: '#ef4444' }}>Reset complet</h3>
        </div>
        <button onClick={handleNuclearReset} disabled={resetting}
          className="w-full font-bold py-3 rounded flex items-center justify-center gap-2"
          style={{ backgroundColor: '#7f1d1d', color: 'white', cursor: resetting ? 'not-allowed' : 'pointer', border: '1px solid #ef4444' }}>
          <AlertTriangle size={18} />
          {resetting ? 'Suppression...' : '🔴 TOUT SUPPRIMER'}
        </button>
      </div>
    </div>
  );
}

// ─── General Settings ─────────────────────────────────────────────────────────
// Vidéo : upload local (base64, max 50MB) OU lien URL/YouTube
// Pas de bucket Supabase Storage — tout passe par Supabase settings (base64)
// L'ancienne vidéo/image est remplacée automatiquement à la sauvegarde
// Aucune image par défaut — fond noir pur si rien n'est défini

function GeneralSettings() {
  const [whatsappLink, setWhatsappLink] = useState('');

  // Image
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInputType, setVideoInputType] = useState<'url' | 'upload'>('url');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoFileName, setVideoFileName] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      db.loadWhatsappLink(),
      db.loadBackgroundImage(),
      db.loadBackgroundVideo(),
    ]).then(([link, img, vid]) => {
      setWhatsappLink(link || '');
      setImageUrl(img || '');
      setImagePreview(img || '');
      setVideoUrl(vid || '');
      if (vid && !vid.startsWith('http') && !vid.startsWith('data:')) {
        // URL externe déjà sauvegardée
      }
      if (vid && vid.startsWith('data:video')) {
        setVideoFileName('Vidéo locale chargée');
        setVideoInputType('upload');
      }
      setLoadingData(false);
    });
  }, []);

  // ── Image upload via base64 ──────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (JPG, PNG, WebP...)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image trop lourde. Maximum 5MB.');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b = ev.target?.result as string;
        setImageUrl(b);
        setImagePreview(b);
        setUploading(false);
      };
      reader.onerror = () => {
        alert('Erreur lors de la lecture du fichier.');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Video upload via base64 — jusqu'à 50MB ───────────────────────────────────
 const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('video/')) {
    alert(`❌ Ce fichier n'est pas une vidéo.`);
    if (videoInputRef.current) videoInputRef.current.value = '';
    return;
  }

  const maxMB = 50;
  if (file.size > maxMB * 1024 * 1024) {
    alert(`❌ Vidéo trop lourde (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum : ${maxMB}MB.`);
    if (videoInputRef.current) videoInputRef.current.value = '';
    return;
  }

  setVideoUploading(true);
  setVideoProgress(0);
  setVideoFileName(file.name);

  try {
    // Nom unique pour éviter les collisions
    const fileName = `home-video-${Date.now()}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        // Supabase Storage ne supporte pas onUploadProgress directement
        // mais on peut simuler avec un état intermédiaire
      });

    if (error) throw error;

    // Récupère l'URL publique
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);
    console.log('URL publique obtenue:', urlData.publicUrl);
    setVideoUrl(urlData.publicUrl);
    setVideoProgress(100);
  } catch (err: any) {
    alert('Erreur upload : ' + err?.message);
    setVideoFileName('');
  } finally {
    setVideoUploading(false);
    if (videoInputRef.current) videoInputRef.current.value = '';
  }
};

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setLoading(true);
    console.log('videoUrl au moment de save:', videoUrl.slice(0, 100)); // <-- ajoute ça

    try {
      await Promise.all([
        db.saveWhatsappLink(whatsappLink),
        db.saveBackgroundImage(imageUrl || ''),
        db.saveBackgroundVideo(videoUrl || ''),
      ]);
      alert('✅ Paramètres sauvegardés !');
    } catch {
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Chargement...</div>;

  const isBase64Video = videoUrl.startsWith('data:video');
  const isYouTubeVideo = /youtube\.com|youtu\.be/.test(videoUrl);
  const isExternalVideo = videoUrl.startsWith('http') && !isYouTubeVideo;
  const isSupabaseVideo = videoUrl.includes('supabase') && videoUrl.startsWith('http');

  return (
    <div className="space-y-6">

      {/* ── WhatsApp ────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: 'var(--gold)' }}>WhatsApp</h3>
        <input type="text" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          className="w-full rounded px-3 py-2"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
      </div>

      {/* ── Image d'accueil ─────────────────────────────────────────────────── */}
      <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: 'var(--gold)' }}>🖼️ Image d'accueil</h3>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Optionnel — fond noir si vide. La vidéo a priorité sur l'image.
        </p>

        {/* Preview */}
        <div className="relative w-full rounded-lg overflow-hidden flex items-center justify-center"
          style={{ height: 140, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImagePreview('')} />
              <div className="absolute inset-0 bg-black/30" />
              <span className="relative text-xs font-semibold px-2 py-1 rounded"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}>Aperçu</span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <ImageIcon size={28} />
              <span className="text-xs">Aucune image — fond noir</span>
            </div>
          )}
        </div>

        {/* Upload image */}
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="bg-upload" />
          <label htmlFor="bg-upload"
            className="flex items-center justify-center gap-2 w-full py-3 rounded font-semibold"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '2px dashed var(--border-color)',
              color: 'var(--text-primary)',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}>
            <Upload size={16} />
            {uploading ? 'Chargement...' : 'Choisir une image (max 5MB)'}
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>OU URL</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
        </div>

        <div className="flex gap-2">
          <input type="text"
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }}
            placeholder="https://exemple.com/image.jpg"
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          {imageUrl && (
            <button onClick={() => { setImageUrl(''); setImagePreview(''); }}
              className="px-3 rounded" style={{ backgroundColor: '#dc2626', color: 'white' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Vidéo d'accueil ─────────────────────────────────────────────────── */}
      <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: 'var(--gold)' }}>🎬 Vidéo d'accueil</h3>
          {videoUrl && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold"
              style={{ backgroundColor: 'rgba(22,163,74,0.15)', color: '#16a34a', border: '1px solid #16a34a' }}>
              ✓ Active
            </span>
          )}
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Autoplay · muette · en boucle · sans contrôles. Priorité sur l'image.
        </p>

        {/* Aperçu vidéo locale */}
        {videoUrl && isBase64Video && (
          <div className="relative rounded-lg overflow-hidden" style={{ height: 130, backgroundColor: '#000' }}>
            <video
              src={videoUrl}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.85 }}
            />
            <div className="absolute bottom-2 left-2">
              <span className="text-xs px-2 py-1 rounded font-semibold"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                📁 Fichier local
              </span>
            </div>
          </div>
        )}

        {/* Aperçu YouTube */}
        {videoUrl && isYouTubeVideo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span style={{ color: '#ef4444' }}>▶</span>
            <span className="text-xs font-semibold truncate" style={{ color: '#ef4444' }}>YouTube actif : {videoUrl.slice(0, 50)}...</span>
          </div>
        )}

        {/* Aperçu lien externe */}
        {videoUrl && isExternalVideo && (
          <div className="relative rounded-lg overflow-hidden" style={{ height: 130, backgroundColor: '#000' }}>
            <video
              src={videoUrl}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.85 }}
            />
            <div className="absolute bottom-2 left-2">
              <span className="text-xs px-2 py-1 rounded font-semibold"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                🔗 URL externe
              </span>
            </div>
          </div>
        )}

        {/* Toggle URL / Upload */}
        <div className="flex gap-2">
          {(['url', 'upload'] as const).map((t) => (
            <button key={t} onClick={() => setVideoInputType(t)}
              className="flex-1 py-2 rounded text-sm font-semibold transition-colors"
              style={{
                backgroundColor: videoInputType === t ? 'var(--gold)' : 'var(--bg-secondary)',
                color: videoInputType === t ? 'var(--bg-primary)' : 'var(--text-primary)',
              }}>
              {t === 'url' ? '🔗 URL / YouTube' : '⬆️ Fichier local'}
            </button>
          ))}
        </div>

        {/* URL input */}
        {videoInputType === 'url' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input type="text"
                value={isBase64Video ? '' : videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setVideoFileName(''); }}
                placeholder="YouTube, lien MP4/WebM direct..."
                className="flex-1 rounded px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              {videoUrl && (
                <button onClick={() => { setVideoUrl(''); setVideoFileName(''); }}
                  className="px-3 rounded" style={{ backgroundColor: '#dc2626', color: 'white' }}>
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              ✅ YouTube shorts/vidéo · ✅ Lien MP4/WebM direct
            </p>
          </div>
        )}

        {/* Upload local */}
        {videoInputType === 'upload' && (
          <div className="space-y-3">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/*"
              onChange={handleVideoUpload}
              className="hidden"
              id="video-upload"
              disabled={videoUploading}
            />
            <label
              htmlFor="video-upload"
              className="flex items-center justify-center gap-2 w-full py-4 rounded font-semibold"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '2px dashed var(--border-color)',
                color: videoUploading ? 'var(--text-secondary)' : 'var(--text-primary)',
                cursor: videoUploading ? 'not-allowed' : 'pointer',
              }}>
              <Video size={18} />
              {videoUploading
                ? `Chargement... ${videoProgress}%`
                : videoFileName && (isBase64Video || isSupabaseVideo)
                  ? `✓ ${videoFileName}`
                  : 'Choisir une vidéo (MP4 / WebM — max 50MB)'}
            </label>

            {/* Barre de progression */}
            {videoUploading && (
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${videoProgress}%`, backgroundColor: 'var(--gold)' }}
                />
              </div>
            )}

            {/* Vidéo chargée */}
            {videoUrl && (isBase64Video || isSupabaseVideo) && !videoUploading && (              <div className="flex items-center justify-between px-3 py-2 rounded"
                style={{ backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)' }}>
                <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                  ✓ {videoFileName || 'Vidéo chargée'}
                </p>
                <button
                  onClick={() => { setVideoUrl(''); setVideoFileName(''); }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: '#dc2626', color: 'white' }}>
                  Supprimer
                </button>
              </div>
            )}

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              La vidéo est stockée directement — aucun bucket requis.
              <br />
              <span style={{ color: 'var(--gold)' }}>
                ⚠️ Pour des vidéos lourdes (+20MB), le chargement peut prendre quelques secondes.
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Save ────────────────────────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={loading || uploading || videoUploading}
        className="w-full font-bold py-3 rounded transition-colors"
        style={{
          backgroundColor: loading || uploading || videoUploading ? 'var(--text-secondary)' : 'var(--gold)',
          color: 'var(--bg-primary)',
          cursor: loading || uploading || videoUploading ? 'not-allowed' : 'pointer',
        }}>
        {loading ? 'Sauvegarde...' : '💾 Sauvegarder les paramètres'}
      </button>
    </div>
  );
}

// ─── Tournament Setup ─────────────────────────────────────────────────────────
function TournamentSetup() {
  const [tournamentName, setTournamentName] = useState('');
  const [size, setSize] = useState<8 | 16 | 32 | 64 | 128 | 256>(8);
  const [format, setFormat] = useState<'Single Elimination' | 'Double Elimination' | 'Best of 3'>('Single Elimination');
  const [players, setPlayers] = useState<string[]>(Array(8).fill(''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    db.loadTournamentName().then((n) => setTournamentName(n || ''));
  }, []);

  const handleSizeChange = (newSize: 8 | 16 | 32 | 64 | 128 | 256) => {
    setSize(newSize);
    setPlayers(Array(newSize).fill(''));
  };

  const handleGenerateBracket = async () => {
    const filledPlayers = players.filter((p) => p.trim());
    if (filledPlayers.length === 0) { alert('Enter at least one player'); return; }
    setLoading(true);
    try {
      const bracket = generateBracket(players.map((p) => p || 'TBD'), size, format);
      const tournament: Tournament = {
        id: uuidv4(),
        name: tournamentName || `Tournament ${size} players`,
        size,
        format,
        bracket,
        is_active: true,
      };
      await db.createNewTournament(tournament);
      await db.saveTournamentName(tournamentName);
      alert('Bracket generated successfully!');
    } catch (error) {
      console.error(error);
      alert('Error generating bracket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">Tournament Name</label>
        <input type="text" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)}
          placeholder="e.g., Spring Championship"
          className="w-full rounded px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-3">Tournament Size</label>
        <div className="grid grid-cols-3 gap-2">
          {([8, 16, 32, 64, 128, 256] as const).map((s) => (
            <button key={s} onClick={() => handleSizeChange(s)}
              className="py-2 rounded transition-colors font-semibold"
              style={{ backgroundColor: size === s ? 'var(--gold)' : 'var(--bg-secondary)', color: size === s ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-3">Format</label>
        <div className="space-y-2">
          {(['Single Elimination', 'Double Elimination', 'Best of 3'] as const).map((f) => (
            <label key={f} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="w-4 h-4" />
              <span className="text-sm">
                {f === 'Single Elimination' && '🏆 Single Elimination — le gagnant avance'}
                {f === 'Double Elimination' && '🔄 Double Elimination — aller + retour (barrage si agrégat égal)'}
                {f === 'Best of 3' && '3️⃣ Best of 3 — gagne 2/3 matchs pour passer'}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-3">Player Names</label>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {players.map((player, i) => (
            <input key={i} type="text" value={player}
              onChange={(e) => { const p = [...players]; p[i] = e.target.value; setPlayers(p); }}
              placeholder={`Player ${i + 1}`}
              className="w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          ))}
        </div>
      </div>
      <button onClick={handleGenerateBracket} disabled={loading}
        className="w-full font-bold py-2 rounded transition-colors"
        style={{ backgroundColor: loading ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Generating...' : 'Generate Bracket'}
      </button>
    </div>
  );
}

// ─── Results Entry ────────────────────────────────────────────────────────────
function ResultsEntry() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.loadActiveTournament().then((t) => { setTournament(t); setLoading(false); });
  }, []);

  const updateMatch = (matchId: string, updates: Partial<Match>) => {
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        bracket: prev.bracket.map(m => m.id === matchId ? { ...m, ...updates } : m),
      };
    });
  };

  const updateMatches = (updatesMap: Record<string, Partial<Match>>) => {
    if (!tournament) return;
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        bracket: prev.bracket.map(m => updatesMap[m.id] ? { ...m, ...updatesMap[m.id] } : m),
      };
    });
  };

  const handleSave = async () => {
    if (!tournament) return;
    setSaving(true);
    try {
      await db.updateCurrentTournament(tournament);
      alert('Results saved!');
    } catch {
      alert('Error saving results');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading tournament...</div>;
  if (!tournament) return (
    <div className="text-center py-8 space-y-4">
      <p style={{ color: 'var(--text-secondary)' }}>No active tournament. Generate a bracket first.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <p className="font-semibold" style={{ color: 'var(--gold)' }}>{tournament.name}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tournament.format} • {tournament.size} players</p>
      </div>

      {tournament.format === 'Double Elimination' && (
        <DoubleElimResults tournament={tournament} updateMatch={updateMatch} updateMatches={updateMatches} />
      )}
      {tournament.format === 'Best of 3' && (
        <BestOf3Results tournament={tournament} updateMatch={updateMatch} updateMatches={updateMatches} />
      )}
      {tournament.format === 'Single Elimination' && (
        <SingleElimResults tournament={tournament} updateMatch={updateMatch} updateMatches={updateMatches} />
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full font-bold py-3 rounded transition-colors sticky bottom-4"
        style={{ backgroundColor: saving ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : 'Save All Results'}
      </button>
    </div>
  );
}

// ─── Stream Link Input ────────────────────────────────────────────────────────
function StreamLinkInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs flex-shrink-0" style={{ color: '#ef4444' }}>🔴</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Stream link (optionnel)"
        className="flex-1 rounded px-2 py-1 text-xs"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: `1px solid ${value ? '#ef4444' : 'var(--border-color)'}`,
          color: 'var(--text-primary)',
        }}
      />
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-xs px-2 py-1 rounded flex-shrink-0 font-bold"
          style={{ backgroundColor: '#ef4444', color: 'white', textDecoration: 'none' }}>
          ▶
        </a>
      )}
    </div>
  );
}

// ─── Compact Score Row ────────────────────────────────────────────────────────
function ScoreRow({ label, match, onUpdate, onToggleComplete, onUndo, disabled, allowDraw }: {
  label: string;
  match: Match;
  onUpdate: (updates: Partial<Match>) => void;
  onToggleComplete: () => void;
  onUndo?: () => void;
  disabled?: boolean;
  allowDraw?: boolean;
}) {
  const isDraw = match.scoreA[0] === match.scoreB[0] && (match.scoreA[0] > 0 || match.scoreB[0] > 0);
  const showDrawWarning = !allowDraw && !match.completed && isDraw;

  return (
    <div className="space-y-1" style={{ opacity: disabled ? 0.5 : 1 }}>
      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--gold)' }}>{label}</div>
      <div className="flex items-center gap-2 px-3 py-2 rounded"
        style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid ${match.completed ? '#16a34a' : 'var(--border-color)'}` }}>
        <span className="flex-1 text-sm truncate font-medium">{match.playerA || 'TBD'}</span>
        <input type="number" min={0}
          value={match.scoreA[0] === 0 && !match.completed ? '' : match.scoreA[0]}
          placeholder="0" disabled={disabled || match.completed}
          onChange={(e) => onUpdate({ scoreA: [Math.max(0, parseInt(e.target.value) || 0)] })}
          className="w-11 rounded px-1 py-1 text-center font-bold text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--gold)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>-</span>
        <input type="number" min={0}
          value={match.scoreB[0] === 0 && !match.completed ? '' : match.scoreB[0]}
          placeholder="0" disabled={disabled || match.completed}
          onChange={(e) => onUpdate({ scoreB: [Math.max(0, parseInt(e.target.value) || 0)] })}
          className="w-11 rounded px-1 py-1 text-center font-bold text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--gold)' }} />
        <span className="flex-1 text-sm truncate font-medium text-right">{match.playerB || 'TBD'}</span>
        {!disabled && (
          <>
            {match.completed && onUndo ? (
              <button
                onClick={onUndo}
                className="px-2 py-1 rounded text-xs font-semibold flex-shrink-0 transition-colors flex items-center gap-1"
                style={{
                  backgroundColor: '#92400e',
                  color: '#fbbf24',
                  border: '1px solid #b45309',
                  minWidth: 68,
                }}>
                <RotateCcw size={11} />
                Modifier
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!match.completed && !allowDraw && isDraw) {
                    alert('Un match ne peut pas se terminer sur un score nul. Entrez un gagnant clair.');
                    return;
                  }
                  if (!match.completed && match.scoreA[0] === 0 && match.scoreB[0] === 0 && !allowDraw) {
                    alert('Entrez un score avant de marquer terminé.');
                    return;
                  }
                  onToggleComplete();
                }}
                className="px-2 py-1 rounded text-xs font-semibold flex-shrink-0 transition-colors"
                style={{
                  backgroundColor: match.completed ? '#16a34a' : 'var(--bg-primary)',
                  color: match.completed ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${match.completed ? '#16a34a' : 'var(--border-color)'}`,
                  minWidth: 68,
                }}>
                {match.completed ? '✓ Fait' : 'Terminer'}
              </button>
            )}
          </>
        )}
      </div>
      {showDrawWarning && (
        <div className="text-xs" style={{ color: '#ef4444' }}>⚠️ Égalité non autorisée — un gagnant est obligatoire</div>
      )}
      {disabled && (
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>⏳ Terminez d'abord le match précédent</div>
      )}
    </div>
  );
}

// ─── Single Elimination Results ───────────────────────────────────────────────
function SingleElimResults({ tournament, updateMatch, updateMatches }: { tournament: Tournament; updateMatch: (id: string, u: Partial<Match>) => void; updateMatches: (map: Record<string, Partial<Match>>) => void }) {
  const matchesByRound = tournament.bracket.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);
  const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  const handleToggleComplete = (match: Match) => {
    if (!match.completed && match.scoreA[0] === match.scoreB[0]) {
      alert('Un match ne peut pas se terminer sur un score nul. Entrez un gagnant clair.');
      return;
    }
    if (!match.completed && match.scoreA[0] === 0 && match.scoreB[0] === 0) {
      alert('Entrez un score avant de marquer terminé.');
      return;
    }
    const completing = !match.completed;

    const updates: Record<string, Partial<Match>> = {
      [match.id]: { completed: completing },
    };

    if (match.nextMatchId && completing) {
      const winner = match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
      const nextMatch = tournament!.bracket.find(m => m.id === match.nextMatchId);
      if (nextMatch && winner) {
        const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
        const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
        updates[match.nextMatchId] = { playerA: pA, playerB: pB };
      }
    }

    updateMatches(updates);
  };

  const handleUndo = (match: Match) => {
    if (!confirm('Annuler ce résultat et le modifier ?')) return;

    const updates: Record<string, Partial<Match>> = {
      [match.id]: { completed: false },
    };

    if (match.nextMatchId) {
      const winner = match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
      const nextMatch = tournament!.bracket.find(m => m.id === match.nextMatchId);
      if (nextMatch && winner) {
        const newPA = nextMatch.playerA === winner ? null : nextMatch.playerA;
        const newPB = nextMatch.playerB === winner ? null : nextMatch.playerB;
        updates[match.nextMatchId] = { playerA: newPA, playerB: newPB, completed: false, scoreA: [0], scoreB: [0] };
      }
    }

    updateMatches(updates);
  };

  return (
    <div className="space-y-6">
      {sortedRounds.map((round) => {
        const matches = matchesByRound[round];
        const total = matches.length * 2;
        const roundName = total === 2 ? 'Final' : total === 4 ? 'Semi-Final' : total === 8 ? 'Quarter-Final' : `Round of ${total}`;
        return (
          <div key={round}>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{roundName}</h3>
            <div className="space-y-3">
              {matches.map((match, idx) => (
                <div key={match.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${match.completed ? 'var(--gold)' : 'var(--border-color)'}` }}>
                  <ScoreRow
                    label={`Match ${idx + 1}: ${match.playerA || 'TBD'} vs ${match.playerB || 'TBD'}`}
                    match={match}
                    onUpdate={(updates) => updateMatch(match.id, updates)}
                    onToggleComplete={() => handleToggleComplete(match)}
                    onUndo={match.completed ? () => handleUndo(match) : undefined}
                    allowDraw={false}
                  />
                  <StreamLinkInput
                    value={match.streamLink || ''}
                    onChange={(v) => updateMatch(match.id, { streamLink: v })}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Double Elimination Results ───────────────────────────────────────────────
function DoubleElimResults({
  tournament,
  updateMatch,
  updateMatches,
}: {
  tournament: Tournament;
  updateMatch: (id: string, u: Partial<Match>) => void;
  updateMatches: (map: Record<string, Partial<Match>>) => void;
}) {
  const bracket = tournament.bracket;

  const allerMatches = bracket.filter(m => m.matchType === 'aller').sort((a, b) => a.round - b.round);
  const roundGroups: Match[][] = [];
  let currentRoundNum = -1;
  let currentGroup: Match[] = [];
  allerMatches.forEach(am => {
    if (am.round !== currentRoundNum) {
      if (currentGroup.length > 0) roundGroups.push(currentGroup);
      currentGroup = [am];
      currentRoundNum = am.round;
    } else {
      currentGroup.push(am);
    }
  });
  if (currentGroup.length > 0) roundGroups.push(currentGroup);

  const getRoundName = (groupIndex: number, totalGroups: number) => {
    const fromEnd = totalGroups - groupIndex;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Final';
    if (fromEnd === 3) return 'Quarter-Final';
    return `Round ${groupIndex + 1}`;
  };

  const handleAllerComplete = (allerMatch: Match) => {
    if (allerMatch.completed) {
      if (!confirm('Annuler ce résultat aller ?')) return;
      const retourMatch = bracket.find(m => m.id === allerMatch.retourMatchId);
      const updates: Record<string, Partial<Match>> = {
        [allerMatch.id]: { completed: false },
      };
      if (retourMatch?.completed) {
        updates[retourMatch.id] = { completed: false };
        const barrageMatch = bracket.find(m => m.id === allerMatch.barrageMatchId);
        if (barrageMatch?.completed) {
          updates[barrageMatch.id] = { completed: false, playerA: null, playerB: null, scoreA: [0], scoreB: [0], barrageNeeded: false };
          if (allerMatch.nextMatchId) {
            const winner = barrageMatch.scoreA[0] > barrageMatch.scoreB[0] ? barrageMatch.playerA : barrageMatch.playerB;
            const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
            if (nextMatch && winner) {
              const newPA = nextMatch.playerA === winner ? null : nextMatch.playerA;
              const newPB = nextMatch.playerB === winner ? null : nextMatch.playerB;
              updates[allerMatch.nextMatchId] = { playerA: newPA, playerB: newPB, completed: false, scoreA: [0], scoreB: [0] };
            }
          }
        } else {
          if (allerMatch.nextMatchId) {
            const aggA = allerMatch.scoreA[0] + (retourMatch?.scoreA[0] ?? 0);
            const aggB = allerMatch.scoreB[0] + (retourMatch?.scoreB[0] ?? 0);
            const winner = aggA > aggB ? allerMatch.playerA : aggB > aggA ? allerMatch.playerB : null;
            const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
            if (nextMatch && winner) {
              const newPA = nextMatch.playerA === winner ? null : nextMatch.playerA;
              const newPB = nextMatch.playerB === winner ? null : nextMatch.playerB;
              updates[allerMatch.nextMatchId] = { playerA: newPA, playerB: newPB, completed: false, scoreA: [0], scoreB: [0] };
            }
          }
        }
      }
      updateMatches(updates);
      return;
    }
    updateMatch(allerMatch.id, { completed: true });
  };

  const handleRetourComplete = (allerMatch: Match, retourMatch: Match) => {
    if (!allerMatch.completed) {
      alert("Terminez d'abord le match aller.");
      return;
    }

    if (retourMatch.completed) {
      if (!confirm('Annuler ce résultat retour ?')) return;
      const updates: Record<string, Partial<Match>> = {
        [retourMatch.id]: { completed: false },
      };
      const barrageMatch = bracket.find(m => m.id === allerMatch.barrageMatchId);
      if (barrageMatch?.completed) {
        updates[barrageMatch.id] = { completed: false, playerA: null, playerB: null, scoreA: [0], scoreB: [0], barrageNeeded: false };
      }
      if (barrageMatch?.barrageNeeded) {
        updates[barrageMatch.id] = { ...updates[barrageMatch.id], barrageNeeded: false, playerA: null, playerB: null };
      }
      if (allerMatch.nextMatchId) {
        const aggA = allerMatch.scoreA[0] + retourMatch.scoreA[0];
        const aggB = allerMatch.scoreB[0] + retourMatch.scoreB[0];
        const winner = aggA > aggB ? allerMatch.playerA : aggB > aggA ? allerMatch.playerB : null;
        if (winner) {
          const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
          if (nextMatch) {
            const newPA = nextMatch.playerA === winner ? null : nextMatch.playerA;
            const newPB = nextMatch.playerB === winner ? null : nextMatch.playerB;
            updates[allerMatch.nextMatchId] = { playerA: newPA, playerB: newPB, completed: false, scoreA: [0], scoreB: [0] };
          }
        }
      }
      updateMatches(updates);
      return;
    }

    const updates: Record<string, Partial<Match>> = {
      [retourMatch.id]: { completed: true },
    };

    const aggA = allerMatch.scoreA[0] + retourMatch.scoreA[0];
    const aggB = allerMatch.scoreB[0] + retourMatch.scoreB[0];

    if (aggA === aggB) {
      if (allerMatch.barrageMatchId) {
        updates[allerMatch.barrageMatchId] = {
          playerA: allerMatch.playerA,
          playerB: allerMatch.playerB,
          barrageNeeded: true,
        };
      }
    } else {
      const winner = aggA > aggB ? allerMatch.playerA : allerMatch.playerB;
      if (allerMatch.nextMatchId && winner) {
        const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
        if (nextMatch) {
          const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
          const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
          updates[allerMatch.nextMatchId] = { playerA: pA, playerB: pB };
        }
      }
    }

    updateMatches(updates);
  };

  const handleBarrageComplete = (allerMatch: Match, barrageMatch: Match) => {
    if (barrageMatch.completed) {
      if (!confirm('Annuler le résultat du barrage ?')) return;
      const updates: Record<string, Partial<Match>> = {
        [barrageMatch.id]: { completed: false, scoreA: [0], scoreB: [0] },
      };
      if (allerMatch.nextMatchId) {
        const winner = barrageMatch.scoreA[0] > barrageMatch.scoreB[0] ? barrageMatch.playerA : barrageMatch.playerB;
        const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
        if (nextMatch && winner) {
          const newPA = nextMatch.playerA === winner ? null : nextMatch.playerA;
          const newPB = nextMatch.playerB === winner ? null : nextMatch.playerB;
          updates[allerMatch.nextMatchId] = { playerA: newPA, playerB: newPB, completed: false, scoreA: [0], scoreB: [0] };
        }
      }
      updateMatches(updates);
      return;
    }

    if (barrageMatch.scoreA[0] === barrageMatch.scoreB[0]) {
      alert('Le barrage ne peut pas se terminer sur un score nul.');
      return;
    }
    if (barrageMatch.scoreA[0] === 0 && barrageMatch.scoreB[0] === 0) {
      alert('Entrez un score avant de marquer terminé.');
      return;
    }

    const winner = barrageMatch.scoreA[0] > barrageMatch.scoreB[0] ? barrageMatch.playerA : barrageMatch.playerB;
    const updates: Record<string, Partial<Match>> = {
      [barrageMatch.id]: { completed: true },
    };

    if (allerMatch.nextMatchId && winner) {
      const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
      if (nextMatch) {
        const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
        const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
        updates[allerMatch.nextMatchId] = { playerA: pA, playerB: pB };
      }
    }

    updateMatches(updates);
  };

  return (
    <div className="space-y-8">
      {roundGroups.map((group, groupIdx) => {
        const roundName = getRoundName(groupIdx, roundGroups.length);
        return (
          <div key={groupIdx}>
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{roundName}</h3>
            <div className="space-y-4">
              {group.map((allerMatch, matchIdx) => {
                const retourMatch = bracket.find(m => m.id === allerMatch.retourMatchId);
                const barrageMatch = allerMatch.barrageMatchId ? bracket.find(m => m.id === allerMatch.barrageMatchId) : null;
                const aggA = allerMatch.scoreA[0] + (retourMatch?.scoreA[0] ?? 0);
                const aggB = allerMatch.scoreB[0] + (retourMatch?.scoreB[0] ?? 0);
                const needsBarrage = allerMatch.completed && retourMatch?.completed && aggA === aggB;
                const showBarrage = needsBarrage || barrageMatch?.barrageNeeded || barrageMatch?.completed;
                const { winner: matchWinner } = getDoubleElimWinner(bracket, allerMatch);

                return (
                  <div key={allerMatch.id} className="p-4 rounded-lg space-y-3"
                    style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${matchWinner ? 'var(--gold)' : 'var(--border-color)'}` }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">
                        Match {matchIdx + 1}: <span style={{ color: 'var(--gold)' }}>{allerMatch.playerA || 'TBD'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> vs </span>
                        <span style={{ color: 'var(--gold)' }}>{allerMatch.playerB || 'TBD'}</span>
                      </span>
                      {matchWinner && (
                        <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold)' }}>✓ {matchWinner}</span>
                      )}
                    </div>

                    <ScoreRow label="Aller" match={allerMatch} onUpdate={(u) => updateMatch(allerMatch.id, u)}
                      onToggleComplete={() => handleAllerComplete(allerMatch)}
                      onUndo={allerMatch.completed ? () => handleAllerComplete(allerMatch) : undefined}
                      allowDraw={true} />
                    <StreamLinkInput value={allerMatch.streamLink || ''} onChange={(v) => updateMatch(allerMatch.id, { streamLink: v })} />

                    {retourMatch && (
                      <>
                        <ScoreRow label="Retour" match={retourMatch} onUpdate={(u) => updateMatch(retourMatch.id, u)}
                          onToggleComplete={() => handleRetourComplete(allerMatch, retourMatch)}
                          onUndo={retourMatch.completed ? () => handleRetourComplete(allerMatch, retourMatch) : undefined}
                          disabled={!allerMatch.completed} allowDraw={true} />
                        <StreamLinkInput value={retourMatch.streamLink || ''} onChange={(v) => updateMatch(retourMatch.id, { streamLink: v })} />
                      </>
                    )}

                    {allerMatch.completed && retourMatch?.completed && (
                      <div className="flex justify-between items-center px-3 py-2 rounded text-sm font-bold"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <span style={{ color: aggA > aggB ? 'var(--gold)' : 'var(--text-secondary)' }}>{allerMatch.playerA}: {aggA}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Agrégat</span>
                        <span style={{ color: aggB > aggA ? 'var(--gold)' : 'var(--text-secondary)' }}>{allerMatch.playerB}: {aggB}</span>
                        {needsBarrage && (
                          <span className="text-xs px-2 py-1 rounded ml-2" style={{ backgroundColor: '#dc2626', color: 'white' }}>Barrage!</span>
                        )}
                      </div>
                    )}

                    {showBarrage && barrageMatch && (
                      <>
                        <ScoreRow label={`⚡ Barrage — égalité (${aggA}-${aggB}) — pas de nul`} match={barrageMatch}
                          onUpdate={(u) => updateMatch(barrageMatch.id, u)}
                          onToggleComplete={() => handleBarrageComplete(allerMatch, barrageMatch)}
                          onUndo={barrageMatch.completed ? () => handleBarrageComplete(allerMatch, barrageMatch) : undefined}
                          disabled={!retourMatch?.completed} allowDraw={false} />
                        <StreamLinkInput value={barrageMatch.streamLink || ''} onChange={(v) => updateMatch(barrageMatch.id, { streamLink: v })} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Best of 3 Results ────────────────────────────────────────────────────────
function BestOf3Results({
  tournament,
  updateMatch,
  updateMatches,
}: {
  tournament: Tournament;
  updateMatch: (id: string, u: Partial<Match>) => void;
  updateMatches: (map: Record<string, Partial<Match>>) => void;
}) {
  const bracket = tournament.bracket;
  const match1s = bracket.filter(m => m.matchType === 'bo3_match1').sort((a, b) => a.round - b.round);

  const roundGroups: Match[][] = [];
  let currentRoundNum = -1;
  let currentGroup: Match[] = [];
  match1s.forEach(m => {
    if (m.round !== currentRoundNum) {
      if (currentGroup.length > 0) roundGroups.push(currentGroup);
      currentGroup = [m];
      currentRoundNum = m.round;
    } else {
      currentGroup.push(m);
    }
  });
  if (currentGroup.length > 0) roundGroups.push(currentGroup);

  const getRoundName = (groupIndex: number, totalGroups: number) => {
    const fromEnd = totalGroups - groupIndex;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Final';
    if (fromEnd === 3) return 'Quarter-Final';
    return `Round ${groupIndex + 1}`;
  };

  const propagateWinner = (match1: Match, winner: string, updates: Record<string, Partial<Match>>) => {
    if (!match1.nextMatchId) return;
    const nextMatch = bracket.find(m => m.id === match1.nextMatchId);
    if (!nextMatch) return;
    const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
    const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
    updates[match1.nextMatchId] = { playerA: pA, playerB: pB };
  };

  const unpropagateWinner = (match1: Match, winner: string | null, updates: Record<string, Partial<Match>>) => {
    if (!match1.nextMatchId || !winner) return;
    const nextMatch = bracket.find(m => m.id === match1.nextMatchId);
    if (!nextMatch) return;
    const newPA = nextMatch.playerA === winner ? null : nextMatch.playerA;
    const newPB = nextMatch.playerB === winner ? null : nextMatch.playerB;
    updates[match1.nextMatchId] = { playerA: newPA, playerB: newPB, completed: false, scoreA: [0], scoreB: [0] };
  };

  const handleMatch1Complete = (match1: Match) => {
    if (match1.completed) {
      if (!confirm('Annuler le Match 1 ?')) return;
      const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
      const match3 = bracket.find(m => m.id === match1.bo3Match3Id);
      const updates: Record<string, Partial<Match>> = { [match1.id]: { completed: false } };
      if (match2?.completed) updates[match2.id] = { completed: false, scoreA: [0], scoreB: [0] };
      if (match3?.completed) updates[match3.id] = { completed: false, scoreA: [0], scoreB: [0], playerA: null, playerB: null };
      const { winner } = getBo3Winner(bracket, match1);
      if (winner) unpropagateWinner(match1, winner, updates);
      updateMatches(updates);
      return;
    }
    if (match1.scoreA[0] === match1.scoreB[0]) { alert('Chaque match Bo3 doit avoir un gagnant clair. Pas de match nul.'); return; }
    if (match1.scoreA[0] === 0 && match1.scoreB[0] === 0) { alert('Entrez un score avant de marquer terminé.'); return; }
    const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
    const updates: Record<string, Partial<Match>> = { [match1.id]: { completed: true } };
    if (match2 && (!match2.playerA || !match2.playerB)) updates[match2.id] = { playerA: match1.playerA, playerB: match1.playerB };
    updateMatches(updates);
  };

  const handleMatch2Complete = (match1: Match, match2: Match) => {
    if (!match1.completed) { alert('Terminez d\'abord le match 1.'); return; }
    if (match2.completed) {
      if (!confirm('Annuler le Match 2 ?')) return;
      const match3 = bracket.find(m => m.id === match1.bo3Match3Id);
      const updates: Record<string, Partial<Match>> = { [match2.id]: { completed: false } };
      if (match3?.completed) updates[match3.id] = { completed: false, scoreA: [0], scoreB: [0], playerA: null, playerB: null };
      const { winner } = getBo3Winner(bracket, match1);
      if (winner) unpropagateWinner(match1, winner, updates);
      updateMatches(updates);
      return;
    }
    if (match2.scoreA[0] === match2.scoreB[0]) { alert('Chaque match Bo3 doit avoir un gagnant clair. Pas de match nul.'); return; }
    if (match2.scoreA[0] === 0 && match2.scoreB[0] === 0) { alert('Entrez un score avant de marquer terminé.'); return; }
    const w1 = getSingleMatchWinner(match1);
    const w2 = match2.scoreA[0] > match2.scoreB[0] ? match1.playerA : match1.playerB;
    const updates: Record<string, Partial<Match>> = { [match2.id]: { completed: true } };
    if (w1 && w1 === w2) {
      propagateWinner(match1, w1, updates);
    } else {
      if (match1.bo3Match3Id) updates[match1.bo3Match3Id] = { playerA: match1.playerA, playerB: match1.playerB };
    }
    updateMatches(updates);
  };

  const handleMatch3Complete = (match1: Match, match3: Match) => {
    const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
    if (!match2?.completed) { alert('Terminez d\'abord le match 2.'); return; }
    if (match3.completed) {
      if (!confirm('Annuler le Match 3 ?')) return;
      const updates: Record<string, Partial<Match>> = { [match3.id]: { completed: false } };
      const winner = getSingleMatchWinner(match3);
      if (winner) unpropagateWinner(match1, winner, updates);
      updateMatches(updates);
      return;
    }
    if (match3.scoreA[0] === match3.scoreB[0]) { alert('Le match 3 doit avoir un gagnant clair. Pas de match nul.'); return; }
    if (match3.scoreA[0] === 0 && match3.scoreB[0] === 0) { alert('Entrez un score avant de marquer terminé.'); return; }
    const winner = match3.scoreA[0] > match3.scoreB[0] ? match3.playerA : match3.playerB;
    const updates: Record<string, Partial<Match>> = { [match3.id]: { completed: true } };
    if (winner) propagateWinner(match1, winner, updates);
    updateMatches(updates);
  };

  return (
    <div className="space-y-8">
      {roundGroups.map((group, groupIdx) => {
        const roundName = getRoundName(groupIdx, roundGroups.length);
        return (
          <div key={groupIdx}>
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{roundName}</h3>
            <div className="space-y-4">
              {group.map((match1, matchIdx) => {
                const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
                const match3 = bracket.find(m => m.id === match1.bo3Match3Id);
                const { winner } = getBo3Winner(bracket, match1);
                const w1 = getSingleMatchWinner(match1);
                const w2 = match2 ? getSingleMatchWinner(match2) : null;
                const winsA = [w1, w2].filter(w => w === match1.playerA).length;
                const winsB = [w1, w2].filter(w => w === match1.playerB).length;
                const showMatch3 = (match1.completed && match2?.completed && w1 && w2 && w1 !== w2) || !!(match3?.completed) || !!(match3?.playerA);
                const cardCompleted = !!winner;

                return (
                  <div key={match1.id} className="p-4 rounded-lg space-y-3"
                    style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${cardCompleted ? 'var(--gold)' : 'var(--border-color)'}` }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">
                        Match {matchIdx + 1}: <span style={{ color: 'var(--gold)' }}>{match1.playerA || 'TBD'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> vs </span>
                        <span style={{ color: 'var(--gold)' }}>{match1.playerB || 'TBD'}</span>
                      </span>
                      {winner ? (
                        <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold)' }}>✓ {winner}</span>
                      ) : match1.completed && match2?.completed ? (
                        <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Bo3: {winsA}-{winsB}</span>
                      ) : null}
                    </div>

                    <ScoreRow label="Match 1" match={match1} onUpdate={(u) => updateMatch(match1.id, u)}
                      onToggleComplete={() => handleMatch1Complete(match1)}
                      onUndo={match1.completed ? () => handleMatch1Complete(match1) : undefined} allowDraw={false} />
                    <StreamLinkInput value={match1.streamLink || ''} onChange={(v) => updateMatch(match1.id, { streamLink: v })} />

                    {match2 && (
                      <>
                        <ScoreRow label="Match 2" match={match2} onUpdate={(u) => updateMatch(match2.id, u)}
                          onToggleComplete={() => handleMatch2Complete(match1, match2)}
                          onUndo={match2.completed ? () => handleMatch2Complete(match1, match2) : undefined}
                          disabled={!match1.completed} allowDraw={false} />
                        <StreamLinkInput value={match2.streamLink || ''} onChange={(v) => updateMatch(match2.id, { streamLink: v })} />
                      </>
                    )}

                    {match1.completed && match2?.completed && !winner && w1 && w2 && w1 !== w2 && (
                      <div className="text-xs text-center py-1 px-2 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        1-1 → Match 3 requis!
                      </div>
                    )}

                    {showMatch3 && match3 && (
                      <>
                        <ScoreRow label="⚡ Match 3 — 1-1, départage — pas de nul" match={match3}
                          onUpdate={(u) => updateMatch(match3.id, u)}
                          onToggleComplete={() => handleMatch3Complete(match1, match3)}
                          onUndo={match3.completed ? () => handleMatch3Complete(match1, match3) : undefined}
                          disabled={!match2?.completed} allowDraw={false} />
                        <StreamLinkInput value={match3.streamLink || ''} onChange={(v) => updateMatch(match3.id, { streamLink: v })} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Players Management ───────────────────────────────────────────────────────
function PlayersManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.loadPlayers().then((p) => { setPlayers(p); setLoading(false); });
  }, []);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) { alert('Enter a player name'); return; }
    try {
      const player = await db.createNewPlayer(newPlayerName.trim());
      setPlayers([...players, player]);
      setNewPlayerName('');
    } catch (error) {
      alert((error as any).message || 'Error adding player');
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>) => {
    try {
      await db.updatePlayerStats(playerId, updates);
      setPlayers(players.map((p) => p.id === playerId ? { ...p, ...updates } : p));
    } catch {
      alert('Error updating player');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Delete this player?')) return;
    try {
      await db.deletePlayer(playerId);
      setPlayers(players.filter((p) => p.id !== playerId));
    } catch {
      alert('Error deleting player');
    }
  };

  if (loading) return <div className="text-center py-8">Loading players...</div>;

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">Add New Player</label>
        <div className="flex gap-2">
          <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Player name"
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          <button onClick={handleAddPlayer} className="px-4 py-2 rounded font-semibold"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}>Add</button>
        </div>
      </div>
      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-3 p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{player.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>🏆 {player.trophies} wins · 🥈 {player.second_place} finals</div>
                  <input
                    type="text"
                    value={(player as any).social_link || ''}
                    onChange={(e) => handleUpdatePlayer(player.id, { social_link: e.target.value } as any)}
                    placeholder="TikTok, Instagram, YouTube..."
                    className="mt-1 w-full rounded px-2 py-0.5 text-xs"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
            <input type="number" value={player.trophies}
              onChange={(e) => handleUpdatePlayer(player.id, { trophies: parseInt(e.target.value) || 0 })}
              className="w-14 rounded px-2 py-1 text-sm text-center"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--gold)' }} title="Trophies" />
            <input type="number" value={player.second_place}
              onChange={(e) => handleUpdatePlayer(player.id, { second_place: parseInt(e.target.value) || 0 })}
              className="w-14 rounded px-2 py-1 text-sm text-center"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }} title="Finals" />
            <button onClick={() => handleDeletePlayer(player.id)} className="p-1.5 rounded" style={{ backgroundColor: '#dc2626', color: 'white' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No players yet</p>
        )}
      </div>
    </div>
  );
}

// ─── Finish Tournament ────────────────────────────────────────────────────────
function FinishTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [manualWinner, setManualWinner] = useState('');
  const [manualRunnerUp, setManualRunnerUp] = useState('');

  useEffect(() => {
    db.loadActiveTournament().then((t) => { setTournament(t); setLoading(false); });
  }, []);

  const getMatchProgress = (t: Tournament) => {
    const bracket = t.bracket;
    let required = 0;
    let completed = 0;
    if (t.format === 'Double Elimination') {
      bracket.forEach(m => {
        if (m.matchType === 'aller' || m.matchType === 'retour') { required++; if (m.completed) completed++; }
        else if (m.matchType === 'barrage' && m.completed) { required++; completed++; }
      });
    } else if (t.format === 'Best of 3') {
      bracket.forEach(m => {
        if (m.matchType === 'bo3_match1' || m.matchType === 'bo3_match2') { required++; if (m.completed) completed++; }
        else if (m.matchType === 'bo3_match3' && m.completed) { required++; completed++; }
      });
    } else {
      required = bracket.length;
      completed = bracket.filter(m => m.completed).length;
    }
    return { required, completed };
  };

  const detectedWinner = tournament ? db.detectTournamentWinner(tournament).winner : null;
  const detectedRunnerUp = tournament ? db.detectTournamentWinner(tournament).runnerUp : null;

  const handleFinish = async () => {
    if (!tournament) return;
    const finalWinner = manualWinner.trim() || detectedWinner;
    const finalRunnerUp = manualRunnerUp.trim() || detectedRunnerUp;
    if (!finalWinner) { alert('Aucun gagnant détecté. Entrez le nom du vainqueur manuellement.'); return; }
    if (!confirm(`Terminer le tournoi et déclarer "${finalWinner}" vainqueur ?`)) return;
    setFinishing(true);
    try {
      const updated = { ...tournament, winner: finalWinner };
      await db.updateCurrentTournament(updated);
      await db.finalizeTournament({ ...updated, runner_up: finalRunnerUp || undefined });
      await db.incrementPlayerWins(finalWinner);
      if (finalRunnerUp) await db.incrementPlayerFinals(finalRunnerUp);
      setTournament(null);
      alert(`✅ Tournoi terminé ! Vainqueur : ${finalWinner}`);
    } catch (error) {
      alert('Erreur : ' + (error as any).message);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;
  if (!tournament) return <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Aucun tournoi actif à terminer.</div>;

  const { required, completed } = getMatchProgress(tournament);
  const pct = required > 0 ? Math.round((completed / required) * 100) : 0;
  const allDone = completed >= required;

  return (
    <div className="space-y-5 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <h3 className="font-bold text-lg" style={{ color: 'var(--gold)' }}>{tournament.name}</h3>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{tournament.format} · {tournament.size} joueurs</p>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
          <span>{completed} / {required} matchs joués</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: allDone ? '#16a34a' : 'var(--gold)' }} />
        </div>
      </div>
      {detectedWinner && (
        <div className="p-4 rounded-lg text-center space-y-1" style={{ backgroundColor: 'var(--gold-light)', border: '1px solid var(--gold)' }}>
          <div className="text-2xl">🏆</div>
          <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{detectedWinner}</p>
          {detectedRunnerUp && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>🥈 {detectedRunnerUp}</p>}
        </div>
      )}
      {!detectedWinner && (
        <div className="space-y-3 p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gagnant non détecté automatiquement. Saisissez-le manuellement :</p>
          <div>
            <label className="block text-xs font-semibold mb-1">Vainqueur</label>
            <input type="text" value={manualWinner} onChange={(e) => setManualWinner(e.target.value)} placeholder="Nom du vainqueur"
              className="w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Finaliste (runner-up)</label>
            <input type="text" value={manualRunnerUp} onChange={(e) => setManualRunnerUp(e.target.value)} placeholder="Nom du finaliste"
              className="w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      )}
      <button onClick={handleFinish} disabled={finishing || (!detectedWinner && !manualWinner.trim())}
        className="w-full font-bold py-3 rounded flex items-center justify-center gap-2 text-white transition-colors"
        style={{
          backgroundColor: finishing || (!detectedWinner && !manualWinner.trim()) ? 'var(--text-secondary)' : '#16a34a',
          cursor: finishing || (!detectedWinner && !manualWinner.trim()) ? 'not-allowed' : 'pointer',
        }}>
        {finishing ? '⏳ Finalisation...' : '🏆 Terminer le tournoi'}
      </button>
    </div>
  );
}

// ─── History Management ───────────────────────────────────────────────────────
function HistoryManagement() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('historical_tournaments').select('*').order('created_at', { ascending: false });
    if (!error && data) setTournaments(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from history?`)) return;
    setDeletingId(id);
    try {
      await supabase.from('historical_tournaments').delete().eq('id', id);
      setTournaments(prev => prev.filter(t => t.id !== id));
    } catch {
      alert('Error deleting tournament');
    } finally {
      setDeletingId(null);
    }
  };

  const updateMatchStreamLink = (tournamentId: string, matchId: string, link: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id !== tournamentId) return t;
      return {
        ...t,
        bracket: t.bracket.map((m: any) => m.id === matchId ? { ...m, streamLink: link } : m),
      };
    }));
  };

  const handleSaveStreamLinks = async (tournament: any) => {
    setSavingId(tournament.id);
    try {
      const { error } = await supabase
        .from('historical_tournaments')
        .update({ bracket: tournament.bracket })
        .eq('id', tournament.id);
      if (error) throw error;
      alert('✅ Liens sauvegardés !');
      setEditingId(null);
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="text-center py-8">Loading history...</div>;

  return (
    <div className="space-y-4">
      {tournaments.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>No finished tournaments yet.</div>
      ) : (
        tournaments.map(t => {
          const isEditing = editingId === t.id;
          const matches: any[] = t.bracket || [];

          return (
            <div key={t.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {/* Header */}
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {t.format} · {t.size} players{t.date && ` · ${new Date(t.date).toLocaleDateString()}`}
                  </p>
                  {t.winner && (
                    <div className="flex items-center gap-1 mt-2" style={{ color: 'var(--gold)' }}>
                      <Trophy size={14} />
                      <span className="font-semibold text-sm">{t.winner}</span>
                    </div>
                  )}
                  {t.runner_up && <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>🥈 {t.runner_up}</div>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(isEditing ? null : t.id)}
                    className="px-3 py-1.5 rounded text-xs font-semibold"
                    style={{ backgroundColor: isEditing ? 'var(--bg-secondary)' : 'var(--gold)', color: isEditing ? 'var(--text-primary)' : 'var(--bg-primary)' }}>
                    {isEditing ? 'Fermer' : '🔗 Stream links'}
                  </button>
                  <button onClick={() => handleDelete(t.id, t.name)} disabled={deletingId === t.id}
                    className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: '#dc2626', color: 'white' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Stream links editor */}
              {isEditing && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <p className="text-xs pt-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Modifier les liens de stream pour chaque match :
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {matches
                      .filter((m: any) => !['retour', 'barrage', 'bo3_match2', 'bo3_match3'].includes(m.matchType) || m.matchType === undefined)
                      .map((m: any) => {
                        const label = m.matchType === 'aller'
                          ? `${m.playerA || 'TBD'} vs ${m.playerB || 'TBD'} (Aller)`
                          : m.matchType === 'bo3_match1'
                          ? `${m.playerA || 'TBD'} vs ${m.playerB || 'TBD'} (Bo3)`
                          : `${m.playerA || 'TBD'} vs ${m.playerB || 'TBD'}`;

                        // Pour Double Elim : afficher aussi retour/barrage sous l'aller
                        const subMatches: any[] = [];
                        if (m.matchType === 'aller') {
                          const retour = matches.find((x: any) => x.id === m.retourMatchId);
                          const barrage = matches.find((x: any) => x.id === m.barrageMatchId);
                          if (retour) subMatches.push({ ...retour, subLabel: 'Retour' });
                          if (barrage) subMatches.push({ ...barrage, subLabel: 'Barrage' });
                        }
                        if (m.matchType === 'bo3_match1') {
                          const m2 = matches.find((x: any) => x.id === m.bo3Match2Id);
                          const m3 = matches.find((x: any) => x.id === m.bo3Match3Id);
                          if (m2) subMatches.push({ ...m2, subLabel: 'Match 2' });
                          if (m3) subMatches.push({ ...m3, subLabel: 'Match 3' });
                        }

                        return (
                          <div key={m.id} className="p-2 rounded space-y-1.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{label}</p>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs flex-shrink-0" style={{ color: '#ef4444' }}>🔴</span>
                              <input
                                type="text"
                                value={m.streamLink || ''}
                                onChange={(e) => updateMatchStreamLink(t.id, m.id, e.target.value)}
                                placeholder="https://..."
                                className="flex-1 rounded px-2 py-1 text-xs"
                                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                              />
                            </div>
                            {subMatches.map((sub: any) => (
                              <div key={sub.id} className="flex gap-2 items-center pl-3">
                                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{sub.subLabel}</span>
                                <input
                                  type="text"
                                  value={sub.streamLink || ''}
                                  onChange={(e) => updateMatchStreamLink(t.id, sub.id, e.target.value)}
                                  placeholder="https://..."
                                  className="flex-1 rounded px-2 py-1 text-xs"
                                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => handleSaveStreamLinks(t)}
                    disabled={savingId === t.id}
                    className="w-full py-2 rounded font-semibold text-sm"
                    style={{ backgroundColor: savingId === t.id ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)' }}>
                    {savingId === t.id ? 'Sauvegarde...' : '💾 Sauvegarder les liens'}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
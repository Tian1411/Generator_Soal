/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Settings, 
  FileText, 
  CheckCircle, 
  Loader2, 
  Copy, 
  Download, 
  FileDown,
  AlertCircle,
  Shapes,
  Layout,
  Layers,
  GraduationCap,
  Sparkles,
  History,
  Trash2,
  X,
  Search,
  Clock,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateExam, ExamRequest } from './services/geminiService';
import { exportExamToDocx } from './lib/exportDocx';
import { cn } from './lib/utils';

interface ExamHistoryItem {
  id: string;
  createdAt: string;
  formData: ExamRequest;
  content: string;
}

const EXAM_HISTORY_STORAGE_KEY = 'guru_kecil_exam_history_v1';
const MAX_HISTORY_ITEMS = 30;

export default function App() {
  const [formData, setFormData] = useState<ExamRequest>({
    jenisPenilaian: 'Sumatif Akhir Semester Ganjil',
    kelas: '1',
    mataPelajaran: 'Bahasa Indonesia',
    materi: '',
    jumlahSoal: {
      pg: 10,
      isian: 5,
      uraian: 2
    },
    taxonomyType: 'solo',
    isHots: false,
    proporsiKognitifSolo: {
      unistructural: 40,
      multistructural: 30,
      relational: 20,
      extendedAbstract: 10
    },
    proporsiKognitifBloom: {
      c1: 40,
      c2: 30,
      c3: 20,
      c4: 10
    }
  });

  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [history, setHistory] = useState<ExamHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(EXAM_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(EXAM_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Gagal menyimpan riwayat ke localStorage:', e);
    }
  }, [history]);

  const totalProporsi = formData.taxonomyType === 'solo'
    ? formData.proporsiKognitifSolo.unistructural + formData.proporsiKognitifSolo.multistructural + formData.proporsiKognitifSolo.relational + formData.proporsiKognitifSolo.extendedAbstract
    : formData.proporsiKognitifBloom.c1 + formData.proporsiKognitifBloom.c2 + formData.proporsiKognitifBloom.c3 + formData.proporsiKognitifBloom.c4;
  const isProporsiValid = totalProporsi === 100;

  const handleGenerate = async () => {
    if (!isProporsiValid) {
      setError('Total proporsi kognitif harus 100%');
      return;
    }
    if (!formData.materi.trim()) {
      setError('Materi/Bab tidak boleh kosong');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveHistoryId(null);

    try {
      const snapshotForm: ExamRequest = JSON.parse(JSON.stringify(formData));
      const examContent = await generateExam(snapshotForm, (partialText) => {
        setResult(partialText);
      });
      const finalContent = examContent || '';
      setResult(finalContent);

      if (finalContent.trim()) {
        const newItem: ExamHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          formData: snapshotForm,
          content: finalContent,
        };
        setHistory((prev) => [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
        setActiveHistoryId(newItem.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menghasilkan soal. Silakan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistory = (item: ExamHistoryItem) => {
    setFormData(item.formData);
    setResult(item.content);
    setError(null);
    setActiveHistoryId(item.id);
    setIsHistoryOpen(false);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    setActiveHistoryId(null);
    setConfirmClearHistory(false);
  };

  const filteredHistory = history.filter((item) => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.formData.mataPelajaran.toLowerCase().includes(q) ||
      item.formData.materi.toLowerCase().includes(q) ||
      item.formData.jenisPenilaian.toLowerCase().includes(q) ||
      `kelas ${item.formData.kelas}`.toLowerCase().includes(q)
    );
  });

  const formatHistoryDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleCopy = () => {
    if (result) {
      // Removing Markdown syntax for a cleaner paste to Word if needed
      // But usually plain markdown is fine. Let's just copy the text.
      navigator.clipboard.writeText(result);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  const handleDownloadWord = async () => {
    if (!result || exportingDocx) return;
    setExportingDocx(true);
    try {
      await exportExamToDocx(result, formData.mataPelajaran, formData.kelas);
    } catch (err) {
      console.error('Gagal mengekspor ke .docx:', err);
      setError('Gagal membuat file .docx. Silakan coba lagi.');
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-primary/10 selection:text-brand-primary">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 group-hover:scale-110 transition-transform">
                <GraduationCap size={24} />
              </div>
              <div>
                <h1 className="text-[14px] font-bold tracking-tight text-slate-900 leading-none">EXAM GENERATOR By Guru Kecil</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setConfirmClearHistory(false);
                  setIsHistoryOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-primary/10 hover:text-brand-primary text-slate-700 text-xs font-semibold transition-colors border border-slate-200/80"
              >
                <History size={14} />
                <span>Riwayat Soal</span>
                {history.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-brand-primary text-white">
                    {history.length}
                  </span>
                )}
              </button>
              <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
              <span className="hidden sm:inline">Kurikulum Merdeka</span>
              <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-bold uppercase tracking-wider">Aktif</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar / Form */}
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Settings size={18} className="text-slate-400" />
                <h2 className="font-semibold text-slate-800">Pengaturan Soal</h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Jenis Penilaian */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    Jenis Penilaian
                  </label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    value={formData.jenisPenilaian}
                    onChange={(e) => setFormData({...formData, jenisPenilaian: e.target.value})}
                  >
                    <option>Sumatif Tengah Semester Ganjil</option>
                    <option>Sumatif Akhir Semester Ganjil</option>
                    <option>Sumatif Tengah Semester Genap</option>
                    <option>Sumatif Akhir Semester Genap</option>
                  </select>
                </div>

                {/* Kelas & Mapel */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Layout size={14} className="text-slate-400" />
                      Kelas
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      value={formData.kelas}
                      onChange={(e) => setFormData({...formData, kelas: e.target.value})}
                    >
                      {['1', '2', '3', '4', '5', '6'].map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <BookOpen size={14} className="text-slate-400" />
                      Mapel
                    </label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      placeholder="Contoh: IPAS"
                      value={formData.mataPelajaran}
                      onChange={(e) => setFormData({...formData, mataPelajaran: e.target.value})}
                    />
                  </div>
                </div>

                {/* Materi */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Layers size={14} className="text-slate-400" />
                    Materi / Bab
                  </label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all resize-none"
                    placeholder="Masukkan daftar materi atau bab yang akan diujikan..."
                    value={formData.materi}
                    onChange={(e) => setFormData({...formData, materi: e.target.value})}
                  />
                </div>

                {/* Jumlah Soal */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Komposisi Soal</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">PG</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center"
                        value={formData.jumlahSoal.pg}
                        onChange={(e) => setFormData({...formData, jumlahSoal: {...formData.jumlahSoal, pg: parseInt(e.target.value) || 0}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">Isian</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center"
                        value={formData.jumlahSoal.isian}
                        onChange={(e) => setFormData({...formData, jumlahSoal: {...formData.jumlahSoal, isian: parseInt(e.target.value) || 0}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">Uraian</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center"
                        value={formData.jumlahSoal.uraian}
                        onChange={(e) => setFormData({...formData, jumlahSoal: {...formData.jumlahSoal, uraian: parseInt(e.target.value) || 0}})}
                      />
                    </div>
                  </div>
                </div>

                {/* Mode Soal HOTS / Non-HOTS */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-500" />
                    Tingkat Penalaran (HOTS)
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isHots: false })}
                      className={cn(
                        "py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center",
                        !formData.isHots
                          ? "bg-white text-brand-primary shadow-xs font-bold border border-slate-200/50"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Standar (Non-HOTS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isHots: true })}
                      className={cn(
                        "py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center",
                        formData.isHots
                          ? "bg-white text-amber-600 shadow-xs font-bold border border-amber-200/70"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Soal HOTS
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {formData.isHots
                      ? 'Soal berbasis stimulus kontekstual, penalaran kritis, & pemecahan masalah tingkat tinggi.'
                      : 'Soal reguler yang lugas dan langsung mengukur pemahaman konsep sesuai proporsi.'}
                  </p>
                </div>

                {/* Kognitif */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Pilihan Taksonomi
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, taxonomyType: 'solo' })}
                        className={cn(
                          "py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center",
                          formData.taxonomyType === 'solo'
                            ? "bg-white text-brand-primary shadow-xs font-bold border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Taksonomi SOLO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, taxonomyType: 'bloom' })}
                        className={cn(
                          "py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center",
                          formData.taxonomyType === 'bloom'
                            ? "bg-white text-brand-primary shadow-xs font-bold border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Taksonomi BLOOM
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Proporsi Kognitif</span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {formData.taxonomyType === 'solo' 
                          ? 'Taksonomi SOLO (U - M - R - E)' 
                          : 'Taksonomi BLOOM (C1 - C2 - C3 - C4)'}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      isProporsiValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {totalProporsi}% / 100%
                    </span>
                  </div>

                  {formData.taxonomyType === 'solo' ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'unistructural', label: 'U (Uni)', desc: 'Unistructural: Sederhana / satu aspek informasi' },
                        { key: 'multistructural', label: 'M (Multi)', desc: 'Multistructural: Beberapa aspek terpisah' },
                        { key: 'relational', label: 'R (Rel)', desc: 'Relational: Hubungan / antar konsep terkait' },
                        { key: 'extendedAbstract', label: 'E (Ext)', desc: 'Extended Abstract: Generalisasi konsep baru' }
                      ].map((item) => (
                        <div key={item.key} className="space-y-1 text-center group relative">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block cursor-help" title={item.desc}>
                            {item.label}
                          </label>
                          <input 
                            type="number"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            value={formData.proporsiKognitifSolo[item.key as keyof typeof formData.proporsiKognitifSolo]}
                            onChange={(e) => setFormData({
                              ...formData, 
                              proporsiKognitifSolo: {
                                ...formData.proporsiKognitifSolo, 
                                [item.key]: parseInt(e.target.value) || 0
                              }
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'c1', label: 'C1 (Ingat)', desc: 'C1 Mengingat: Mengingat kembali fakta atau konsep' },
                        { key: 'c2', label: 'C2 (Paham)', desc: 'C2 Memahami: Menjelaskan ide atau konsep' },
                        { key: 'c3', label: 'C3 (Terap)', desc: 'C3 Menerapkan/Mengaplikasikan: Menggunakan konsep di situasi baru' },
                        { key: 'c4', label: 'C4 (Nalar)', desc: 'C4 Menganalisis: Menguraikan materi ke bagian-bagiannya' }
                      ].map((item) => (
                        <div key={item.key} className="space-y-1 text-center group relative">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block cursor-help" title={item.desc}>
                            {item.label}
                          </label>
                          <input 
                            type="number"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            value={formData.proporsiKognitifBloom[item.key as keyof typeof formData.proporsiKognitifBloom]}
                            onChange={(e) => setFormData({
                              ...formData, 
                              proporsiKognitifBloom: {
                                ...formData.proporsiKognitifBloom, 
                                [item.key]: parseInt(e.target.value) || 0
                              }
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-700 text-xs animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  onClick={handleGenerate}
                  disabled={loading}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg active:scale-[0.98]",
                    loading 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                      : "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-brand-primary/20"
                  )}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Menyusun Soal...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Shapes size={18} />
                      <span>Buat Paket Soal</span>
                    </div>
                  )}
                </button>
              </div>
            </section>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Tips Penyusunan</h3>
              <ul className="text-[11px] text-blue-700 space-y-1.5 list-disc pl-3">
                <li>Pilih Taksonomi SOLO atau Taksonomi BLOOM sesuai standar penilaian sekolah Anda.</li>
                <li>Aktifkan mode <strong>Soal HOTS</strong> jika ingin soal berbasis stimulus kontekstual dan penalaran tinggi.</li>
                <li>Soal literasi atau berbasis teks akan otomatis disertai bahan bacaan lengkap di Lembar Soal.</li>
                <li>Semua paket soal tersimpan otomatis di menu <strong>Riwayat Soal</strong> agar mudah dibuka kembali.</li>
              </ul>
            </div>
          </aside>

          {/* Result Panel */}
          <section className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 h-full min-h-[600px] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brand-primary" />
                <h2 className="font-semibold text-slate-800 tracking-tight">Draft Paket Soal</h2>
              </div>
              <div className="flex items-center gap-2">
                {result && (
                  <>
                    <button 
                      onClick={handleCopy}
                      className="p-2 text-slate-500 hover:text-brand-primary hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                      title="Salin ke Papan Klip"
                    >
                      {copying ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copying ? 'Tersalin' : 'Salin'}
                    </button>
                    <button 
                      onClick={handleDownloadWord}
                      disabled={exportingDocx}
                      className="p-2 text-slate-500 hover:text-brand-primary hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                      title="Unduh Word (.docx)"
                    >
                      {exportingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                      Word (.docx)
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="p-2 text-slate-500 hover:text-brand-primary hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Download size={14} />
                      Cetak
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative">
              <AnimatePresence mode="wait">
                {!result && !loading ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20"
                  >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <Shapes size={40} />
                    </div>
                    <div className="max-w-[300px]">
                      <h3 className="font-bold text-slate-800">Mulai Menyusun Soal</h3>
                      <p className="text-sm text-slate-500 mt-2">Atur parameter di panel sebelah kiri lalu klik tombol "Buat Paket Soal" untuk memulai.</p>
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsHistoryOpen(true)}
                          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-brand-primary/10 text-slate-700 hover:text-brand-primary text-xs font-semibold transition-colors"
                        >
                          <History size={14} />
                          <span>Buka Riwayat Soal ({history.length})</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : !result && loading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center space-y-4 py-20"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <GraduationCap size={24} className="text-brand-primary" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-slate-800">GuruPintar sedang bekerja</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest animate-pulse">Meninjau Kurikulum</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest animate-pulse [animation-delay:200ms]">Membuat Soal</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest animate-pulse [animation-delay:400ms]">Memvalidasi Kunci</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="markdown-body"
                  >
                    {loading && (
                      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/5 border border-brand-primary/15 text-xs font-medium text-brand-primary">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Sedang menulis paket soal secara langsung...</span>
                      </div>
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result || ''}
                    </ReactMarkdown>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {result && (
              <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Dihasilkan Secara Otomatis oleh Kecerdasan Buatan</p>
              </div>
            )}
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="w-6 h-6 bg-slate-400 rounded-md flex items-center justify-center text-white">
                <GraduationCap size={16} />
              </div>
              <span className="font-bold text-slate-400 tracking-tight">EXAM GENERATOR By Guru Kecil</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Gunakan hasil soal sebagai referensi. Kami merekomendasikan guru untuk tetap meninjau kesesuaian soal dengan karakteristik siswa di sekolah masing-masing.
          </p>
        </div>
      </footer>

      {/* Riwayat Soal Slide-Over Drawer */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex justify-end print:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    <History size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">Riwayat Soal</h2>
                    <p className="text-[11px] text-slate-500">{history.length} paket soal tersimpan di perangkat ini</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Tutup Riwayat Soal"
                >
                  <X size={18} />
                </button>
              </div>

              {history.length > 0 && (
                <div className="p-4 border-b border-slate-100 space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Cari mapel, materi, atau kelas..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Menampilkan {filteredHistory.length} dari {history.length} riwayat
                    </span>
                    {!confirmClearHistory ? (
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(true)}
                        className="text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Hapus Semua
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">Yakin?</span>
                        <button
                          type="button"
                          onClick={handleClearAllHistory}
                          className="px-2 py-0.5 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearHistory(false)}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 px-6">
                    <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-3">
                      <History size={28} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Soal</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Setiap paket soal yang selesai dibuat akan tersimpan otomatis di sini agar bisa dibuka, diunduh, atau dicetak ulang kapan saja.
                    </p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    Tidak ada riwayat yang cocok dengan kata kunci "{historySearch}".
                  </div>
                ) : (
                  filteredHistory.map((item) => {
                    const isActive = activeHistoryId === item.id;
                    const totalQuestions =
                      (item.formData.jumlahSoal?.pg || 0) +
                      (item.formData.jumlahSoal?.isian || 0) +
                      (item.formData.jumlahSoal?.uraian || 0);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border p-3.5 transition-all space-y-2.5",
                          isActive
                            ? "border-brand-primary/40 bg-brand-primary/[0.03] shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {item.formData.mataPelajaran || 'Tanpa Mapel'}
                              </span>
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600">
                                Kelas {item.formData.kelas}
                              </span>
                              {item.formData.isHots && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
                                  HOTS
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 uppercase">
                                {item.formData.taxonomyType}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 truncate">
                              {item.formData.jenisPenilaian}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Hapus riwayat ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                          {item.formData.materi}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} />
                              {formatHistoryDate(item.createdAt)}
                            </span>
                            <span>•</span>
                            <span>{totalQuestions} soal</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLoadHistory(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-primary/90 transition-colors"
                          >
                            <FolderOpen size={12} />
                            <span>Buka Soal</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

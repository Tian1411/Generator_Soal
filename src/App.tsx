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
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateExam, ExamRequest } from './services/geminiService';
import { cn } from './lib/utils';

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

    try {
      const examContent = await generateExam(formData);
      setResult(examContent || '');
    } catch (err: any) {
      setError(err?.message || 'Gagal menghasilkan soal. Silakan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
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

  const handleDownloadWord = () => {
    if (!result) return;

    // A simple way to generate a Word-compatible file (HTML with .doc extension)
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Paket Soal</title>
      <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 11pt; padding: 20px; }
        table { border-collapse: collapse; width: 100%; border: 1px solid #000; margin-bottom: 20px; table-layout: auto; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 10pt; vertical-align: top; }
        th { background-color: #f2f2f2; font-weight: bold; }
        h1, h2, h3 { margin-top: 20px; font-size: 13pt; font-weight: bold; text-decoration: underline; }
        .kop { text-align: center; border-bottom: 3px double #000; margin-bottom: 20px; padding-bottom: 10px; font-weight: bold; font-size: 12pt; }
        .soal-item { margin-top: 10px; margin-bottom: 5px; font-weight: bold; }
        .opsi-item { margin-left: 20px; }
        .divider { border-top: 1px solid #000; margin: 20px 0; }
      </style>
      </head><body>
    `;
    const footer = "</body></html>";
    
    // Improved conversion logic
    const lines = result.split('\n');
    let htmlContent = '';
    let inTable = false;
    let tableRows: string[] = [];
    let kopCounter = 0;

    lines.forEach((line) => {
      let processedLine = line.trim();

      // Handle KOP (Header) - toggles between start and end
      if (processedLine === '---------------------------------------------------------') {
        if (kopCounter % 2 === 0) {
          htmlContent += '<div class="kop">';
        } else {
          htmlContent += '</div>';
        }
        kopCounter++;
        return;
      }

      // Handle Table Rows
      if (processedLine.startsWith('|') && processedLine.endsWith('|')) {
        if (processedLine.includes('---')) return; // Skip Markdown separator
        inTable = true;
        const cells = processedLine.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const isHeader = tableRows.length === 0 && (processedLine.toLowerCase().includes('no') || processedLine.toLowerCase().includes('tujuan'));
        const tag = isHeader ? 'th' : 'td';
        const row = `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
        tableRows.push(row);
        return;
      } else if (inTable) {
        // Flush table
        htmlContent += `<table>${tableRows.join('')}</table>`;
        tableRows = [];
        inTable = false;
      }

      // Handle other elements
      if (processedLine.startsWith('=== ') && processedLine.endsWith(' ===')) {
        const title = processedLine.replace(/=== /g, '').replace(/ ===/g, '');
        htmlContent += `<h2>${title}</h2>`;
      } else if (processedLine.startsWith('#')) {
        const level = (processedLine.match(/^#+/) || ['#'])[0].length;
        htmlContent += `<h${level + 1}>${processedLine.replace(/^#+ /, '')}</h${level + 1}>`;
      } else if (/^[0-9]+\./.test(processedLine)) {
        htmlContent += `<div class="soal-item">${processedLine}</div>`;
      } else if (/^[A-D]\./.test(processedLine)) {
        htmlContent += `<div class="opsi-item">${processedLine}</div>`;
      } else if (processedLine === '---' || processedLine === '***') {
        htmlContent += '<div class="divider"></div>';
      } else if (processedLine === '') {
        htmlContent += '<br>';
      } else if (processedLine.toUpperCase() === processedLine && processedLine.length > 5 && !processedLine.includes('|')) {
        // Likely a section header like "I. PILIHAN GANDA"
        htmlContent += `<div style="font-weight: bold; margin-top: 15px; text-decoration: underline;">${processedLine}</div>`;
      } else {
        htmlContent += `<div>${processedLine}</div>`;
      }
    });

    // Final table flush if needed
    if (inTable) {
      htmlContent += `<table>${tableRows.join('')}</table>`;
    }

    const source = header + htmlContent + footer;
    const blob = new Blob(['\ufeff', source], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Soal_${formData.mataPelajaran}_Kelas${formData.kelas}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
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
                <li>Masukkan materi secara detail agar soal lebih spesifik.</li>
                <li>Gunakan rasio 40-30-20-10 untuk keseimbangan tingkat kesulitan.</li>
                <li>Soal yang dihasilkan sudah termasuk kisi-kisi, kunci jawaban & pedoman penskoran.</li>
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
                      className="p-2 text-slate-500 hover:text-brand-primary hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                      title="Unduh Word (.doc)"
                    >
                      <FileDown size={14} />
                      Word
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
                    <div className="max-w-[280px]">
                      <h3 className="font-bold text-slate-800">Mulai Menyusun Soal</h3>
                      <p className="text-sm text-slate-500 mt-2">Atur parameter di panel sebelah kiri lalu klik tombol "Buat Paket Soal" untuk memulai.</p>
                    </div>
                  </motion.div>
                ) : loading ? (
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result}
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
    </div>
  );
}

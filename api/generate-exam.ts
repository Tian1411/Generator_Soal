import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const SYSTEM_PROMPT = `
ANDA ADALAH AI YANG BERPERAN SEBAGAI:
1. Ahli kurikulum SD Indonesia (Kurikulum Merdeka & K13)
2. Penyusun soal profesional
3. Penulis kisi-kisi soal yang sistematis

TUGAS ANDA ADALAH MEMBUAT PAKET SOAL SUMATIF LENGKAP YANG RAPI, TERSTRUKTUR, DAN SIAP DIGUNAKAN (READY TO PRINT).

ATURAN WAJIB PENULISAN:
1. GUNAKAN FORMAT TEKS BERSIH. JANGAN menggunakan simbol markdown seperti double asterisk (**) untuk bold atau triple hash (###) untuk heading.
2. Gunakan bahasa Indonesia yang baik, benar, dan ramah anak SD.
3. Pastikan penomoran soal berurutan dan konsisten (1, 2, 3...).
4. Pilihan Ganda (Opsi Jawaban) harus disusun secara vertikal (satu opsi per baris) dan memiliki indentasi agar sejajar rapi ke bawah.
   Contoh format yang diharapkan:
   1. Apa nama ibu kota negara Indonesia?
      A. Jakarta
      B. Bandung
      C. Surabaya
      D. Medan
5. Dilarang keras menyusun opsi jawaban secara horizontal (menyamping).
6. Bagian Lembar Soal harus dipisahkan dengan jelas dari Kisi-kisi dan Kunci Jawaban menggunakan Horizontal Rule (---).
7. BAHAN BACAAN WAJIB LENGKAP: Jika ada soal (baik PG, Isian, Uraian, maupun soal HOTS/literasi) yang membutuhkan bahan bacaan, teks cerita, dialog, berita, puisi, atau wacana informatif sebagai stimulus, WAJIB menuliskan bahan bacaan tersebut secara UTUH dan LENGKAP di dalam Lembar Soal tepat di atas soal yang bersangkutan. DILARANG merujuk ke bacaan (seperti "berdasarkan teks di atas" atau "bacalah cerita berikut") tanpa menyertakan isi bacaannya. Format penulisan bahan bacaan:
   Bacalah teks berikut untuk menjawab soal nomor X! (atau nomor X - Y jika untuk beberapa soal)
   Judul: [Judul Bahan Bacaan]
   [Isi teks bacaan yang utuh, jelas, menarik, dan sesuai usia siswa SD]

STRUKTUR OUTPUT (IKUTI URUTAN INI):

1. === KISI-KISI SOAL ===
Buat tabel Markdown (gunakan simbol | saja): No | Tujuan Pembelajaran | Materi | Indikator Soal | Level | No. Soal & Jenis | Kunci Jawaban
ATURAN KETAT TABEL KISI-KISI:
- SEMUA NOMOR SOAL WAJIB DISEBUTKAN SATU PER SATU: Setiap nomor soal harus memiliki 1 baris tersendiri secara berurutan dari nomor 1 sampai nomor terakhir (total baris data = jumlah seluruh soal PG + Isian + Uraian). DILARANG KERAS menggabungkan beberapa nomor soal dalam satu baris (misalnya: 1-5, 1 & 2, atau 1, 2, 3).
- Indikator Soal: WAJIB dibuat secara RINCI, LENGKAP, dan OPERASIONAL (JANGAN dibuat ringkas/singkat). Gunakan pola kalimat lengkap yang menjelaskan: (1) stimulus atau situasi yang diberikan kepada siswa (misalnya: "Disajikan sebuah teks cerita pendek / ilustrasi kasus sehari-hari / tabel data tentang..."), (2) perilaku atau tindakan spesifik yang harus dilakukan siswa ("peserta didik dapat menganalisis / membandingkan / menyimpulkan / menentukan..."), serta (3) rincian tugas dan hasil yang diharapkan ("...berdasarkan alasan yang logis dengan tepat"). Dengan membaca indikator soal ini, siswa dan guru langsung memahami apa yang akan dikerjakan pada nomor soal tersebut.
- Level: Harus diisi tingkat kognitif sesuai taksonomi yang diminta oleh guru:
  * Jika Taksonomi SOLO: Unistructural (U), Multistructural (M), Relational (R), atau Extended Abstract (E).
  * Jika Taksonomi BLOOM: C1 (Mengingat), C2 (Memahami), C3 (Mengaplikasikan), atau C4 (Menganalisis).
- No. Soal & Jenis: Berisi satu nomor soal tunggal yang berurutan dan jenisnya (Contoh: 1 (PG), 2 (PG), ..., 11 (Isian), ..., 16 (Uraian)).
- Kunci Jawaban: WAJIB diisi kunci jawaban yang PASTI, LENGKAP, dan JELAS untuk setiap nomor soal. DILARANG KERAS menulis "Variatif", "Bervariasi", "Kebijakan guru", "Disesuaikan", "Bebas", atau keterangan mengambang lainnya pada soal PG, Isian, maupun Uraian:
  * Untuk Pilihan Ganda: Tuliskan huruf opsi beserta teks jawabannya secara lengkap (Contoh: A. Jakarta).
  * Untuk Isian: Tuliskan jawaban singkat yang pasti dan jelas (Contoh: Ibu kota Indonesia adalah Jakarta -> Jakarta).
  * Untuk Uraian: Tuliskan kunci jawaban lengkap berupa kalimat/poin jawaban konkret yang benar dan jelas (Contoh: 1. Menjaga kebersihan kelas; 2. Membuang sampah pada tempatnya; 3. Melaksanakan piket harian).

2. === LEMBAR SOAL ===
Sertakan KOP SOAL di awal bagian ini:
---------------------------------------------------------
NAMA SEKOLAH: [DIISI NAMA SEKOLAH]
MATA PELAJARAN: {MAPEL}
KELAS: {KELAS}
JENIS PENILAIAN: {JENIS_PENILAIAN}
WAKTU: 90 MENIT
---------------------------------------------------------

Gunakan penomoran soal yang BERURUTAN TERUS-MENERUS dari nomor 1 sampai nomor terakhir agar sinkron 100% dengan tabel Kisi-Kisi!
I. PILIHAN GANDA
Petunjuk: Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!
(Daftar soal PG mulai nomor 1 dst...)
1. [Soal]
   A. [Pilihan]
   B. [Pilihan]
   C. [Pilihan]
   D. [Pilihan]

II. ISIAN 
Petunjuk: Isilah titik-titik di bawah ini dengan jawaban yang benar!
(Daftar soal isian melanjutkan nomor setelah soal PG terakhir...)

III. URAIAN
Petunjuk: Jawablah pertanyaan-pertanyaan di bawah ini dengan uraian yang jelas dan tepat!
(Daftar soal uraian melanjutkan nomor setelah soal Isian terakhir...)

3. === KUNCI JAWABAN & PEDOMAN PENSKORAN ===
- Berikan kunci jawaban yang LENGKAP, JELAS, dan KONSISTEN dengan kolom Kunci Jawaban di Kisi-kisi untuk seluruh nomor soal dari 1 sampai nomor terakhir (tanpa menulis "variatif" atau "kebijakan guru").
- Berikan rubrik penilaian untuk bagian Uraian agar guru mudah memberikan skor.

VALIDASI:
- Jumlah baris pada tabel Kisi-Kisi HARUS sama persis dengan total jumlah soal (PG + Isian + Uraian) dan mencantumkan semua nomor dari 1 hingga akhir satu per satu.
- Tidak boleh ada kunci jawaban bertuliskan "variatif", "bervariasi", atau "kebijakan guru".
- Proporsi tingkat kognitif HARUS sesuai dengan jenis taksonomi dan persentase yang diminta guru.
- Soal harus sesuai dengan materi yang diberikan.
`;

function formatApiErrorMessage(error: any): string {
  const rawMessage = typeof error?.message === 'string' ? error.message : String(error || '');
  let parsedMessage = rawMessage;

  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed?.error?.message) {
      parsedMessage = parsed.error.message;
    }
  } catch {
    // Keep rawMessage
  }

  if (
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('403')
  ) {
    return 'Akses Gemini API ditolak (403/API Key tidak valid). Silakan periksa GEMINI_API_KEY di panel Settings > Secrets atau Environment Variables.';
  }

  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return 'Kuota permintaan Gemini API sementara penuh (429). Silakan tunggu sebentar lalu coba lagi, atau periksa paket/API key Anda di panel Settings > Secrets.';
  }

  if (
    rawMessage.toLowerCase().includes('fetch failed') ||
    rawMessage.toLowerCase().includes('aborted') ||
    rawMessage.toLowerCase().includes('timeout')
  ) {
    return 'Koneksi ke server Gemini API terputus atau terlalu lama merespons. Silakan coba lagi.';
  }

  return parsedMessage || 'Terjadi kesalahan saat membuat soal ujian.';
}

const modelCooldownUntil = new Map<string, number>();

async function streamExamWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const candidates: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  const now = Date.now();
  const activeAttempts = candidates.filter((c) => (modelCooldownUntil.get(c.model) ?? 0) <= now);
  const attempts = activeAttempts.length > 0 ? activeAttempts : candidates;

  let lastError: any = null;

  for (let i = 0; i < attempts.length; i++) {
    const { model, thinkingLevel } = attempts[i];
    let emitted = '';
    const controller = new AbortController();
    // Abort only if no first chunk arrives within 12 seconds
    const firstChunkTimer = setTimeout(() => {
      controller.abort(new Error(`Timeout waiting for first chunk from ${model}`));
    }, 12000);

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          abortSignal: controller.signal,
          thinkingConfig: { thinkingLevel },
        },
      });

      for await (const chunk of stream) {
        if (!emitted) {
          clearTimeout(firstChunkTimer);
        }
        const text = chunk.text;
        if (text) {
          emitted += text;
          onChunk(text);
        }
      }

      clearTimeout(firstChunkTimer);
      if (emitted.trim().length > 0) {
        return emitted;
      }
    } catch (err: any) {
      clearTimeout(firstChunkTimer);
      lastError = err;
      const errMsg = err?.message || String(err);

      // Put model on temporary cooldown if rate-limited (429) or overloaded (503)
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        modelCooldownUntil.set(model, Date.now() + 5 * 60 * 1000);
      } else if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) {
        modelCooldownUntil.set(model, Date.now() + 30 * 1000);
      }

      // If chunks were already streamed to client, do not restart a second copy
      if (emitted.trim().length > 0) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw lastError || new Error('Gagal menghasilkan soal dari AI.');
}

export default async function handler(req: any, res: any) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY belum dikonfigurasi. Silakan periksa Settings > Secrets atau Environment Variables di Vercel.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Payload JSON tidak valid.' });
    }
  }

  const {
    jenisPenilaian,
    kelas,
    mataPelajaran,
    materi,
    jumlahSoal,
    taxonomyType,
    isHots,
    proporsiKognitifSolo,
    proporsiKognitifBloom,
  } = body || {};

  if (!materi || !materi.trim()) {
    return res.status(400).json({ error: 'Materi/Bab tidak boleh kosong.' });
  }

  const isBloom = taxonomyType === 'bloom';
  const taxonomyDetails = isBloom
    ? `- Taksonomi Kognitif yang Dipilih: Taksonomi BLOOM (Revisi)
- Proporsi Kognitif Taksonomi BLOOM:
  - C1 (Mengingat): ${proporsiKognitifBloom?.c1 || 0}%
  - C2 (Memahami): ${proporsiKognitifBloom?.c2 || 0}%
  - C3 (Mengaplikasikan / Menerapkan): ${proporsiKognitifBloom?.c3 || 0}%
  - C4 (Menganalisis): ${proporsiKognitifBloom?.c4 || 0}%
Catatan Level di Kisi-kisi: Tuliskan level Bloom (C1, C2, C3, C4) pada kolom Level.`
    : `- Taksonomi Kognitif yang Dipilih: Taksonomi SOLO
- Proporsi Kognitif Taksonomi SOLO:
  - Unistructural (U): ${proporsiKognitifSolo?.unistructural || 0}%
  - Multistructural (M): ${proporsiKognitifSolo?.multistructural || 0}%
  - Relational (R): ${proporsiKognitifSolo?.relational || 0}%
  - Extended Abstract (E): ${proporsiKognitifSolo?.extendedAbstract || 0}%
Catatan Level di Kisi-kisi: Tuliskan level SOLO (U, M, R, E) pada kolom Level.`;

  const hotsInstruction = isHots
    ? `- Mode / Karakteristik Soal: SOAL HOTS (Higher Order Thinking Skills)
  * Susun soal-soal dengan pendekatan HOTS yang menekankan penalaran kritis, pemecahan masalah nyata, dan analisis mendalam sesuai usia anak SD kelas ${kelas}.
  * Gunakan stimulus kontekstual yang menarik pada soal (seperti cuplikan cerita, dialog singkat, ilustrasi situasi kehidupan sehari-hari, atau data sederhana) sebelum pertanyaan.
  * Hindari pertanyaan hafalan semata; dorong siswa menghubungkan konsep, mengevaluasi situasi, dan menarik kesimpulan.
  * Pastikan proporsi kognitif tetap mengikuti persentase di atas dengan penekanan kualitas penalaran HOTS.`
    : `- Mode / Karakteristik Soal: SOAL REGULER / STANDAR (Non-HOTS)
  * Susun soal-soal secara lugas, jelas, dan langsung menguji pemahaman konsep sesuai proporsi kognitif di atas tanpa tuntutan stimulus analisis HOTS yang kompleks.`;

  const pgCount = Number(jumlahSoal?.pg ?? 10);
  const isianCount = Number(jumlahSoal?.isian ?? 5);
  const uraianCount = Number(jumlahSoal?.uraian ?? 2);
  const totalSoalCount = pgCount + isianCount + uraianCount;

  const userPrompt = `
BUATKAN SOAL DENGAN DATA BERIKUT:
- Jenis Penilaian: ${jenisPenilaian}
- Kelas: ${kelas}
- Mata Pelajaran: ${mataPelajaran}
- Materi/Bab: ${materi}
- Jumlah Soal (Total ${totalSoalCount} soal, penomoran berurutan 1 s.d. ${totalSoalCount}):
  - Pilihan Ganda: ${pgCount} soal${pgCount > 0 ? ` (Nomor 1 s.d. ${pgCount})` : ''}
  - Isian: ${isianCount} soal${isianCount > 0 ? ` (Nomor ${pgCount + 1} s.d. ${pgCount + isianCount})` : ''}
  - Uraian: ${uraianCount} soal${uraianCount > 0 ? ` (Nomor ${pgCount + isianCount + 1} s.d. ${totalSoalCount})` : ''}
${taxonomyDetails}
${hotsInstruction}
- Catatan Tambahan Kisi-kisi:
  1. Pastikan kolom Indikator Soal ditulis secara RINCI dan JELAS (menyebutkan stimulus, aktivitas siswa, materi spesifik, dan target pencapaiannya) sehingga siswa dapat mengerti apa yang akan dikerjakan pada setiap soal.
  2. Tabel kisi-kisi WAJIB memuat seluruh nomor soal secara lengkap satu per satu dari nomor 1 hingga nomor ${totalSoalCount} (${totalSoalCount} baris data, tidak boleh digabung).
  3. Kolom Kunci Jawaban pada tabel kisi-kisi WAJIB berisi kunci jawaban yang lengkap, pasti, dan jelas untuk setiap nomor (termasuk Isian dan Uraian). DILARANG menulis jawaban yang variatif seperti "variatif", "bervariasi", atau "kebijakan guru".
- Catatan Bahan Bacaan: Apabila soal membutuhkan bahan bacaan/teks stimulus (terutama pada materi teks bacaan, literasi, studi kasus, atau HOTS), sertakan bahan bacaan secara lengkap tepat sebelum nomor soal yang membutuhkannya di bagian Lembar Soal.
`;

  // Start SSE stream immediately to prevent idle proxy/gateway timeouts
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
  res.write(': connected\n\n');

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      // Ignore write error if client closed
    }
  }, 4000);

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    await streamExamWithFallback(ai, userPrompt, (chunkText) => {
      res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (error: any) {
    console.error('Error generating exam:', error);
    const message = formatApiErrorMessage(error);
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}

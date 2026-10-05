import { GoogleGenAI } from '@google/genai';

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

STRUKTUR OUTPUT (IKUTI URUTAN INI):

1. === KISI-KISI SOAL ===
Buat tabel Markdown (gunakan simbol | saja): No | Tujuan Pembelajaran | Materi | Indikator Soal | Level | No. Soal & Jenis | Kunci Jawaban
Keterangan kolom:
- Level: Harus diisi tingkat kognitif sesuai taksonomi yang diminta oleh guru:
  * Jika Taksonomi SOLO: Unistructural (U), Multistructural (M), Relational (R), atau Extended Abstract (E).
  * Jika Taksonomi BLOOM: C1 (Mengingat), C2 (Memahami), C3 (Mengaplikasikan), atau C4 (Menganalisis).
- No. Soal & Jenis: Berisi nomor soal diikuti jenisnya (Contoh: 1 (PG), 11 (Isian), 16 (Uraian))
- Kunci Jawaban: Berisi opsi jawaban benar (untuk PG) atau jawaban singkat (untuk Isian) atau keterangan (untuk Uraian)

2. === LEMBAR SOAL ===
Sertakan KOP SOAL di awal bagian ini:
---------------------------------------------------------
NAMA SEKOLAH: [DIISI NAMA SEKOLAH]
MATA PELAJARAN: {MAPEL}
KELAS: {KELAS}
JENIS PENILAIAN: {JENIS_PENILAIAN}
WAKTU: 90 MENIT
---------------------------------------------------------

I. PILIHAN GANDA
Petunjuk: Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!
(Daftar soal PG nomor 1 dst...)
1. [Soal]
   A. [Pilihan]
   B. [Pilihan]
   C. [Pilihan]
   D. [Pilihan]

II. ISIAN 
Petunjuk: Isilah titik-titik di bawah ini dengan jawaban yang benar!
(Daftar soal isian nomor 1 dst...)

III. URAIAN
Petunjuk: Jawablah pertanyaan-pertanyaan di bawah ini dengan uraian yang jelas dan tepat!
(Daftar soal uraian nomor 1 dst...)

3. === KUNCI JAWABAN & PEDOMAN PENSKORAN ===
- Berikan kunci jawaban yang jelas untuk semua bagian.
- Berikan rubrik penilaian untuk bagian Uraian agar guru mudah memberikan skor.

VALIDASI:
- Jumlah soal HARUS tepat sesuai input.
- Proporsi tingkat kognitif HARUS sesuai dengan jenis taksonomi dan persentase yang diminta guru.
- Soal harus sesuai dengan materi yang diberikan.
`;

async function generateExamWithRetry(ai: GoogleGenAI, prompt: string): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (let cycle = 1; cycle <= 2; cycle++) {
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} (cycle ${cycle}) warning:`, err?.message || err);
        await new Promise((res) => setTimeout(res, 1200));
      }
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
      error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables hosting/Vercel. Silakan tambahkan GEMINI_API_KEY di dashboard Vercel pada Settings > Environment Variables.',
    });
  }

  try {
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

    const userPrompt = `
BUATKAN SOAL DENGAN DATA BERIKUT:
- Jenis Penilaian: ${jenisPenilaian}
- Kelas: ${kelas}
- Mata Pelajaran: ${mataPelajaran}
- Materi/Bab: ${materi}
- Jumlah Soal:
  - Pilihan Ganda: ${jumlahSoal?.pg ?? 10}
  - Isian: ${jumlahSoal?.isian ?? 5}
  - Uraian: ${jumlahSoal?.uraian ?? 2}
${taxonomyDetails}
`;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const text = await generateExamWithRetry(ai, userPrompt);
    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('Error generating exam:', error);
    let message = 'Terjadi kesalahan saat membuat soal ujian.';
    if (typeof error?.message === 'string') {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.error?.message) {
          message = parsed.error.message;
        }
      } catch {
        message = error.message;
      }
    }
    return res.status(500).json({ error: message });
  }
}

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type TaxonomyType = 'solo' | 'bloom';

export interface ExamRequest {
  jenisPenilaian: string;
  kelas: string;
  mataPelajaran: string;
  materi: string;
  jumlahSoal: {
    pg: number;
    isian: number;
    uraian: number;
  };
  taxonomyType: TaxonomyType;
  proporsiKognitifSolo: {
    unistructural: number;
    multistructural: number;
    relational: number;
    extendedAbstract: number;
  };
  proporsiKognitifBloom: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
  };
}

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

export async function generateExam(request: ExamRequest) {
  const isBloom = request.taxonomyType === 'bloom';
  const taxonomyDetails = isBloom
    ? `- Taksonomi Kognitif yang Dipilih: Taksonomi BLOOM (Revisi)
- Proporsi Kognitif Taksonomi BLOOM:
  - C1 (Mengingat): ${request.proporsiKognitifBloom.c1}%
  - C2 (Memahami): ${request.proporsiKognitifBloom.c2}%
  - C3 (Mengaplikasikan / Menerapkan): ${request.proporsiKognitifBloom.c3}%
  - C4 (Menganalisis): ${request.proporsiKognitifBloom.c4}%
Catatan Level di Kisi-kisi: Tuliskan level Bloom (C1, C2, C3, C4) pada kolom Level.`
    : `- Taksonomi Kognitif yang Dipilih: Taksonomi SOLO
- Proporsi Kognitif Taksonomi SOLO:
  - Unistructural (U): ${request.proporsiKognitifSolo.unistructural}%
  - Multistructural (M): ${request.proporsiKognitifSolo.multistructural}%
  - Relational (R): ${request.proporsiKognitifSolo.relational}%
  - Extended Abstract (E): ${request.proporsiKognitifSolo.extendedAbstract}%
Catatan Level di Kisi-kisi: Tuliskan level SOLO (U, M, R, E) pada kolom Level.`;

  const userPrompt = `
BUATKAN SOAL DENGAN DATA BERIKUT:
- Jenis Penilaian: ${request.jenisPenilaian}
- Kelas: ${request.kelas}
- Mata Pelajaran: ${request.mataPelajaran}
- Materi/Bab: ${request.materi}
- Jumlah Soal:
  - Pilihan Ganda: ${request.jumlahSoal.pg}
  - Isian: ${request.jumlahSoal.isian}
  - Uraian: ${request.jumlahSoal.uraian}
${taxonomyDetails}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

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

export async function generateExam(request: ExamRequest): Promise<string> {
  const response = await fetch('/api/generate-exam', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const rawText = await response.text();
  let data: any = null;

  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      // If it is not JSON (e.g., HTML error page from host)
      if (!response.ok) {
        throw new Error(
          `Server mengembalikan status ${response.status} (${response.statusText || 'Error'}). Pastikan API route dan GEMINI_API_KEY sudah terpasang di Vercel.`
        );
      }
      throw new Error('Respon dari server tidak berformat JSON yang valid.');
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Gagal menghasilkan soal (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  if (!data?.text) {
    throw new Error('Respon server kosong atau tidak memiliki konten soal.');
  }

  return data.text;
}

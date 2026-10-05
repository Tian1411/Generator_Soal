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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Gagal menghasilkan soal');
  }

  return data.text;
}

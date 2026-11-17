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
  isHots: boolean;
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

export async function generateExam(
  request: ExamRequest,
  onChunk?: (accumulatedText: string) => void
): Promise<string> {
  const response = await fetch('/api/generate-exam', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const contentType = response.headers.get('content-type') || '';

  // Handle Server-Sent Events (SSE) stream
  if (contentType.includes('text/event-stream') && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) continue;
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (!payload) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        if (parsed.error) {
          throw new Error(parsed.error);
        }

        if (typeof parsed.chunk === 'string') {
          accumulated += parsed.chunk;
          onChunk?.(accumulated);
        }
      }
    }

    if (!accumulated.trim()) {
      throw new Error('Server tidak mengembalikan konten soal. Silakan coba lagi.');
    }

    return accumulated;
  }

  // Fallback for JSON or error responses (400, 405, 500, or proxy HTML errors)
  const rawText = await response.text();
  let data: any = null;

  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      if (!response.ok) {
        throw new Error(
          `Server mengembalikan status ${response.status} (${response.statusText || 'Error'}). Silakan coba lagi atau periksa pengaturan server.`
        );
      }
      throw new Error(
        'Endpoint /api/generate-exam tidak mengembalikan respon API yang valid. Pastikan server API berjalan dengan benar.'
      );
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

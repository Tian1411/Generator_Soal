import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const PAGE_WIDTH_TWIPS = 11906; // A4 width (21cm)
const PAGE_HEIGHT_TWIPS = 16838; // A4 height (29.7cm)
const PAGE_MARGIN_TWIPS = 850; // ~1.5cm
const CONTENT_WIDTH_TWIPS = PAGE_WIDTH_TWIPS - PAGE_MARGIN_TWIPS * 2; // 10206 twips

function parseInlineRuns(
  text: string,
  baseOpts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}
): TextRun[] {
  const size = baseOpts.size ?? 22; // 11pt
  const color = baseOpts.color ?? '111827';
  const runs: TextRun[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          font: 'Times New Roman',
          size,
          color,
          bold: baseOpts.bold,
          italics: baseOpts.italics,
        })
      );
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          font: 'Times New Roman',
          size,
          color,
          bold: true,
          italics: baseOpts.italics,
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: 'Times New Roman',
          size,
          color,
          bold: baseOpts.bold,
          italics: true,
        })
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length || runs.length === 0) {
    runs.push(
      new TextRun({
        text: text.slice(lastIndex),
        font: 'Times New Roman',
        size,
        color,
        bold: baseOpts.bold,
        italics: baseOpts.italics,
      })
    );
  }

  return runs;
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  return /^\|?[\s:|-]+\|?$/.test(trimmed) && trimmed.includes('-');
}

function isTableLine(line: string, currentlyInTable: boolean): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  if (isSeparatorRow(trimmed)) return true;
  if (trimmed.startsWith('|') || trimmed.endsWith('|')) return true;
  if (trimmed.split('|').length >= 3) return true;
  return currentlyInTable;
}

function parseTableCells(line: string): string[] {
  const cleaned = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return cleaned.split('|').map((c) => c.trim());
}

function buildDocxTable(rows: string[][]): Table {
  const colCount = Math.max(...rows.map((r) => r.length));
  const kisiWidthsPct = [5, 15, 11, 30, 7, 10, 22];
  const colWidths =
    colCount === 7
      ? kisiWidthsPct.map((pct) => Math.round((CONTENT_WIDTH_TWIPS * pct) / 100))
      : Array.from({ length: colCount }, () => Math.floor(CONTENT_WIDTH_TWIPS / colCount));

  // Ensure sum matches CONTENT_WIDTH_TWIPS cleanly
  const widthSum = colWidths.reduce((a, b) => a + b, 0);
  if (colWidths.length > 0 && widthSum !== CONTENT_WIDTH_TWIPS) {
    colWidths[colWidths.length - 1] += CONTENT_WIDTH_TWIPS - widthSum;
  }

  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: '334155',
  };

  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  const cellMargins = {
    top: 90,
    bottom: 90,
    left: 100,
    right: 100,
  };

  const [headerRow, ...bodyRows] = rows;
  const tableRows: TableRow[] = [];

  if (headerRow) {
    const normalizedHeader = Array.from({ length: colCount }, (_, idx) => headerRow[idx] ?? '');
    tableRows.push(
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: normalizedHeader.map(
          (cellText, idx) =>
            new TableCell({
              width: { size: colWidths[idx], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              verticalAlign: VerticalAlign.CENTER,
              shading: {
                type: ShadingType.CLEAR,
                color: 'auto',
                fill: 'E2E8F0',
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 20, after: 20, line: 260 },
                  children: parseInlineRuns(cellText, {
                    bold: true,
                    size: 19, // 9.5pt
                    color: '0F172A',
                  }),
                }),
              ],
            })
        ),
      })
    );
  }

  bodyRows.forEach((row, rIdx) => {
    const normalizedCells = Array.from({ length: colCount }, (_, idx) => row[idx] ?? '');
    const isEven = rIdx % 2 === 1;
    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: normalizedCells.map((cellText, idx) => {
          const isCentered = colCount === 7 && (idx === 0 || idx === 4 || idx === 5);
          return new TableCell({
            width: { size: colWidths[idx], type: WidthType.DXA },
            borders: cellBorders,
            margins: cellMargins,
            verticalAlign: VerticalAlign.TOP,
            shading: isEven
              ? {
                  type: ShadingType.CLEAR,
                  color: 'auto',
                  fill: 'F8FAFC',
                }
              : undefined,
            children: [
              new Paragraph({
                alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
                spacing: { before: 20, after: 20, line: 276 },
                children: parseInlineRuns(cellText, {
                  size: 19, // 9.5pt
                  color: '1E293B',
                }),
              }),
            ],
          });
        }),
      })
    );
  });

  return new Table({
    width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: colWidths,
    layout: TableLayoutType.FIXED,
    rows: tableRows,
  });
}

function buildBacaanBox(lines: string[]): Table {
  const boxBorder = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: '94A3B8',
  };

  return new Table({
    width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH_TWIPS],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
            borders: {
              top: boxBorder,
              bottom: boxBorder,
              left: { style: BorderStyle.SINGLE, size: 18, color: '1E40AF' },
              right: boxBorder,
            },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            shading: {
              type: ShadingType.CLEAR,
              color: 'auto',
              fill: 'F8FAFC',
            },
            children: lines.map((line, idx) => {
              const isTitle = /^Judul\s*:/i.test(line);
              return new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: {
                  before: idx === 0 ? 0 : 60,
                  after: idx === lines.length - 1 ? 0 : 60,
                  line: 300,
                },
                children: parseInlineRuns(line, {
                  bold: isTitle,
                  size: 21, // 10.5pt
                  color: '1E293B',
                }),
              });
            }),
          }),
        ],
      }),
    ],
  });
}

function buildKopBox(lines: string[]): Table {
  return new Table({
    width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH_TWIPS],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
              bottom: { style: BorderStyle.DOUBLE, size: 12, color: '000000' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            margins: { top: 120, bottom: 120, left: 60, right: 60 },
            children: lines.map(
              (line) =>
                new Paragraph({
                  spacing: { before: 20, after: 20, line: 280 },
                  children: parseInlineRuns(line, {
                    bold: true,
                    size: 22,
                    color: '000000',
                  }),
                })
            ),
          }),
        ],
      }),
    ],
  });
}

export async function exportExamToDocx(
  markdownContent: string,
  mataPelajaran: string,
  kelas: string
): Promise<void> {
  const children: Array<Paragraph | Table> = [];
  const lines = markdownContent.split('\n');

  let inTable = false;
  let tableRows: string[][] = [];
  let inKop = false;
  let kopBuffer: string[] = [];
  let inBacaan = false;
  let bacaanBuffer: string[] = [];
  let hasPrintedContent = false;

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      children.push(buildDocxTable(tableRows));
      children.push(new Paragraph({ spacing: { before: 0, after: 120 } }));
    }
    tableRows = [];
    inTable = false;
  };

  const flushBacaan = () => {
    if (inBacaan && bacaanBuffer.length > 0) {
      children.push(buildBacaanBox(bacaanBuffer));
      children.push(new Paragraph({ spacing: { before: 0, after: 100 } }));
    }
    bacaanBuffer = [];
    inBacaan = false;
  };

  const flushKop = () => {
    if (kopBuffer.length > 0) {
      children.push(buildKopBox(kopBuffer));
      children.push(new Paragraph({ spacing: { before: 0, after: 120 } }));
    }
    kopBuffer = [];
    inKop = false;
  };

  for (const rawLine of lines) {
    const processedLine = rawLine.trim();

    // KOP border lines (10+ dashes)
    if (/^-{10,}$/.test(processedLine)) {
      flushTable();
      flushBacaan();
      if (!inKop) {
        inKop = true;
        kopBuffer = [];
      } else {
        flushKop();
      }
      hasPrintedContent = true;
      continue;
    }

    if (inKop) {
      if (processedLine) {
        kopBuffer.push(processedLine);
      }
      continue;
    }

    // Markdown Table Rows
    if (isTableLine(processedLine, inTable)) {
      flushBacaan();
      inTable = true;
      if (isSeparatorRow(processedLine)) {
        continue;
      }
      tableRows.push(parseTableCells(processedLine));
      hasPrintedContent = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Major Section Headings (=== ... ===)
    if (processedLine.startsWith('=== ') && processedLine.endsWith(' ===')) {
      flushBacaan();
      const title = processedLine.replace(/^===\s*/, '').replace(/\s*===$/, '');
      children.push(
        new Paragraph({
          pageBreakBefore: hasPrintedContent,
          alignment: AlignmentType.CENTER,
          spacing: { before: hasPrintedContent ? 0 : 80, after: 160 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: '1E293B',
              space: 4,
            },
          },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              font: 'Times New Roman',
              bold: true,
              size: 25, // 12.5pt
              color: '0F172A',
            }),
          ],
        })
      );
      hasPrintedContent = true;
      continue;
    }

    // Reading Passage Intro ("Bacalah teks/cerita/dialog berikut...")
    if (/^Bacalah\s+(teks|cerita|bacaan|dialog|puisi|paragraf|wacana)/i.test(processedLine)) {
      flushBacaan();
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 80 },
          children: parseInlineRuns(processedLine, {
            bold: true,
            italics: true,
            size: 22,
          }),
        })
      );
      inBacaan = true;
      hasPrintedContent = true;
      continue;
    }

    if (inBacaan) {
      if (/^[0-9]+\.\s+/.test(processedLine) || /^(I|II|III|IV)\.\s+/.test(processedLine)) {
        flushBacaan();
      } else {
        if (processedLine !== '') {
          bacaanBuffer.push(processedLine);
        }
        continue;
      }
    }

    if (processedLine === '') {
      continue;
    }

    if (processedLine === '---' || processedLine === '***') {
      continue;
    }

    if (processedLine.startsWith('#')) {
      const headingText = processedLine.replace(/^#+\s*/, '');
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: parseInlineRuns(headingText, { bold: true, size: 24 }),
        })
      );
    } else if (/^(I|II|III|IV)\.\s+/.test(processedLine)) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: processedLine.replace(/\*\*/g, ''),
              font: 'Times New Roman',
              bold: true,
              underline: {},
              size: 23, // 11.5pt
              color: '0F172A',
            }),
          ],
        })
      );
    } else if (/^Petunjuk:/i.test(processedLine)) {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 100 },
          children: parseInlineRuns(processedLine, {
            italics: true,
            size: 21,
            color: '334155',
          }),
        })
      );
    } else if (/^[0-9]+\.\s*/.test(processedLine)) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 120, after: 40, line: 300 },
          children: parseInlineRuns(processedLine, { size: 22 }),
        })
      );
    } else if (/^[A-D]\.\s*/.test(processedLine)) {
      children.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 20, after: 20, line: 280 },
          children: parseInlineRuns(processedLine, { size: 22 }),
        })
      );
    } else if (/^[-*]\s+/.test(processedLine)) {
      children.push(
        new Paragraph({
          indent: { left: 320, hanging: 180 },
          spacing: { before: 30, after: 30, line: 280 },
          children: parseInlineRuns(`•  ${processedLine.replace(/^[-*]\s+/, '')}`, {
            size: 22,
          }),
        })
      );
    } else if (
      processedLine.toUpperCase() === processedLine &&
      processedLine.length > 5 &&
      !processedLine.includes('|')
    ) {
      children.push(
        new Paragraph({
          spacing: { before: 180, after: 80 },
          children: parseInlineRuns(processedLine, {
            bold: true,
            size: 23,
            color: '0F172A',
          }),
        })
      );
    } else {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 40, after: 60, line: 300 },
          children: parseInlineRuns(processedLine, { size: 22 }),
        })
      );
    }

    hasPrintedContent = true;
  }

  flushTable();
  flushBacaan();
  if (inKop) {
    flushKop();
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_TWIPS,
              height: PAGE_HEIGHT_TWIPS,
            },
            margin: {
              top: PAGE_MARGIN_TWIPS,
              bottom: PAGE_MARGIN_TWIPS,
              left: PAGE_MARGIN_TWIPS,
              right: PAGE_MARGIN_TWIPS,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeMapel = (mataPelajaran || 'Paket').replace(/[^a-zA-Z0-9_-]+/g, '_');
  link.href = url;
  link.download = `Soal_${safeMapel}_Kelas${kelas}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

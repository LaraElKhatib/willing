import { vi } from 'vitest';

export type PdfParseInstance = {
  getInfo: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const pdfParseState = vi.hoisted(() => {
  const instances: PdfParseInstance[] = [];
  let nextPageCount = 2;

  const PDFParse = vi.fn(() => {
    const instance: PdfParseInstance = {
      getInfo: vi.fn().mockImplementation(async () => ({ total: nextPageCount })),
      destroy: vi.fn().mockResolvedValue(undefined),
    };
    instances.push(instance);
    return instance;
  });

  const setNextPdfPageCount = (value: number) => {
    nextPageCount = value;
  };

  return { instances, PDFParse, setNextPdfPageCount };
});

vi.mock('pdf-parse', () => ({
  PDFParse: pdfParseState.PDFParse,
}));

export const pdfParseMock = pdfParseState.PDFParse;
export const pdfParseInstances = pdfParseState.instances;
export const setNextPdfPageCount = pdfParseState.setNextPdfPageCount;

export const resetPdfParseMocks = () => {
  pdfParseMock.mockClear();
  pdfParseInstances.splice(0, pdfParseInstances.length);
};

import { ImageUp, RotateCcw, Save, Signature, Trash2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import SignatureCanvas from 'react-signature-canvas';

type SignatureUploadFieldProps = {
  busy: boolean;
  disabled?: boolean;
  hasSignature: boolean;
  previewUrl?: string | null;
  emptyMessage: string;
  uploadLabel?: string;
  drawLabel?: string;
  fileNamePrefix?: string;
  onUploadFile: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  onError?: (message: string) => void;
};

function SignatureUploadField({
  busy,
  disabled = false,
  hasSignature,
  previewUrl = null,
  emptyMessage,
  uploadLabel = 'Upload Signature',
  drawLabel = 'Draw Signature',
  fileNamePrefix = 'signature-drawn',
  onUploadFile,
  onDelete,
  onError,
}: SignatureUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<SignatureCanvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUploadFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const clearDrawnSignature = () => {
    canvasRef.current?.clear();
    setHasDrawnSignature(false);
  };

  const getNonTransparentBounds = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    const { width, height } = canvas;
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    let top = height;
    let left = width;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha === 0) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }

    if (right < left || bottom < top) return null;

    const padding = 8;
    return {
      left: Math.max(0, left - padding),
      top: Math.max(0, top - padding),
      right: Math.min(width - 1, right + padding),
      bottom: Math.min(height - 1, bottom + padding),
    };
  };

  const saveDrawnSignature = async () => {
    const sourceCanvas = canvasRef.current?.getCanvas();
    if (!sourceCanvas || canvasRef.current?.isEmpty()) {
      onError?.('Please draw a signature first.');
      return;
    }

    const bounds = getNonTransparentBounds(sourceCanvas);
    if (!bounds) {
      onError?.('Failed to capture drawn signature.');
      return;
    }

    const exportWidth = bounds.right - bounds.left + 1;
    const exportHeight = bounds.bottom - bounds.top + 1;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportContext = exportCanvas.getContext('2d');
    if (!exportContext) {
      onError?.('Failed to prepare drawn signature.');
      return;
    }

    exportContext.fillStyle = '#ffffff';
    exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportContext.drawImage(
      sourceCanvas,
      bounds.left,
      bounds.top,
      exportWidth,
      exportHeight,
      0,
      0,
      exportWidth,
      exportHeight,
    );

    const signatureBlob = await new Promise<Blob | null>((resolve) => {
      exportCanvas.toBlob(blob => resolve(blob), 'image/png');
    });

    if (!signatureBlob) {
      onError?.('Failed to capture drawn signature.');
      return;
    }

    const signatureFile = new File([signatureBlob], `${fileNamePrefix}-${Date.now()}.png`, {
      type: 'image/png',
    });

    await onUploadFile(signatureFile);
    clearDrawnSignature();
    setIsDrawing(false);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,.svg"
        className="hidden"
        onChange={(event) => { void onUpload(event); }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={busy || disabled}
        >
          <ImageUp size={14} />
          {busy ? 'Uploading...' : uploadLabel}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm gap-2"
          onClick={() => setIsDrawing(value => !value)}
          disabled={busy || disabled}
        >
          <Signature size={14} />
          {isDrawing ? 'Hide Draw Pad' : drawLabel}
        </button>
        {hasSignature && onDelete && (
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm gap-2"
            onClick={() => { void onDelete(); }}
            disabled={busy || disabled}
          >
            <Trash2 size={14} />
            Remove Signature
          </button>
        )}
      </div>

      {isDrawing && (
        <div className="space-y-2 rounded-box border border-base-300 p-3 mt-3">
          <div className="rounded-box border border-base-300 bg-white overflow-hidden">
            <SignatureCanvas
              ref={canvasRef}
              penColor="#111827"
              canvasProps={{
                className: 'w-[440px] max-w-full h-52',
                style: { touchAction: 'none' },
              }}
              onBegin={() => setHasDrawnSignature(true)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm gap-2"
              onClick={clearDrawnSignature}
              disabled={busy || disabled || !hasDrawnSignature}
            >
              <RotateCcw size={14} />
              Clear
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-2"
              onClick={() => { void saveDrawnSignature(); }}
              disabled={busy || disabled || !hasDrawnSignature}
            >
              <Save size={14} />
              Save Drawn Signature
            </button>
          </div>
        </div>
      )}

      {previewUrl
        ? (
            <div className="mt-3 rounded-box border border-base-300 p-2 bg-white">
              <img
                src={previewUrl}
                alt="Signature preview"
                className="h-14 w-auto object-contain"
              />
            </div>
          )
        : (
            <p className="text-xs text-warning mt-2">
              {emptyMessage}
            </p>
          )}
    </div>
  );
}

export default SignatureUploadField;

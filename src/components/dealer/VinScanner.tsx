import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

/**
 * Cross-platform VIN scanner (works on iOS Safari + Android, unlike the
 * BarcodeDetector API which isn't available on iOS).
 *
 * - Live camera scan via ZXing (Code 39 / Code 128 / Data Matrix / QR / PDF417 —
 *   the formats used on windshield + door-jamb VIN labels).
 * - "Take a photo" capture fallback that decodes a still image.
 *
 * Only the decoded VIN string is surfaced via onDetected; no image leaves the
 * device.
 */
function makeReader(): BrowserMultiFormatReader {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.PDF_417,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints);
}

// VIN = exactly 17 chars, excluding I/O/Q. Pull it out of a noisier scan.
function extractVin(raw: string): string | null {
  const up = (raw || "").toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  const m = up.match(/[A-HJ-NPR-Z0-9]{17}/);
  return m ? m[0] : null;
}

export default function VinScanner({
  open, onOpenChange, onDetected,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDetected: (vin: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = (vin: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { controlsRef.current?.stop(); } catch { /* noop */ }
    onDetected(vin);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    doneRef.current = false;
    setError("");
    const reader = makeReader();
    readerRef.current = reader;
    let cancelled = false;

    const onResult = (result: any) => {
      if (!result) return;
      const vin = extractVin(result.getText());
      if (vin) finish(vin);
    };

    (async () => {
      try {
        let controls: IScannerControls;
        // Prefer the REAR camera. On phones, the default device is usually the
        // front/selfie cam, which can't see the VIN — force facingMode first.
        try {
          controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
            videoRef.current!,
            onResult,
          );
        } catch {
          // Fallback: explicitly pick a back-facing device by label.
          let deviceId: string | undefined;
          try {
            const devices = await BrowserMultiFormatReader.listVideoInputDevices();
            const back = devices.find((d) => /back|rear|environment/i.test(d.label));
            deviceId = (back ?? devices[devices.length - 1])?.deviceId;
          } catch { /* no enumerate */ }
          controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current!, onResult);
        }
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch {
        setError("Camera unavailable. Allow camera access, use “Take a photo” below, or type the VIN.");
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* noop */ }
      controlsRef.current = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPhoto = async (file: File) => {
    setBusy(true);
    setError("");
    const url = URL.createObjectURL(file);
    try {
      const reader = readerRef.current ?? makeReader();
      const result = await reader.decodeFromImageUrl(url);
      const vin = extractVin(result.getText());
      if (vin) finish(vin);
      else setError("No VIN barcode found in that photo. Try again or type it in.");
    } catch {
      setError("Couldn’t read a barcode from that photo. Try again or type it in.");
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan VIN</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
            <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 h-16 rounded border-2 border-white/70" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Point the camera at the VIN barcode (windshield or driver door jamb).
          </p>
          {error && <p className="text-center text-xs text-destructive">{error}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }}
          />
          <Button variant="outline" className="w-full gap-2" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Take a photo instead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

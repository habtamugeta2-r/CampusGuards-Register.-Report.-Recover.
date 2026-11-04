import QRCode from 'qrcode';

/** PNG data URL for a QR label. Generated server-side so no client JS is needed. */
export async function qrPngDataUrl(text: string, size = 256, margin = 1): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel: 'M',
    color: { dark: '#0b1220', light: '#ffffff' },
  });
}

/** SVG markup (crisper when printed on a label printer). */
export async function qrSvg(text: string, margin = 1): Promise<string> {
  return QRCode.toString(text, { type: 'svg', margin, errorCorrectionLevel: 'M' });
}

export function maskSerial(serial: string | null | undefined): string | null {
  if (!serial) return null;
  const clean = serial.trim();
  if (clean.length <= 4) return clean;
  return `••••${clean.slice(-4)}`;
}

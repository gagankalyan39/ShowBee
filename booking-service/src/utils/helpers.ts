// ============================================================
// SHOWBEE UTILITIES & QR CODE GENERATOR
// Member 3 (Backend) + Member 1 (Frontend Ticket QR Integration)
// ============================================================
import QRCode from 'qrcode';

export function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'SB-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export async function generateQR(data: string | object): Promise<string> {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  try {
    const qrDataUrl = await QRCode.toDataURL(content, {
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 256,
    });
    return qrDataUrl;
  } catch (err: any) {
    console.error('QR code generation error:', err);
    return '';
  }
}

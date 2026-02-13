import { AD_CONFIG } from './constants';

export async function processImage(file: File): Promise<Blob> {
  if (!AD_CONFIG.ACCEPTED_TYPES.includes(file.type)) throw new Error('Fel filtyp');
  if (file.size > AD_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) throw new Error('För stor fil');

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      // Lite aggressivare nedskalning för bättre leverans (prestanda)
      const maxDim = 1600;

      if (width > maxDim || height > maxDim) {
        const ratio = width / height;
        if (ratio > 1) {
          width = maxDim;
          height = maxDim / ratio;
        } else {
          height = maxDim;
          width = maxDim * ratio;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      // Sänk kvaliteten något (0.75) för mindre filstorlek utan märkbar kvalitetsförlust
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.75);
    };
    img.onerror = reject;
  });
}
// Receipt photos: shrink in the browser before saving.
// A phone photo (4–8 MB) becomes a ~150–500 KB JPEG, small enough to live in a Firestore doc.

const MAX_CHARS = 900_000; // Firestore docs max out at ~1 MB; stay under it

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image. Try a JPG or PNG.'));
    };
    img.src = url;
  });
}

function drawScaled(img, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** Returns { full, thumb } as JPEG data URLs. */
export async function prepareReceiptPhoto(file) {
  const img = await loadImage(file);
  const thumb = drawScaled(img, 220).toDataURL('image/jpeg', 0.6);
  for (const dim of [1600, 1280, 1024, 800]) {
    const canvas = drawScaled(img, dim);
    for (const q of [0.8, 0.7, 0.6, 0.5]) {
      const full = canvas.toDataURL('image/jpeg', q);
      if (full.length <= MAX_CHARS) return { full, thumb };
    }
  }
  throw new Error('That photo is too big even after shrinking. Try cropping it.');
}

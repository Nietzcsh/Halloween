import { toBlob } from 'html-to-image';

/** Turn a receipt card into a PNG and open the phone's share sheet (Messenger/GC), or download it. */
export async function saveNodeAsImage(node, filename) {
  const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#1a1426', skipFonts: true });
  if (!blob) throw new Error('Could not create the image');
  const safeName = filename.replace(/[^\w.-]+/g, '_');
  const file = new File([blob], safeName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: safeName });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Copy this link:', text);
    return false;
  }
}

// Fetches a CSV export from the backend and saves it as a file. Uses fetch (not a plain <a href>)
// because the auth bearer token is attached by App.js's window.fetch patch, not available to a
// browser-native navigation.
export async function downloadCsvExport(url, fallbackFilename) {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch (err) { /* response wasn't JSON — keep the generic message */ }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackFilename;

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

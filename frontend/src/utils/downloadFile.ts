import { api } from '../services/api';

/**
 * Triggers a browser file download from a blob API response.
 * Builds a query string from params, calls api.get with responseType:'blob',
 * creates an object URL, and clicks a temporary <a> element to download.
 */
export async function downloadFile(
  url: string,
  filename: string,
  params?: Record<string, unknown>
): Promise<void> {
  // Strip empty/undefined/null values from params
  const cleanParams: Record<string, unknown> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value;
      }
    }
  }

  const response = await api.get(url, {
    params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: response.headers['content-type'] ?? 'application/octet-stream',
  });

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

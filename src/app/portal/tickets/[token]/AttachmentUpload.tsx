"use client";
import { useState, useRef } from "react";

interface Attachment {
  id: string;
  filename: string;
  driveUrl: string;
  size: number;
  mimeType: string;
}

export function AttachmentUpload({ token, initialAttachments }: { token: string; initialAttachments: Attachment[] }) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/portal/tickets/${token}/attachments`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      setAttachments(prev => [...prev, data.data]);
      if (inputRef.current) inputRef.current.value = "";
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Upload fehlgeschlagen");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">Anhänge</h3>

      {attachments.length > 0 && (
        <ul className="space-y-2 mb-4">
          {attachments.map(a => (
            <li key={a.id} className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">📎</span>
              <a href={a.driveUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate flex-1">{a.filename}</a>
              <span className="text-xs text-gray-400 shrink-0">{formatSize(a.size)}</span>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <span>📤</span>
          <span>{uploading ? "Wird hochgeladen…" : "Datei anhängen"}</span>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <p className="text-xs text-gray-400 mt-1">Max. 10 MB</p>
      </div>
    </div>
  );
}

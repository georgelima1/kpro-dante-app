import React, { useMemo, useRef, useState } from "react";

export default function FIRImportModal({
  open,
  onClose,
  onImport
}: {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const canImport = useMemo(() => !!file && !sending, [file, sending]);

  if (!open) return null;

  async function handleImport() {
    if (!file) return;
    try {
      setSending(true);
      await onImport(file);
      setFile(null);
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-smx-line bg-smx-panel shadow-2xl overflow-hidden">
        <div className="px-4 py-4 border-b border-smx-line flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-white text-xl">⤓</div>
            <div className="text-xl font-semibold text-smx-text">Import FIR Filter</div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFile(null);
              onClose();
            }}
            className="w-10 h-10 rounded-2xl border border-smx-line bg-smx-panel2 text-white hover:border-smx-red/30 transition"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-xl border border-smx-line bg-smx-panel2 px-4 py-4 text-left hover:border-smx-red/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="text-lg text-smx-muted">📎</div>
              <div className="text-sm text-smx-muted">
                {file ? file.name : "Select file with fir coefficients (*.csv or *.txt)"}
              </div>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,text/plain,text/csv"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              setFile(next);
            }}
          />

          <div className="text-sm md:text-xs text-smx-muted leading-5">
            The file must contain 1 filter coefficient per line. Maximum of 512
            coefficients. Sample rate @ 48 kHz.
          </div>
        </div>

        <div className="px-4 py-4 border-t border-smx-line flex justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setFile(null);
              onClose();
            }}
            className="px-5 flex-1 py-3 text-sm font-semibold rounded-2xl transition border text-smx-text hover:bg-white/5 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className={`px-5 flex-1 py-3 text-sm font-semibold rounded-2xl transition border text-smx-text ${
              canImport
                ? "bg-smx-red border-smx-red/40 text-white hover:bg-red-500"
                : "bg-white/20 border-white/20 text-white/40 cursor-not-allowed"
            }`}
          >
            {sending ? "Importing..." : (canImport ? "Import ✔" : "Import")}
          </button>
        </div>
      </div>
    </div>
  );
}
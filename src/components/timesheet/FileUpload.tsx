"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
const MAX_SIZE = 10 * 1024 * 1024;

interface FileUploadProps {
  tenantId: string;
  timesheetId: string;
  currentFileName: string | null;
  currentFileUrl: string | null;
  currentFileSize: number | null;
  disabled?: boolean;
  onUploadComplete: (data: {
    uploadedFileName: string;
    uploadedFileUrl: string;
    uploadedFileSize: number;
    uploadedFileMimeType: string;
  }) => void;
}

export default function FileUpload({
  tenantId,
  timesheetId,
  currentFileName,
  currentFileUrl,
  currentFileSize,
  disabled = false,
  onUploadComplete,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("File type not allowed. Accepted: PDF, JPG, PNG, DOC, DOCX");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File exceeds 10MB limit");
        return;
      }

      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(
          `/api/tenant/${tenantId}/timesheets/${timesheetId}/upload`,
          { method: "POST", body: form }
        );
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Upload failed"); return; }
        onUploadComplete({
          uploadedFileName: data.timesheet.uploadedFileName,
          uploadedFileUrl: data.timesheet.uploadedFileUrl,
          uploadedFileSize: data.timesheet.uploadedFileSize,
          uploadedFileMimeType: data.timesheet.uploadedFileMimeType,
        });
      } catch {
        setError("Upload failed — please try again");
      } finally {
        setUploading(false);
      }
    },
    [tenantId, timesheetId, onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (currentFileName && currentFileUrl) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={currentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline truncate block"
            >
              {currentFileName}
            </a>
            {currentFileSize && (
              <p className="text-xs text-muted-foreground">{formatSize(currentFileSize)}</p>
            )}
          </div>
          {!disabled && (
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 size={14} className="animate-spin mr-1" /> Uploading</> : "Replace"}
            </Button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={onInputChange} className="hidden" />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all
          ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50"}
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Upload size={20} />
            </div>
            <p className="text-sm font-medium text-foreground">
              Drag & drop or <span className="text-primary">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC, DOCX — Max 10MB</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={onInputChange} className="hidden" />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

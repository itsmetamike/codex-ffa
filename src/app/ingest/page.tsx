"use client";

import { useState, useEffect } from "react";

type DocType = 
  | "MMM_RESULT"
  | "BRAND_SAFETY_GUIDELINES"
  | "BRAND_KIT"
  | "PERSONA"
  | "CREATIVE_BEST_PRACTICES";

interface FileMetadata {
  id: string;
  status: string;
  createdAt: number;
  metadata: Record<string, string>;
}

export default function IngestPage() {
  const [brand, setBrand] = useState("DemoCo");
  const [docType, setDocType] = useState<DocType>("BRAND_KIT");
  const [title, setTitle] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    if (!brand) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/vectorstore/list?brand=${encodeURIComponent(brand)}`);
      const data = await response.json();
      
      if (response.ok) {
        setUploadedFiles(data.files || []);
      } else {
        console.error("Failed to load files:", data.error);
      }
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!files || files.length === 0) {
      setMessage({ type: "error", text: "Please select at least one file" });
      return;
    }

    // Validate file sizes (5MB max per file)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    const oversizedFiles: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        oversizedFiles.push(`${files[i].name} (${(files[i].size / 1024 / 1024).toFixed(2)}MB)`);
      }
    }

    if (oversizedFiles.length > 0) {
      setMessage({ 
        type: "error", 
        text: `The following files exceed the 5MB limit: ${oversizedFiles.join(", ")}. Please select smaller files.` 
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("brand", brand);
      formData.append("doc_type", docType);
      if (title) formData.append("title", title);
      if (effectiveDate) formData.append("effective_date", effectiveDate);

      // Append all files
      for (let i = 0; i < files.length; i++) {
        formData.append(`file${i}`, files[i]);
      }

      const response = await fetch("/api/vectorstore/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: "success", 
          text: `Successfully uploaded ${data.filesUploaded} file(s) to vector store ${data.storeId}` 
        });
        // Reset form
        setTitle("");
        setEffectiveDate("");
        setFiles(null);
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        // Reload files list
        await loadFiles();
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "An error occurred during upload" 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Step 1</p>
        <h1 className="text-3xl font-semibold text-slate-100">Document Ingestion</h1>
        <p className="text-slate-300">
          Upload your brand, performance, and safety documents to seed the vector
          store. Metadata such as doc type, brand, tags, and effective dates ensure
          precise retrieval downstream.
        </p>
      </header>

      {/* Upload Form */}
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Upload Documents</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Brand */}
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-slate-300 mb-2">
              Brand *
            </label>
            <input
              type="text"
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., DemoCo"
            />
          </div>

          {/* Document Type */}
          <div>
            <label htmlFor="doc-type" className="block text-sm font-medium text-slate-300 mb-2">
              Document Type *
            </label>
            <select
              id="doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="MMM_RESULT">MMM Result</option>
              <option value="BRAND_SAFETY_GUIDELINES">Brand Safety Guidelines</option>
              <option value="BRAND_KIT">Brand Kit</option>
              <option value="PERSONA">Persona</option>
              <option value="CREATIVE_BEST_PRACTICES">Creative Best Practices</option>
            </select>
          </div>

          {/* Title (Optional) */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Title (Optional)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Q4 2024 Brand Guidelines"
            />
          </div>

          {/* Effective Date (Optional) */}
          <div>
            <label htmlFor="effective-date" className="block text-sm font-medium text-slate-300 mb-2">
              Effective Date (Optional)
            </label>
            <input
              type="date"
              id="effective-date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* File Upload */}
          <div>
            <label htmlFor="file-input" className="block text-sm font-medium text-slate-300 mb-2">
              Files (Multiple formats supported) *
            </label>
            <input
              type="file"
              id="file-input"
              accept=".pdf,.txt,.doc,.docx,.csv,.json,.xml,.html,.md,.rtf,.xls,.xlsx,.ppt,.pptx"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 focus:outline-none"
            />
            {files && files.length > 0 && (
              <p className="mt-2 text-sm text-slate-400">
                {files.length} file(s) selected
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Supported formats: PDF, TXT, DOC, DOCX, CSV, JSON, XML, HTML, MD, RTF, XLS, XLSX, PPT, PPTX
              <br />
              Maximum file size: 5MB per file
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading..." : "Upload to Vector Store"}
          </button>
        </form>

        {/* Message Display */}
        {message && (
          <div
            className={`mt-4 rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-900/30 border border-green-700 text-green-300"
                : "bg-red-900/30 border border-red-700 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}
      </section>

      {/* Uploaded Files List */}
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          Uploaded Files for {brand}
        </h2>
        
        {loading ? (
          <p className="text-slate-400">Loading files...</p>
        ) : uploadedFiles.length === 0 ? (
          <p className="text-slate-400">No files uploaded yet.</p>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-100">
              Uploaded Files for {brand}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">File Name</th>
                    <th className="px-4 py-3">File ID</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Effective Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFiles.map((file: any) => (
                    <tr
                      key={file.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {file.metadata.title || "Untitled"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {file.id}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {file.size ? `${(file.size / 1024).toFixed(2)} KB` : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {file.metadata.doc_type}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {file.metadata.brand}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {file.metadata.title}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {file.metadata.effective_date || "—" }
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            file.status === "completed"
                              ? "bg-green-900/30 text-green-300"
                              : file.status === "failed"
                              ? "bg-red-900/30 text-red-300"
                              : "bg-yellow-900/30 text-yellow-300"
                          }`}
                        >
                          {file.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(file.createdAt * 1000).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Database, Upload, FileText, ChevronLeft } from "lucide-react";

type DocType = 
  // Brand & Identity
  | "BRAND_VOICE"
  | "BRAND_KIT"
  | "BRAND_GUIDELINES"
  | "BRAND_SAFETY_GUIDELINES"
  | "VISUAL_IDENTITY"
  | "TONE_OF_VOICE"
  // Audience & Personas
  | "PERSONA"
  | "AUDIENCE_INSIGHTS"
  | "CUSTOMER_RESEARCH"
  | "SEGMENTATION_STUDY"
  // Performance & Analytics
  | "MMM_RESULT"
  | "CAMPAIGN_PERFORMANCE"
  | "ATTRIBUTION_ANALYSIS"
  | "MARKET_RESEARCH"
  | "COMPETITIVE_ANALYSIS"
  // Creative & Content
  | "CREATIVE_BEST_PRACTICES"
  | "CREATIVE_LESSONS"
  | "CONTENT_STRATEGY"
  | "MESSAGING_FRAMEWORK"
  | "CAMPAIGN_BRIEF"
  // Strategy & Planning
  | "MARKETING_STRATEGY"
  | "CHANNEL_STRATEGY"
  | "MEDIA_PLAN"
  | "BUDGET_ALLOCATION"
  // Other
  | "PRODUCT_INFO"
  | "CASE_STUDY"
  | "OTHER";

interface FileMetadata {
  id: string;
  status: string;
  createdAt: number;
  metadata: Record<string, string>;
}

export default function KnowledgeHubPage() {
  const router = useRouter();
  const [brand, setBrand] = useState("DemoCo");
  const [docType, setDocType] = useState<DocType>("BRAND_VOICE");
  const [title, setTitle] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState(false);

  const loadFiles = async () => {
    if (!brand) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge-hub/list?brand=${encodeURIComponent(brand)}`);
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

      const response = await fetch("/api/knowledge-hub/upload", {
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

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-hub/delete?fileId=${fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "File deleted successfully" });
        loadFiles(); // Reload the list
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to delete file" });
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "An error occurred during deletion" 
      });
    }
  };

  const handleDeleteAllBrand = async () => {
    if (!brand) return;
    
    if (!confirm(`Are you sure you want to delete ALL files and data for brand "${brand}"? This will delete:\n\n- All uploaded files from OpenAI\n- The vector store\n- All database records\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingBrand(true);
    try {
      const response = await fetch(`/api/knowledge-hub/delete-brand?brand=${encodeURIComponent(brand)}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: "success", 
          text: `Successfully deleted ${data.deletedFiles} files for brand "${brand}"` 
        });
        setUploadedFiles([]);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete brand files" });
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "An error occurred during deletion" 
      });
    } finally {
      setDeletingBrand(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-16">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-400 transition-colors hover:text-[#EDCF98]"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDCF98]/10">
            <Database className="h-6 w-6 text-[#EDCF98]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Knowledge Hub</h1>
            <p className="text-slate-400 mt-1">
              Centralized document repository for all your brand intelligence
            </p>
          </div>
        </div>
        
        <p className="text-slate-300 leading-relaxed">
          Upload and manage your brand documents, performance data, and safety guidelines. 
          This knowledge base can be accessed by multiple agentic workflows throughout the platform.
        </p>
      </div>

      {/* Upload Form */}
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="h-5 w-5 text-[#EDCF98]" />
          <h2 className="text-xl font-semibold text-slate-100">Upload Documents</h2>
        </div>
        
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-[#EDCF98] focus:outline-none focus:ring-1 focus:ring-[#EDCF98]"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-[#EDCF98] focus:outline-none focus:ring-1 focus:ring-[#EDCF98]"
            >
              <optgroup label="Brand & Identity">
                <option value="BRAND_VOICE">Brand Voice</option>
                <option value="BRAND_KIT">Brand Kit</option>
                <option value="BRAND_GUIDELINES">Brand Guidelines</option>
                <option value="BRAND_SAFETY_GUIDELINES">Brand Safety Guidelines</option>
                <option value="VISUAL_IDENTITY">Visual Identity</option>
                <option value="TONE_OF_VOICE">Tone of Voice</option>
              </optgroup>
              <optgroup label="Audience & Personas">
                <option value="PERSONA">Persona</option>
                <option value="AUDIENCE_INSIGHTS">Audience Insights</option>
                <option value="CUSTOMER_RESEARCH">Customer Research</option>
                <option value="SEGMENTATION_STUDY">Segmentation Study</option>
              </optgroup>
              <optgroup label="Performance & Analytics">
                <option value="MMM_RESULT">MMM Result</option>
                <option value="CAMPAIGN_PERFORMANCE">Campaign Performance</option>
                <option value="ATTRIBUTION_ANALYSIS">Attribution Analysis</option>
                <option value="MARKET_RESEARCH">Market Research</option>
                <option value="COMPETITIVE_ANALYSIS">Competitive Analysis</option>
              </optgroup>
              <optgroup label="Creative & Content">
                <option value="CREATIVE_BEST_PRACTICES">Creative Best Practices</option>
                <option value="CREATIVE_LESSONS">Creative Lessons</option>
                <option value="CONTENT_STRATEGY">Content Strategy</option>
                <option value="MESSAGING_FRAMEWORK">Messaging Framework</option>
                <option value="CAMPAIGN_BRIEF">Campaign Brief</option>
              </optgroup>
              <optgroup label="Strategy & Planning">
                <option value="MARKETING_STRATEGY">Marketing Strategy</option>
                <option value="CHANNEL_STRATEGY">Channel Strategy</option>
                <option value="MEDIA_PLAN">Media Plan</option>
                <option value="BUDGET_ALLOCATION">Budget Allocation</option>
              </optgroup>
              <optgroup label="Other">
                <option value="PRODUCT_INFO">Product Information</option>
                <option value="CASE_STUDY">Case Study</option>
                <option value="OTHER">Other</option>
              </optgroup>
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-[#EDCF98] focus:outline-none focus:ring-1 focus:ring-[#EDCF98]"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 focus:border-[#EDCF98] focus:outline-none focus:ring-1 focus:ring-[#EDCF98]"
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
              accept=".pdf,.txt,.doc,.docx,.json,.html,.md,.pptx,.csv,.xls,.xlsx,.c,.cpp,.cs,.css,.go,.java,.js,.php,.py,.rb,.sh,.tex,.ts"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-[#EDCF98] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-[#EDCF98]/90 focus:outline-none"
            />
            {files && files.length > 0 && (
              <p className="mt-2 text-sm text-slate-400">
                {files.length} file(s) selected
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Supported formats: PDF, TXT, DOC, DOCX, JSON, HTML, MD, PPTX, CSV, XLS, XLSX, and code files (C, CPP, CS, CSS, GO, JAVA, JS, PHP, PY, RB, SH, TEX, TS)
              <br />
              CSV and Excel files are automatically converted to JSON
              <br />
              Maximum file size: 5MB per file
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full rounded-lg bg-[#EDCF98] px-4 py-3 font-semibold text-black hover:bg-[#EDCF98]/90 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading..." : "Upload to Knowledge Hub"}
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#EDCF98]" />
            <h2 className="text-xl font-semibold text-slate-100">
              Documents for {brand}
            </h2>
          </div>
          {uploadedFiles.length > 0 && (
            <button
              onClick={handleDeleteAllBrand}
              disabled={deletingBrand}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={`Delete all files for ${brand}`}
            >
              <Trash2 className="h-4 w-4" />
              {deletingBrand ? "Deleting..." : "Delete All"}
            </button>
          )}
        </div>
        
        {loading ? (
          <p className="text-slate-400">Loading files...</p>
        ) : uploadedFiles.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No files uploaded yet for this brand.</p>
            <p className="text-slate-500 text-sm mt-2">Upload documents above to get started.</p>
          </div>
        ) : (
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
                  <th className="px-4 py-3">Actions</th>
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

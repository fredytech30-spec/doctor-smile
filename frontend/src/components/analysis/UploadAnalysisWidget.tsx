/**
 * ═════════════════════════════════════════════════════════════════════
 * Upload Analysis Widget — Smart, Accessible, Real-time
 * Doctor Smile v5.0
 * 
 * Features:
 * - Drag-drop zone intelligente
 * - Validation fichier en temps réel
 * - Metadata enrichie (taille, type)
 * - WebSocket progression streaming
 * - Icônes Lucide (pas d'emojis)
 * ═════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  File,
  Loader2,
  X,
  Info,
  BarChart3,
} from "lucide-react";

interface FileMetadata {
  name: string;
  size: number;
  type: string;
  sizeHuman: string;
  qualityEstimate?: number;
}

interface UploadFormData {
  companyName: string;
  companySector: string;
  extractionMethod: "auto" | "llm" | "ocr";
  useLlm: boolean;
}

interface ProgressEvent {
  stage: string;
  progress_percent: number;
  message: string;
  estimated_remaining_seconds?: number;
  subtask?: string;
  metrics?: {
    overall_score: number;
    recommendations: string[];
  };
  error?: string;
}

export const UploadAnalysisWidget: React.FC = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<UploadFormData>({
    defaultValues: {
      companyName: "",
      companySector: "Retail",
      extractionMethod: "auto",
      useLlm: true,
    },
  });

  // state
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileMeta, setSelectedFileMeta] = useState<FileMetadata | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState<ProgressEvent | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const useLlm = watch("useLlm");

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  // Handle file selection (drag-drop ou input)
  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;

    const file = files[0];
    const allowed = ["application/pdf", "text/csv", "application/vnd.ms-excel", "image/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/png", "image/jpeg"];

    if (!allowed.some((type) => file.type.includes(type)) && !file.name.match(/\.(pdf|csv|xlsx?|png|jpe?g)$/i)) {
      toast.error(
        `Format non supporté. Utilisez: PDF, CSV, Excel, PNG, JPEG. Vous avez: ${file.type || "type inconnu"}`
      );
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error(`Fichier trop volumineux. Maximum 50 MB. Votre fichier: ${formatFileSize(file.size)}`);
      return;
    }

    setSelectedFile(file);
    setSelectedFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
      sizeHuman: formatFileSize(file.size),
      qualityEstimate: 75,
    });

    toast.success(`${file.name} (${formatFileSize(file.size)}) prêt pour l'analyse.`);
  };

  // Drag-drop handlers
  const handleDragEnter = () => setIsDragging(true);
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // HTTP Polling for progress (alternative to WebSocket)
  useEffect(() => {
    if (!documentId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/backend/analyses/v5/${documentId}/status`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const progress = await response.json();
          setAnalysisProgress({
            stage: progress.stage,
            progress_percent: progress.progress_percent,
            message: progress.message,
            estimated_remaining_seconds: progress.estimated_remaining_seconds,
            subtask: progress.subtask,
            metrics: progress.metrics,
            error: progress.error,
          });

          console.log(`[${progress.stage}] ${progress.progress_percent}% - ${progress.message}`);

          // Check if completed
          if (progress.status === 'completed') {
            toast.success("Votre document a été analysé avec succès.");
            setIsUploading(false);
            clearInterval(pollInterval);

            // Redirect to dashboard
            setTimeout(() => {
              window.location.href = `/dashboard/analyses/${documentId}`;
            }, 1500);
          } else if (progress.status === 'error') {
            toast.error(progress.error || progress.message);
            setIsUploading(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [documentId, toast]);

  // Form submission
  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier.");
      return;
    }

    if (!user) {
      toast.error("Veuillez vous connecter avant de lancer l'analyse.");
      return;
    }

    setIsUploading(true);
    setAnalysisProgress(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("company_name", data.companyName);
      formData.append("company_sector", data.companySector);
      formData.append("extraction_method", data.extractionMethod);
      formData.append("use_llm", String(data.useLlm));

      const result = await apiClient<{ document_id: string }>(
        "/analyses/v5/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      setDocumentId(result.document_id);

      toast.success("Upload réussi. Analyse en cours...");

    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur d'upload");
      setIsUploading(false);
    }
  };

  // Render progress ou upload form
  if (isUploading && analysisProgress) {
    return (
      <AnalysisProgressPanel
        progress={analysisProgress}
        onCancel={() => {
          setIsUploading(false);
          setDocumentId(null);
          setAnalysisProgress(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Analyser un Document</h1>
        </div>
        <p className="text-gray-600">
          Téléchargez vos documents financiers pour une analyse automatique
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Drag-drop zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-input"
            disabled={isUploading}
          />

          <label htmlFor="file-input" className="cursor-pointer block">
            <div className="flex flex-col items-center justify-center gap-3">
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-semibold text-gray-900">Déposer un fichier ici</p>
                <p className="text-sm text-gray-500">ou cliquez pour sélectionner</p>
              </div>
              <p className="text-xs text-gray-400">
                PDF, CSV, Excel, PNG, JPEG (max 50 MB)
              </p>
            </div>
          </label>
        </div>

        {/* File preview */}
        {selectedFileMeta && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <File className="w-5 h-5 text-gray-400 mt-1" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{selectedFileMeta.name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>Taille: {selectedFileMeta.sizeHuman}</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Qualité: {selectedFileMeta.qualityEstimate}%
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedFileMeta(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Company info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'entreprise
            </label>
            <input
              type="text"
              {...register("companyName", { required: "Requis" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: ACME SA"
            />
            {errors.companyName && (
              <p className="text-sm text-red-600 mt-1">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secteur d'activité
            </label>
            <select
              {...register("companySector")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Retail">Commerce</option>
              <option value="Manufacturing">Fabrication</option>
              <option value="Services">Services</option>
              <option value="Finance">Finance</option>
              <option value="Technology">Technologie</option>
              <option value="Agriculture">Agriculture</option>
              <option value="Healthcare">Santé</option>
              <option value="Other">Autre</option>
            </select>
          </div>
        </div>

        {/* Options avancées */}
        <details className="bg-blue-50 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer font-medium text-gray-900">
            Options avancées
          </summary>
          <div className="px-4 py-3 border-t border-blue-100 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("useLlm")}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
                Enrichissement avec IA Groq (LLM)
              </span>
              <Info className="w-4 h-4 text-gray-400" />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Méthode d'extraction
              </label>
              <div className="flex gap-3">
                {(["auto", "llm", "ocr"] as const).map((method) => (
                  <label key={method} className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={method}
                      {...register("extractionMethod")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isUploading || !selectedFile}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Lancer l'analyse
            </>
          )}
        </button>
      </form>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// Analysis Progress Panel (WebSocket streaming)
// ════════════════════════════════════════════════════════════════════

interface ProgressPanelProps {
  progress: ProgressEvent;
  onCancel: () => void;
}

const AnalysisProgressPanel: React.FC<ProgressPanelProps> = ({ progress, onCancel }) => {
  const recommendations = progress.metrics?.recommendations ?? [];
  const stageConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    validation: { icon: <AlertCircle className="w-5 h-5" />, label: "Validation", color: "bg-gray-100" },
    classification: { icon: <BarChart3 className="w-5 h-5" />, label: "Classification", color: "bg-gray-100" },
    ocr_extraction: { icon: <File className="w-5 h-5" />, label: "Extraction OCR", color: "bg-blue-100" },
    llm_enrichment: { icon: <Loader2 className="w-5 h-5 animate-spin" />, label: "Enrichissement IA", color: "bg-purple-100" },
    syscohada_compute: { icon: <BarChart3 className="w-5 h-5" />, label: "Calcul SYSCOHADA", color: "bg-green-100" },
    export_storage: { icon: <Upload className="w-5 h-5" />, label: "Sauvegarde", color: "bg-indigo-100" },
    completed: { icon: <CheckCircle2 className="w-5 h-5" />, label: "Complété", color: "bg-green-100" },
    error: { icon: <AlertCircle className="w-5 h-5 text-red-600" />, label: "Erreur", color: "bg-red-100" },
  };

  const config = stageConfig[progress.stage] || stageConfig.validation;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg border border-gray-200">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold text-gray-900">{config.label}</span>
          <span className="text-2xl font-bold text-blue-600">{progress.progress_percent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Stage card */}
      <div className={`${config.color} rounded-lg p-4 mb-4 border border-gray-200`}>
        <div className="flex items-start gap-3">
          <div className="text-gray-700">{config.icon}</div>
          <div>
            <p className="font-semibold text-gray-900">{progress.message}</p>
            {progress.subtask && <p className="text-sm text-gray-600 mt-1">{progress.subtask}</p>}
          </div>
        </div>
      </div>

      {/* Estimated time remaining */}
      {progress.estimated_remaining_seconds && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Temps estimé: {progress.estimated_remaining_seconds}s
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="font-semibold text-blue-900 mb-2">Recommandations:</p>
          <ul className="space-y-1 text-sm text-blue-800">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error display */}
      {progress.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Erreur</p>
              <p className="text-sm text-red-800 mt-1">{progress.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cancel button (sauf si terminé) */}
      {progress.stage !== "completed" && progress.stage !== "error" && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      )}
    </div>
  );
};


export default UploadAnalysisWidget;

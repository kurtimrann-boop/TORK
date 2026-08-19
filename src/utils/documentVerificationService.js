import { processDriverLicenseDocument } from "./ocrService.js";

/**
 * TORK Document Verification Service (Sprint 13)
 * 
 * Manages Driver's License (Ehliyet) uploads, MIME/magic byte validations,
 * private storage routing (no public URLs), state transitions, and operator manual review.
 */

export const DOCUMENT_VERIFICATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  VERIFIED: "verified",
  MANUAL_REVIEW: "manual_review",
  REJECTED: "rejected",
};

export const ALLOWED_MIME_TYPES = {
  "image/jpeg": { ext: "jpg", magicBytes: [0xff, 0xd8, 0xff] },
  "image/png": { ext: "png", magicBytes: [0x89, 0x50, 0x4e, 0x47] },
  "application/pdf": { ext: "pdf", magicBytes: [0x25, 0x50, 0x44, 0x46] },
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates document buffer, size, and header magic bytes.
 */
export function validateDocumentFile({ buffer, mimeType, sizeBytes, originalName }) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Dosya içeriği boş olamaz." };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES || buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "Dosya boyutu 10MB sınırını aşamaz." };
  }

  const mimeConfig = ALLOWED_MIME_TYPES[mimeType];
  if (!mimeConfig) {
    return {
      valid: false,
      error: "Desteklenmeyen dosya formatı. Yalnızca JPG, PNG ve PDF formatları kabul edilmektedir.",
    };
  }

  // Magic bytes check
  const magic = mimeConfig.magicBytes;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) {
      return {
        valid: false,
        error: "Dosya içeriği belirtilen MIME türü ile uyuşmuyor (Bozuk veya yanıltıcı dosya başlığı).",
      };
    }
  }

  return {
    valid: true,
    extension: mimeConfig.ext,
    sizeBytes: buffer.length,
  };
}

/**
 * Generates a private Supabase Storage filepath.
 * Strictly isolated: identity-documents/{carrierId}/{documentId}.{ext}
 */
export function generatePrivateStoragePath(carrierId, documentId, extension) {
  return `identity-documents/${carrierId}/${documentId}.${extension}`;
}

/**
 * Creates an identity document record in 'pending' status.
 */
export function createIdentityDocumentRecord({
  userId,
  documentType = "DRIVERS_LICENSE",
  fileName,
  mimeType,
  fileSizeBytes,
  storagePath,
}) {
  const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  return {
    id: documentId,
    userId,
    documentType,
    fileName,
    filePath: storagePath,
    mimeType,
    fileSizeBytes,
    status: DOCUMENT_VERIFICATION_STATUS.PENDING,
    ocrData: null,
    ocrConfidence: null,
    rejectionReason: null,
    reviewerId: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Processes document through OCR pipeline and transitions status.
 */
export async function processDocumentVerification(documentRecord, fileBuffer, rawTextSimulation = null) {
  documentRecord.status = DOCUMENT_VERIFICATION_STATUS.PROCESSING;
  documentRecord.updatedAt = new Date().toISOString();

  const ocrResult = await processDriverLicenseDocument({
    fileBuffer,
    mimeType: documentRecord.mimeType,
    rawTextSimulation,
  });

  documentRecord.ocrData = ocrResult.fields;
  documentRecord.ocrConfidence = ocrResult.confidence;

  if (ocrResult.recommendedStatus === "verified") {
    documentRecord.status = DOCUMENT_VERIFICATION_STATUS.VERIFIED;
  } else if (ocrResult.recommendedStatus === "manual_review") {
    documentRecord.status = DOCUMENT_VERIFICATION_STATUS.MANUAL_REVIEW;
    documentRecord.rejectionReason = ocrResult.reasons.join(", ");
  } else {
    documentRecord.status = DOCUMENT_VERIFICATION_STATUS.REJECTED;
    documentRecord.rejectionReason = ocrResult.reasons.join(", ") || "Belge okunamadı veya geçersiz.";
  }

  documentRecord.updatedAt = new Date().toISOString();

  return {
    documentRecord,
    ocrResult,
  };
}

/**
 * Manual review override by operator or admin.
 */
export function applyManualReviewDecision(documentRecord, reviewerId, decision, reason = null) {
  if (!["verified", "rejected"].includes(decision)) {
    return { success: false, error: "Geçersiz inceleme kararı. Yalnızca 'verified' veya 'rejected' olabilir." };
  }

  documentRecord.status = decision;
  documentRecord.reviewerId = reviewerId;
  documentRecord.reviewedAt = new Date().toISOString();
  documentRecord.updatedAt = new Date().toISOString();
  if (decision === "rejected") {
    documentRecord.rejectionReason = reason || "Operatör incelemesinde reddedildi.";
  } else {
    documentRecord.rejectionReason = null;
  }

  return {
    success: true,
    documentRecord,
  };
}

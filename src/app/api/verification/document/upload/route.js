import { NextResponse } from "next/server";
import {
  validateDocumentFile,
  generatePrivateStoragePath,
  createIdentityDocumentRecord,
  processDocumentVerification,
} from "@/utils/documentVerificationService";
import { authenticateServerRequest } from "@/utils/serverAuthHelper";
import { createProductionError, ERROR_CODES, generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

/**
 * POST /api/verification/document/upload
 * Handles driver license document upload, validation, and OCR.
 */
export async function POST(request) {
  const requestId = generateCorrelationId("doc-up");

  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { user, error: authErr, supabase } = await authenticateServerRequest(token);
    if (authErr || !user) {
      const err = createProductionError({
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        userMessage: authErr || "Geçersiz veya süresi dolmuş oturum.",
        requestId,
      });
      return NextResponse.json(err.clientPayload, { status: err.httpStatus });
    }

    const formData = await request.formData();
    const file = formData.get("file") || formData.get("document");
    const documentType = formData.get("documentType") || "DRIVERS_LICENSE";

    if (!file || typeof file === "string") {
      const err = createProductionError({
        code: ERROR_CODES.VALIDATION_ERROR,
        userMessage: "Lütfen geçerli bir belge dosyası seçin.",
        requestId,
      });
      return NextResponse.json(err.clientPayload, { status: err.httpStatus });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const valResult = validateDocumentFile({
      buffer,
      mimeType: file.type || "image/jpeg",
      sizeBytes: file.size || buffer.length,
      originalName: file.name || "document.jpg",
    });

    if (!valResult.valid) {
      const err = createProductionError({
        code: ERROR_CODES.VALIDATION_ERROR,
        userMessage: valResult.error,
        requestId,
      });
      return NextResponse.json(err.clientPayload, { status: err.httpStatus });
    }

    const docRecord = createIdentityDocumentRecord({
      userId: user.id,
      documentType,
      fileName: file.name || "document.jpg",
      mimeType: file.type || "image/jpeg",
      fileSizeBytes: buffer.length,
      storagePath: generatePrivateStoragePath(user.id, `doc-${Date.now()}`, valResult.extension),
    });

    // Run OCR Verification
    const { documentRecord: processedRecord, ocrResult } = await processDocumentVerification(
      docRecord,
      buffer
    );

    if (supabase) {
      try {
        await supabase.storage
          .from("identity-documents")
          .upload(processedRecord.filePath, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });

        await supabase.from("identity_documents").insert({
          id: processedRecord.id,
          user_id: user.id,
          document_type: processedRecord.documentType,
          file_name: processedRecord.fileName,
          file_path: processedRecord.filePath,
          mime_type: processedRecord.mimeType,
          file_size_bytes: processedRecord.fileSizeBytes,
          status: processedRecord.status,
          ocr_data: processedRecord.ocrData,
          ocr_confidence: processedRecord.ocrConfidence,
          rejection_reason: processedRecord.rejectionReason,
        });

        if (processedRecord.status === "verified") {
          await supabase
            .from("profiles")
            .update({
              identity_verified: true,
              verification_level: "FULLY_VERIFIED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
      } catch {
        // Fallback gracefully
      }
    }

    return NextResponse.json({
      success: true,
      message:
        processedRecord.status === "verified"
          ? "Sürücü belgeniz başarıyla doğrulandı."
          : processedRecord.status === "manual_review"
          ? "Belgeniz manuel incelemeye alındı."
          : "Belge doğrulanamadı.",
      status: processedRecord.status,
      documentId: processedRecord.id,
      ocrConfidence: processedRecord.ocrConfidence,
      rejectionReason: processedRecord.rejectionReason,
      requiresManualReview: processedRecord.status === "manual_review",
      requestId,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Belge işlenirken bir hata oluştu." },
      { status: 400 }
    );
  }
}

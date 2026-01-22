// src/modules/directives/directives.service.ts
import { PrismaClient, AdvanceDirective, DirectiveType, DirectiveStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashSHA256, generateSecureToken } from '../../common/utils/encryption';
import config from '../../config';

const prisma = new PrismaClient();

// Tipos
interface CreateDraftInput {
  acceptsCPR?: boolean;
  acceptsIntubation?: boolean;
  acceptsDialysis?: boolean;
  acceptsTransfusion?: boolean;
  acceptsArtificialNutrition?: boolean;
  palliativeCareOnly?: boolean;
  additionalNotes?: string;
  originState?: string;
}

interface UploadDocumentInput {
  documentUrl: string;
  originalFileName: string;
  documentBuffer?: Buffer; // Para calcular hash
  originState?: string;
}

interface DirectiveResponse {
  id: string;
  type: DirectiveType;
  status: DirectiveStatus;
  documentUrl: string | null;
  originalFileName: string | null;
  nom151Sealed: boolean;
  nom151Timestamp: Date | null;
  acceptsCPR: boolean | null;
  acceptsIntubation: boolean | null;
  acceptsDialysis: boolean | null;
  acceptsTransfusion: boolean | null;
  acceptsArtificialNutrition: boolean | null;
  palliativeCareOnly: boolean | null;
  additionalNotes: string | null;
  originState: string | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

class DirectivesService {
  /**
   * Lista todas las directivas del usuario
   */
  async listDirectives(userId: string): Promise<DirectiveResponse[]> {
    const directives = await prisma.advanceDirective.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    return directives.map(this.formatDirective);
  }
  
  /**
   * Obtiene una directiva por ID
   */
  async getDirective(userId: string, directiveId: string): Promise<DirectiveResponse | null> {
    const directive = await prisma.advanceDirective.findFirst({
      where: { id: directiveId, userId },
    });
    
    return directive ? this.formatDirective(directive) : null;
  }
  
  /**
   * Obtiene la directiva activa del usuario
   */
  async getActiveDirective(userId: string): Promise<DirectiveResponse | null> {
    const directive = await prisma.advanceDirective.findFirst({
      where: { 
        userId, 
        status: DirectiveStatus.ACTIVE,
      },
      orderBy: { validatedAt: 'desc' },
    });
    
    return directive ? this.formatDirective(directive) : null;
  }
  
  /**
   * Crea un borrador de voluntad anticipada
   */
  async createDraft(userId: string, input: CreateDraftInput): Promise<DirectiveResponse> {
    const directive = await prisma.advanceDirective.create({
      data: {
        userId,
        type: DirectiveType.DIGITAL_DRAFT,
        status: DirectiveStatus.DRAFT,
        acceptsCPR: input.acceptsCPR,
        acceptsIntubation: input.acceptsIntubation,
        acceptsDialysis: input.acceptsDialysis,
        acceptsTransfusion: input.acceptsTransfusion,
        acceptsArtificialNutrition: input.acceptsArtificialNutrition,
        palliativeCareOnly: input.palliativeCareOnly,
        additionalNotes: input.additionalNotes,
        originState: input.originState,
      },
    });
    
    return this.formatDirective(directive);
  }
  
  /**
   * Sube un documento notarizado existente
   */
  async uploadDocument(userId: string, input: UploadDocumentInput): Promise<DirectiveResponse> {
    // Calcular hash del documento si se proporciona el buffer
    let documentHash: string | undefined;
    if (input.documentBuffer) {
      documentHash = hashSHA256(input.documentBuffer);
    }
    
    const directive = await prisma.advanceDirective.create({
      data: {
        userId,
        type: DirectiveType.NOTARIZED_DOCUMENT,
        status: DirectiveStatus.PENDING_VALIDATION,
        documentUrl: input.documentUrl,
        originalFileName: input.originalFileName,
        documentHash,
        originState: input.originState,
      },
    });
    
    return this.formatDirective(directive);
  }
  
  /**
   * Actualiza un borrador existente
   */
  async updateDraft(userId: string, directiveId: string, input: CreateDraftInput): Promise<DirectiveResponse | null> {
    // Verificar que la directiva existe y es un borrador
    const existing = await prisma.advanceDirective.findFirst({
      where: { 
        id: directiveId, 
        userId,
        status: DirectiveStatus.DRAFT,
      },
    });
    
    if (!existing) {
      return null;
    }
    
    const directive = await prisma.advanceDirective.update({
      where: { id: directiveId },
      data: {
        acceptsCPR: input.acceptsCPR ?? existing.acceptsCPR,
        acceptsIntubation: input.acceptsIntubation ?? existing.acceptsIntubation,
        acceptsDialysis: input.acceptsDialysis ?? existing.acceptsDialysis,
        acceptsTransfusion: input.acceptsTransfusion ?? existing.acceptsTransfusion,
        acceptsArtificialNutrition: input.acceptsArtificialNutrition ?? existing.acceptsArtificialNutrition,
        palliativeCareOnly: input.palliativeCareOnly ?? existing.palliativeCareOnly,
        additionalNotes: input.additionalNotes ?? existing.additionalNotes,
        originState: input.originState ?? existing.originState,
      },
    });
    
    return this.formatDirective(directive);
  }
  
  /**
   * Valida una directiva (cambia estado a ACTIVE)
   */
  async validateDirective(
    userId: string, 
    directiveId: string, 
    validationMethod: 'EMAIL' | 'SMS'
  ): Promise<DirectiveResponse | null> {
    const existing = await prisma.advanceDirective.findFirst({
      where: { 
        id: directiveId, 
        userId,
        status: { in: [DirectiveStatus.DRAFT, DirectiveStatus.PENDING_VALIDATION] },
      },
    });
    
    if (!existing) {
      return null;
    }
    
    // En producción, aquí se enviaría un código de verificación por email/SMS
    // Por ahora, simplemente marcamos como activo
    
    const directive = await prisma.advanceDirective.update({
      where: { id: directiveId },
      data: {
        status: DirectiveStatus.ACTIVE,
        validatedAt: new Date(),
        validationMethod,
      },
    });
    
    return this.formatDirective(directive);
  }
  
  /**
   * Solicita sellado NOM-151 para una directiva
   */
  async requestNOM151Seal(userId: string, directiveId: string): Promise<DirectiveResponse | null> {
    const directive = await prisma.advanceDirective.findFirst({
      where: { id: directiveId, userId },
    });
    
    if (!directive || !directive.documentHash) {
      return null;
    }
    
    // En producción, aquí se llamaría al PSC
    // Por ahora, simulamos el sellado
    const mockCertificate = `NOM151-CERT-${generateSecureToken(16)}`;
    
    const updated = await prisma.advanceDirective.update({
      where: { id: directiveId },
      data: {
        nom151Sealed: true,
        nom151Timestamp: new Date(),
        nom151Certificate: mockCertificate,
        nom151Provider: 'PSC Demo Provider',
      },
    });
    
    return this.formatDirective(updated);
  }
  
  /**
   * Revoca una directiva
   */
  async revokeDirective(userId: string, directiveId: string): Promise<DirectiveResponse | null> {
    const existing = await prisma.advanceDirective.findFirst({
      where: { 
        id: directiveId, 
        userId,
        status: { not: DirectiveStatus.REVOKED },
      },
    });
    
    if (!existing) {
      return null;
    }
    
    const directive = await prisma.advanceDirective.update({
      where: { id: directiveId },
      data: {
        status: DirectiveStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    
    return this.formatDirective(directive);
  }
  
  /**
   * Elimina una directiva (solo borradores)
   */
  async deleteDirective(userId: string, directiveId: string): Promise<boolean> {
    const existing = await prisma.advanceDirective.findFirst({
      where: { 
        id: directiveId, 
        userId,
        status: DirectiveStatus.DRAFT,
      },
    });
    
    if (!existing) {
      return false;
    }
    
    await prisma.advanceDirective.delete({
      where: { id: directiveId },
    });
    
    return true;
  }
  
  /**
   * Obtiene directivas para acceso de emergencia (por userId)
   */
  async getDirectivesForEmergency(userId: string): Promise<{
    hasActiveDirective: boolean;
    acceptsCPR: boolean | null;
    acceptsIntubation: boolean | null;
    additionalNotes: string | null;
    documentUrl: string | null;
    validatedAt: Date | null;
  } | null> {
    const directive = await prisma.advanceDirective.findFirst({
      where: { 
        userId, 
        status: DirectiveStatus.ACTIVE,
      },
      orderBy: { validatedAt: 'desc' },
    });
    
    if (!directive) {
      return {
        hasActiveDirective: false,
        acceptsCPR: null,
        acceptsIntubation: null,
        additionalNotes: null,
        documentUrl: null,
        validatedAt: null,
      };
    }
    
    return {
      hasActiveDirective: true,
      acceptsCPR: directive.acceptsCPR,
      acceptsIntubation: directive.acceptsIntubation,
      additionalNotes: directive.additionalNotes,
      documentUrl: directive.documentUrl,
      validatedAt: directive.validatedAt,
    };
  }
  
  /**
   * Formatea una directiva para la respuesta
   */
  private formatDirective(directive: AdvanceDirective): DirectiveResponse {
    return {
      id: directive.id,
      type: directive.type,
      status: directive.status,
      documentUrl: directive.documentUrl,
      originalFileName: directive.originalFileName,
      nom151Sealed: directive.nom151Sealed,
      nom151Timestamp: directive.nom151Timestamp,
      acceptsCPR: directive.acceptsCPR,
      acceptsIntubation: directive.acceptsIntubation,
      acceptsDialysis: directive.acceptsDialysis,
      acceptsTransfusion: directive.acceptsTransfusion,
      acceptsArtificialNutrition: directive.acceptsArtificialNutrition,
      palliativeCareOnly: directive.palliativeCareOnly,
      additionalNotes: directive.additionalNotes,
      originState: directive.originState,
      validatedAt: directive.validatedAt,
      createdAt: directive.createdAt,
      updatedAt: directive.updatedAt,
    };
  }
}

export const directivesService = new DirectivesService();
export default directivesService;

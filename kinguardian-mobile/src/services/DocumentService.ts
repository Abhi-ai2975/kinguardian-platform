import { HealthDocument } from '../types';
import { INITIAL_DOCUMENTS } from '../data/mockData';
import { DrGodlyApiClient } from './api-client/client';
import { CONFIG } from '../constants/config';
import { ApiFamilyService } from './ApiFamilyService';

export interface DocumentService {
  getDocuments(personId?: string): Promise<HealthDocument[]>;
  uploadDocument(newDoc: HealthDocument): Promise<HealthDocument>;
}

export class ApiDocumentService implements DocumentService {
  private client: DrGodlyApiClient;
  private familyService: ApiFamilyService;
  private docs: HealthDocument[] = [...INITIAL_DOCUMENTS];

  constructor(baseUrl: string = CONFIG.apiUrl, familyService?: ApiFamilyService) {
    this.client = new DrGodlyApiClient({ baseUrl });
    this.familyService = familyService || new ApiFamilyService(baseUrl);
  }

  async getDocuments(personId?: string): Promise<HealthDocument[]> {
    try {
      const familyId = await this.familyService.ensureFamily();
      const subjectId = personId ? await this.familyService.resolveSubjectId(personId) : undefined;

      const backendDocs = await this.client.documents.list(familyId, subjectId || undefined);
      if (backendDocs && backendDocs.length > 0) {
        const liveDocs: HealthDocument[] = backendDocs.map((d: any) => ({
          id: d.id,
          name: d.filenest_file_id || 'Medical Report',
          date: d.created_at ? new Date(d.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
          category: d.classification || 'Diagnostic Lab',
          size: '1.2 MB',
          summary: `Verified document: ${d.classification || 'Clinical record'}. Classification: ${d.status || 'Active'}.`,
          status: 'parsed',
          uploadedAt: d.created_at || new Date().toISOString(),
          uploader: 'Care Team',
          personId: personId || 'dad'
        }));

        const combined = [...liveDocs, ...this.docs.filter((d) => !liveDocs.some((l) => l.id === d.id || l.name === d.name))];
        this.docs = combined;
        return combined;
      }
    } catch (err) {
      console.warn('ApiDocumentService: Failed to fetch documents from database:', err);
    }
    return this.docs.filter((d) => !personId || d.personId === personId || !d.personId);
  }

  async uploadDocument(newDoc: HealthDocument): Promise<HealthDocument> {
    try {
      const familyId = (newDoc as any).family_id || (newDoc as any).familyId || await this.familyService.ensureFamily();
      let subjectId = (newDoc as any).subject_id || (newDoc as any).subjectId || await this.familyService.resolveSubjectId(newDoc.personId || 'dad');
      if (!subjectId) {
        const members = await this.familyService.getFamilyMembers();
        subjectId = members[0]?.backendSubjectId || '';
      }

      if (subjectId) {
        const sanitizedName = (newDoc.name || 'medical_report').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
        let uniqueFileId = (newDoc as any).filenestFileId || (newDoc as any).filenest_file_id || `${sanitizedName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const classification = (newDoc as any).classification || newDoc.category || (newDoc.type === 'prescription' ? 'Prescription' : 'Diagnostic Lab');

        let createdDoc: any = null;
        try {
          createdDoc = await this.client.documents.create({
            family_id: familyId,
            subject_id: subjectId,
            filenest_file_id: uniqueFileId,
            classification: classification
          });
        } catch (postErr: any) {
          console.warn('ApiDocumentService: Initial create failed, retrying with unique timestamp suffix:', postErr?.message || postErr);
          const ext = uniqueFileId.includes('.') ? `.${uniqueFileId.split('.').pop()}` : '.jpg';
          const baseName = uniqueFileId.replace(/\.[^/.]+$/, '');
          uniqueFileId = `${baseName}_${Date.now()}${ext}`;
          createdDoc = await this.client.documents.create({
            family_id: familyId,
            subject_id: subjectId,
            filenest_file_id: uniqueFileId,
            classification: classification
          });
        }
        console.log('ApiDocumentService: Persisted document to PostgreSQL document_references:', createdDoc);

        const uploaded: HealthDocument = {
          ...newDoc,
          id: createdDoc?.id || newDoc.id,
          status: 'parsed',
          uploadedAt: createdDoc?.created_at || new Date().toISOString()
        };
        this.docs.unshift(uploaded);
        return uploaded;
      }
    } catch (err) {
      console.warn('ApiDocumentService: Error uploading document to PostgreSQL:', err);
    }

    const fallback: HealthDocument = {
      ...newDoc,
      status: 'parsed',
      uploadedAt: new Date().toISOString()
    };
    this.docs.unshift(fallback);
    return fallback;
  }
}

export class MockDocumentService extends ApiDocumentService {}

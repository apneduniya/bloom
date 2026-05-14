"use client";

import { ID, type Storage } from "appwrite";

import { storage } from "@/lib/appwrite/client";
import { ownerPermissions } from "@/lib/appwrite/permissions";
import {
  CERTIFICATES_BUCKET_ID,
  DATA_SOURCES_BUCKET_ID,
} from "@/features/blooms/constants/appwrite-tables";

export class FilesService {
  private storage: Storage = storage;

  uploadTemplatePng(file: File, ownerId: string) {
    return this.storage.createFile(CERTIFICATES_BUCKET_ID, ID.unique(), file, ownerPermissions(ownerId));
  }

  uploadCsv(file: File, ownerId: string) {
    return this.storage.createFile(DATA_SOURCES_BUCKET_ID, ID.unique(), file, ownerPermissions(ownerId));
  }

  getTemplateViewUrl(fileId: string) {
    return this.storage.getFileView(CERTIFICATES_BUCKET_ID, fileId);
  }

  deleteTemplate(fileId: string) {
    return this.storage.deleteFile(CERTIFICATES_BUCKET_ID, fileId);
  }

  deleteCsv(fileId: string) {
    return this.storage.deleteFile(DATA_SOURCES_BUCKET_ID, fileId);
  }

  dataUrlToFile(dataUrl: string, fileName: string, type = "image/png") {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/data:(.*?);base64/)?.[1] ?? type;
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], fileName, { type: mime });
  }
}

export const filesService = new FilesService();

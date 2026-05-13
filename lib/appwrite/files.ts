"use client";

import { ID } from "appwrite";
import { appwriteConfig } from "./config";
import { storage } from "./client";
import { ownerPermissions } from "./permissions";

export async function uploadTemplatePng(file: File, ownerId: string) {
  return storage.createFile(appwriteConfig.buckets.certificates, ID.unique(), file, ownerPermissions(ownerId));
}

export async function uploadCsvFile(file: File, ownerId: string) {
  return storage.createFile(appwriteConfig.buckets.dataSources, ID.unique(), file, ownerPermissions(ownerId));
}

export function getTemplateViewUrl(fileId: string) {
  return storage.getFileView(appwriteConfig.buckets.certificates, fileId);
}

export function dataUrlToFile(dataUrl: string, fileName: string, type = "image/png") {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? type;
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mime });
}

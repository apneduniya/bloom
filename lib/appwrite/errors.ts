"use client";

import { AppwriteException } from "appwrite";

export function toReadableAppwriteError(cause: unknown, operation: string) {
  if (cause instanceof AppwriteException) {
    const unknownAttribute = cause.message.match(/Unknown attribute:\s*"([^"]+)"/i);
    if (unknownAttribute) {
      return new Error(
        `${operation} failed because Appwrite rejected the row schema. "${unknownAttribute[1]}" is not defined in the target table.`,
      );
    }

    if (cause.message) {
      return new Error(`${operation} failed: ${cause.message}`);
    }
  }

  if (cause instanceof Error) {
    return new Error(`${operation} failed: ${cause.message}`);
  }

  return new Error(`${operation} failed.`);
}

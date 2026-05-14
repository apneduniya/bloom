import type { EmailDraft, TextLayer } from "@/features/blooms/types";
import { createId } from "@/lib/utils";

export function createDefaultLayer(bloomId: string, canvasWidth: number, canvasHeight: number): TextLayer {
  return {
    id: createId("layer"),
    bloomId,
    name: "Recipient name",
    content: "{{name}}",
    x: Math.round(canvasWidth * 0.2),
    y: Math.round(canvasHeight * 0.45),
    width: Math.round(canvasWidth * 0.6),
    height: Math.round(canvasHeight * 0.13),
    rotation: 0,
    fontFamily: "Georgia",
    fontSize: Math.max(28, Math.round(canvasWidth * 0.05)),
    fontWeight: "700",
    fontStyle: "normal",
    color: "#1f2937",
    opacity: 1,
    align: "center",
    lineHeight: 1.1,
    letterSpacing: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    bindingKey: "name",
  };
}

export function createDefaultDraft(bloomId: string): EmailDraft {
  return {
    id: createId("draft"),
    bloomId,
    toFieldMapping: "{{email}}",
    cc: "",
    bcc: "",
    subject: "Your certificate from Bloom",
    body: "Hi {{name}},\n\nYour certificate is attached.\n\nCongratulations,\nBloom",
    attachmentFilename: "certificate-{{name}}",
    attachmentsEnabled: true,
  };
}

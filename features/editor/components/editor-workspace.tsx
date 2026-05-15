"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useBloom } from "@/features/blooms/hooks/use-bloom";
import { useSaveBloom } from "@/features/blooms/hooks/use-save-bloom";
import { useSaveDataSource } from "@/features/blooms/hooks/use-save-data-source";
import { useWorkspaceStore } from "@/features/editor/stores/workspace-store";
import { createDefaultLayer } from "@/features/blooms/services/bloom-factory";
import type { Bloom, TextLayer } from "@/features/blooms/types";
import { createDataSource } from "@/features/data-sources/services/data-source-factory";
import { exportBloomPng } from "@/features/blooms/services/bloom-png-exporter";
import { parseCsv } from "@/lib/tokens/csv";
import { findMissingTokens, resolveTokens, tokenChip } from "@/lib/tokens/token-engine";
import { createId } from "@/lib/utils";

const fonts = ["Georgia", "Arial", "Times New Roman", "Inter", "Verdana", "Courier New"];

export function EditorWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const bloomId = searchParams.get("bloomId");
  const bloomQuery = useBloom(user?.id, bloomId);

  useEffect(() => {
    if (!currentUserQuery.isFetched) return;
    if (!bloomId) {
      router.push("/dashboard");
      return;
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/editor?bloomId=${bloomId}`)}`);
      return;
    }
  }, [bloomId, currentUserQuery.isFetched, router, user]);
  if (!currentUserQuery.isFetched || (user && bloomQuery.isPending)) return <main className="page-pad">Loading editor...</main>;
  if (bloomQuery.error) return <main className="page-pad"><p className="form-error">{bloomQuery.error instanceof Error ? bloomQuery.error.message : "Could not load Bloom."}</p></main>;
  if (!user) return <main className="page-pad">Redirecting to sign in...</main>;
  if (!bloomQuery.data) return <main className="page-pad">Loading editor...</main>;

  return <EditorWorkspaceLoaded key={bloomQuery.data.id} initialBloom={bloomQuery.data} />;
}

function EditorWorkspaceLoaded({ initialBloom }: { initialBloom: Bloom }) {
  const saveBloomMutation = useSaveBloom();
  const saveDataSourceMutation = useSaveDataSource();
  const [bloom, setBloom] = useState<Bloom>(initialBloom);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "failed">("saved");
  const [error, setError] = useState("");
  const selectedId = useWorkspaceStore((state) => state.selectedId);
  const setSelectedId = useWorkspaceStore((state) => state.setSelectedId);
  const zoom = useWorkspaceStore((state) => state.zoom);
  const setZoom = useWorkspaceStore((state) => state.setZoom);

  useEffect(() => {
    useWorkspaceStore.getState().reset(initialBloom.layers[0]?.id ?? "");
  }, [initialBloom.id, initialBloom.layers]);

  useEffect(() => {
    if (saveState !== "dirty") return;
    const timeout = window.setTimeout(() => {
      saveBloomMutation
        .mutateAsync(bloom)
        .then((saved) => {
          setBloom(saved);
          setSaveState("saved");
        })
        .catch((cause) => {
          setSaveState("failed");
          setError(cause instanceof Error ? cause.message : "Could not save Bloom.");
        });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [bloom, saveState, saveBloomMutation]);

  const selectedLayer = useMemo(() => bloom.layers.find((layer) => layer.id === selectedId), [bloom, selectedId]);
  const previewRow = bloom.dataSource?.rows[0] ?? {};
  const missingTokens = useMemo(() => {
    if (!bloom.dataSource) return [];
    const values = [
      ...bloom.layers.map((layer) => layer.content),
      bloom.emailDraft.subject,
      bloom.emailDraft.body,
      bloom.emailDraft.toFieldMapping,
      bloom.emailDraft.attachmentFilename,
    ];
    return findMissingTokens(values, bloom.dataSource.columnNames);
  }, [bloom]);

  function mutate(updater: (current: Bloom) => Bloom, mode: "dirty" | "immediate" = "dirty") {
    setBloom((current) => {
      const next = updater(current);
      if (mode === "immediate") window.setTimeout(() => persist("saving", next), 0);
      return next;
    });
    setSaveState(mode === "dirty" ? "dirty" : "saving");
  }

  async function persist(state: "saving" = "saving", target = bloom) {
    setSaveState(state);
    try {
      const saved = await saveBloomMutation.mutateAsync(target);
      setBloom(saved);
      setSaveState("saved");
    } catch (cause) {
      setSaveState("failed");
      setError(cause instanceof Error ? cause.message : "Could not save Bloom.");
    }
  }

  function updateLayer(id: string, patch: Partial<TextLayer>, mode: "dirty" | "immediate" = "dirty") {
    mutate((current) => ({ ...current, layers: current.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)) }), mode);
  }

  function addLayer() {
    const zIndex = Math.max(0, ...bloom.layers.map((layer) => layer.zIndex)) + 1;
    const layer = {
      ...createDefaultLayer(bloom.id, bloom.canvasWidth, bloom.canvasHeight),
      id: createId("layer"),
      name: `Text ${bloom.layers.length + 1}`,
      content: "New text",
      zIndex,
    };
    mutate((current) => ({ ...current, layers: [...current.layers, layer] }), "immediate");
    setSelectedId(layer.id);
  }

  function duplicateLayer() {
    if (!selectedLayer) return;
    const copy = {
      ...selectedLayer,
      id: createId("layer"),
      name: `${selectedLayer.name} copy`,
      x: selectedLayer.x + 20,
      y: selectedLayer.y + 20,
      zIndex: selectedLayer.zIndex + 1,
    };
    mutate((current) => ({ ...current, layers: [...current.layers, copy] }), "immediate");
    setSelectedId(copy.id);
  }

  function deleteLayer() {
    if (!selectedLayer) return;
    mutate((current) => ({ ...current, layers: current.layers.filter((layer) => layer.id !== selectedLayer.id) }), "immediate");
    setSelectedId("");
  }

  async function uploadCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      const dataSource = createDataSource(bloom.id, file.name, parsed.rows, parsed.columns);
      setSaveState("saving");
      const saved = await saveDataSourceMutation.mutateAsync({ bloom, dataSource, file });
      setBloom(saved);
      setSaveState("saved");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not parse CSV.");
      setSaveState("failed");
    }
  }

  return (
    <main className="editor-page">
      <header className="editor-topbar">
        <div>
          <input
            className="title-input"
            value={bloom.title}
            onChange={(event) => mutate((current) => ({ ...current, title: event.target.value }))}
          />
          <span className={`save-state save-${saveState}`}>
            {saveState === "dirty" ? "Unsaved" : saveState === "saving" ? "Saving..." : saveState === "failed" ? "Save failed" : "Saved just now"}
          </span>
        </div>
        <div className="toolbar">
          <Button variant="secondary" onClick={() => setZoom((value) => value - 0.1)}>
            -
          </Button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <Button variant="secondary" onClick={() => setZoom((value) => value + 0.1)}>
            +
          </Button>
          <Button variant="secondary" onClick={() => persist()}>
            Save
          </Button>
          <Button onClick={() => exportBloomPng(bloom, previewRow)}>Export PNG</Button>
          <Link className="button button-secondary" href={`/share?bloomId=${bloom.id}`}>
            Share
          </Link>
        </div>
      </header>

      {missingTokens.length ? <div className="warning-bar">Missing CSV columns: {missingTokens.join(", ")}</div> : null}

      <div className="editor-grid">
        <aside className="side-panel">
          <section>
            <div className="panel-heading">
              <h2>Layers</h2>
              <Button variant="secondary" onClick={addLayer}>
                Add
              </Button>
            </div>
            <div className="layer-list">
              {[...bloom.layers]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((layer) => (
                  <button
                    key={layer.id}
                    className={`layer-item ${selectedId === layer.id ? "active" : ""}`}
                    onClick={() => setSelectedId(layer.id)}
                  >
                    <span>{layer.visible ? "●" : "○"}</span>
                    <span>{layer.name}</span>
                    <small>{layer.locked ? "locked" : `z${layer.zIndex}`}</small>
                  </button>
                ))}
            </div>
          </section>

          <section>
            <div className="panel-heading">
              <h2>CSV data</h2>
              <label className="button button-secondary">
                Upload
                <input type="file" accept=".csv,text/csv" onChange={uploadCsv} hidden />
              </label>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            {bloom.dataSource ? (
              <div className="data-preview">
                <p className="meta">
                  {bloom.dataSource.fileName} · {bloom.dataSource.rowCount} rows
                </p>
                <div className="chip-row">
                  {bloom.dataSource.columnNames.map((column) => (
                    <button
                      key={column}
                      className="token-chip"
                      onClick={() => selectedLayer && updateLayer(selectedLayer.id, { content: `${selectedLayer.content} ${tokenChip(column)}` })}
                    >
                      {tokenChip(column)}
                    </button>
                  ))}
                </div>
                <table>
                  <thead>
                    <tr>{bloom.dataSource.columnNames.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {bloom.dataSource.previewRows.map((row, index) => (
                      <tr key={index}>
                        {bloom.dataSource?.columnNames.map((column) => <td key={column}>{row[column]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Upload CSV to preview merge tags.</p>
            )}
          </section>
        </aside>

        <Canvas bloom={bloom} updateLayer={updateLayer} previewRow={previewRow} />

        <PropertiesPanel
          layer={selectedLayer}
          updateLayer={updateLayer}
          duplicateLayer={duplicateLayer}
          deleteLayer={deleteLayer}
        />
      </div>
    </main>
  );
}

function Canvas({
  bloom,
  updateLayer,
  previewRow,
}: {
  bloom: Bloom;
  updateLayer: (id: string, patch: Partial<TextLayer>, mode?: "dirty" | "immediate") => void;
  previewRow: Record<string, string>;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; startX: number; startY: number; layer: TextLayer } | null>(null);
  const selectedId = useWorkspaceStore((state) => state.selectedId);
  const setSelectedId = useWorkspaceStore((state) => state.setSelectedId);
  const zoom = useWorkspaceStore((state) => state.zoom);

  function pointerDown(event: PointerEvent, layer: TextLayer, mode: "move" | "resize") {
    if (layer.locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(layer.id);
    setDrag({ id: layer.id, mode, startX: event.clientX, startY: event.clientY, layer });
  }

  function pointerMove(event: PointerEvent) {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (drag.mode === "move") {
      updateLayer(drag.id, { x: Math.round(drag.layer.x + dx), y: Math.round(drag.layer.y + dy) });
    } else {
      updateLayer(drag.id, { width: Math.max(24, Math.round(drag.layer.width + dx)), height: Math.max(16, Math.round(drag.layer.height + dy)) });
    }
  }

  function pointerUp() {
    if (drag) updateLayer(drag.id, {}, "immediate");
    setDrag(null);
  }

  return (
    <section className="canvas-stage">
      <div
        ref={canvasRef}
        className="certificate-canvas"
        style={{ width: bloom.canvasWidth * zoom, height: bloom.canvasHeight * zoom }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Appwrite private file URLs rely on the active browser session. */}
        <img src={bloom.templateImageDataUrl} alt="" />
        {bloom.layers
          .filter((layer) => layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => (
            <div
              key={layer.id}
              className={`text-layer ${selectedId === layer.id ? "selected" : ""} ${layer.locked ? "locked" : ""}`}
              style={{
                left: layer.x * zoom,
                top: layer.y * zoom,
                width: layer.width * zoom,
                height: layer.height * zoom,
                zIndex: layer.zIndex,
                transform: `rotate(${layer.rotation}deg)`,
                opacity: layer.opacity,
                color: layer.color,
                fontFamily: layer.fontFamily,
                fontSize: layer.fontSize * zoom,
                fontWeight: layer.fontWeight,
                fontStyle: layer.fontStyle,
                textAlign: layer.align,
                lineHeight: layer.lineHeight,
                letterSpacing: layer.letterSpacing * zoom,
              }}
              onPointerDown={(event) => pointerDown(event, layer, "move")}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
            >
              {resolveTokens(layer.content, previewRow)}
              {selectedId === layer.id && !layer.locked ? (
                <span
                  className="resize-handle"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    pointerDown(event, layer, "resize");
                  }}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                />
              ) : null}
            </div>
          ))}
      </div>
    </section>
  );
}

function PropertiesPanel({
  layer,
  updateLayer,
  duplicateLayer,
  deleteLayer,
}: {
  layer?: TextLayer;
  updateLayer: (id: string, patch: Partial<TextLayer>, mode?: "dirty" | "immediate") => void;
  duplicateLayer: () => void;
  deleteLayer: () => void;
}) {
  if (!layer) {
    return (
      <aside className="side-panel">
        <h2>Properties</h2>
        <p className="muted">Select a layer to edit its content, position, and styles.</p>
      </aside>
    );
  }

  return (
    <aside className="side-panel properties">
      <div className="panel-heading">
        <h2>Properties</h2>
        <div className="mini-actions">
          <Button variant="secondary" onClick={duplicateLayer}>
            Duplicate
          </Button>
          <Button variant="danger" onClick={deleteLayer}>
            Delete
          </Button>
        </div>
      </div>
      <Field label="Name">
        <Input value={layer.name} onChange={(event) => updateLayer(layer.id, { name: event.target.value })} />
      </Field>
      <Field label="Text">
        <Textarea value={layer.content} rows={4} onChange={(event) => updateLayer(layer.id, { content: event.target.value })} />
      </Field>
      <div className="two-col">
        <Field label="X"><Input type="number" value={layer.x} onChange={(event) => updateLayer(layer.id, { x: Number(event.target.value) })} /></Field>
        <Field label="Y"><Input type="number" value={layer.y} onChange={(event) => updateLayer(layer.id, { y: Number(event.target.value) })} /></Field>
        <Field label="Width"><Input type="number" value={layer.width} onChange={(event) => updateLayer(layer.id, { width: Number(event.target.value) })} /></Field>
        <Field label="Height"><Input type="number" value={layer.height} onChange={(event) => updateLayer(layer.id, { height: Number(event.target.value) })} /></Field>
      </div>
      <div className="two-col">
        <Field label="Font">
          <Select value={layer.fontFamily} onChange={(event) => updateLayer(layer.id, { fontFamily: event.target.value })}>
            {fonts.map((font) => <option key={font}>{font}</option>)}
          </Select>
        </Field>
        <Field label="Size"><Input type="number" value={layer.fontSize} onChange={(event) => updateLayer(layer.id, { fontSize: Number(event.target.value) })} /></Field>
        <Field label="Weight">
          <Select value={layer.fontWeight} onChange={(event) => updateLayer(layer.id, { fontWeight: event.target.value as TextLayer["fontWeight"] })}>
            <option value="400">Regular</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
          </Select>
        </Field>
        <Field label="Align">
          <Select value={layer.align} onChange={(event) => updateLayer(layer.id, { align: event.target.value as TextLayer["align"] })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </Select>
        </Field>
      </div>
      <div className="two-col">
        <Field label="Color"><Input type="color" value={layer.color} onChange={(event) => updateLayer(layer.id, { color: event.target.value })} /></Field>
        <Field label="Opacity"><Input type="range" min="0.1" max="1" step="0.05" value={layer.opacity} onChange={(event) => updateLayer(layer.id, { opacity: Number(event.target.value) })} /></Field>
        <Field label="Rotation"><Input type="number" value={layer.rotation} onChange={(event) => updateLayer(layer.id, { rotation: Number(event.target.value) })} /></Field>
        <Field label="Z index"><Input type="number" value={layer.zIndex} onChange={(event) => updateLayer(layer.id, { zIndex: Number(event.target.value) })} /></Field>
      </div>
      <div className="toggle-row">
        <label><input type="checkbox" checked={layer.visible} onChange={(event) => updateLayer(layer.id, { visible: event.target.checked }, "immediate")} /> Visible</label>
        <label><input type="checkbox" checked={layer.locked} onChange={(event) => updateLayer(layer.id, { locked: event.target.checked }, "immediate")} /> Locked</label>
        <label><input type="checkbox" checked={layer.fontStyle === "italic"} onChange={(event) => updateLayer(layer.id, { fontStyle: event.target.checked ? "italic" : "normal" })} /> Italic</label>
      </div>
    </aside>
  );
}

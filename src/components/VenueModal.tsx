import { useRef, useState } from "react";
import { Box, Button, FileButton, Group, Modal, NavLink, NumberInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPhotoPlus, IconTrash } from "@tabler/icons-react";
import type { Venue } from "../types";
import { setProject, useStore, activePlan } from "../store";
import { loadFloorPlan } from "../storage";
import { uid } from "../lib/util";
import { useDebouncedField } from "../lib/useDebouncedField";
import { log } from "../log";
import { Tip } from "./Palette";

const patchVenue = (id: string, fn: (v: Venue) => Venue, undoable = true) =>
  setProject((p) => ({ ...p, venues: p.venues.map((v) => (v.id === id ? fn(v) : v)) }), undoable);

function scaleFrom(v: Venue, a: [number, number], b: [number, number], metres: number) {
  const px = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return px > 2 && metres > 0 ? { ...v, scaleLine: { a, b, metres }, cmPerPx: (metres * 100) / px } : { ...v, scaleLine: { a, b, metres } };
}

function VenueEditor({ venue }: { venue: Venue }) {
  const ref = useRef<SVGSVGElement>(null);
  const [first, setFirst] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const name = useDebouncedField(venue.name, (v: string) => patchVenue(venue.id, (x) => ({ ...x, name: v }), false));
  const metres = venue.scaleLine?.metres ?? 1;
  const toImg = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * venue.width, ((e.clientY - r.top) / r.height) * venue.height];
  };
  const onClick = (e: React.PointerEvent) => {
    const p = toImg(e);
    if (!first) { setFirst(p); return; }
    patchVenue(venue.id, (v) => scaleFrom(v, first, p, metres));
    setFirst(null);
    log("venue", "scale line set");
  };
  const line = first && hover ? { a: first, b: hover } : venue.scaleLine;
  const sw = Math.max(venue.width, venue.height) / 300;
  const remove = () => modals.openConfirmModal({
    title: `Delete “${venue.name}”?`,
    children: <Text size="sm">Plans using this floor plan will show a plain grid instead. You can undo this.</Text>,
    labels: { confirm: "Delete", cancel: "Cancel" }, confirmProps: { color: "red" },
    onConfirm: () => setProject((p) => ({ ...p, venues: p.venues.filter((v) => v.id !== venue.id), plans: p.plans.map((pl) => (pl.venueId === venue.id ? { ...pl, venueId: null } : pl)) })),
  });

  return (
    <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
      <Group gap="xs" align="end">
        <TextInput size="xs" label="Name" style={{ flex: 1 }} value={name.value} onChange={(e) => name.onChange(e.currentTarget.value)} onBlur={name.onBlur} />
        <NumberInput size="xs" label="Scale line length (m)" w={150} min={0.1} step={0.5} decimalScale={2} value={metres}
          onChange={(m) => typeof m === "number" && m > 0 && venue.scaleLine && patchVenue(venue.id, (v) => scaleFrom(v, v.scaleLine!.a, v.scaleLine!.b, m))} />
        <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />} onClick={remove}>Delete</Button>
      </Group>
      <Text size="xs" c={venue.cmPerPx ? "dimmed" : "orange.8"}>
        {first ? "Now click the other end of the known length." : venue.cmPerPx ? `Scale set: 1 m is ${(100 / venue.cmPerPx).toFixed(0)} pixels. Click two points to set it again.` : "Click both ends of something whose length you know (a wall, a scale bar), then enter its length in metres."}
      </Text>
      <Box style={{ position: "relative", border: "1px solid var(--mantine-color-gray-3)" }}>
        <img src={venue.image} style={{ display: "block", width: "100%" }} alt="" draggable={false} />
        <svg ref={ref} viewBox={`0 0 ${venue.width} ${venue.height}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }}
          onPointerDown={onClick} onPointerMove={(e) => setHover(toImg(e))}>
          {line && (
            <g stroke="#e8590c" strokeWidth={sw} fill="#e8590c">
              <line x1={line.a[0]} y1={line.a[1]} x2={line.b[0]} y2={line.b[1]} />
              <circle cx={line.a[0]} cy={line.a[1]} r={sw * 2} />
              <circle cx={line.b[0]} cy={line.b[1]} r={sw * 2} />
            </g>
          )}
        </svg>
      </Box>
    </Stack>
  );
}

export function VenueModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const project = useStore((s) => s.project);
  const [current, setCurrent] = useState<string | null>(null);
  const venue = project.venues.find((v) => v.id === current) ?? project.venues.find((v) => v.id === activePlan(project).venueId) ?? project.venues[0];
  const add = async (file: File | null) => {
    if (!file) return;
    try {
      const img = await loadFloorPlan(file);
      const v: Venue = { id: uid(), name: file.name.replace(/\.[^.]+$/, ""), ...img, cmPerPx: null };
      const planId = activePlan(project).id;
      setProject((p) => ({ ...p, venues: [...p.venues, v], plans: p.plans.map((pl) => (pl.id === planId ? { ...pl, venueId: v.id } : pl)) }));
      setCurrent(v.id);
      log("venue", "added", v.name, `${img.width}×${img.height}`, `${(img.image.length / 1024).toFixed(0)} kB`);
    } catch (e) {
      console.error(e);
      notifications.show({ color: "red", message: "Couldn't read that image. Use a PNG or JPEG (export PDFs as an image first)." });
    }
  };
  return (
    <Modal opened={opened} onClose={onClose} size="90%" title={<Title order={4}>Floor plans</Title>}>
      <Stack gap="sm">
        <Tip>Add an image of the room (PNG or JPEG; a screenshot of a PDF plan works). Then set its scale by clicking both ends of a known length. Platforms are drawn to scale on top of it. Floor plans are saved in this browser, so keep them small.</Tip>
        <Group align="flex-start" wrap="nowrap" gap="md">
          <Stack gap={4} w={200} style={{ flex: "none" }}>
            {project.venues.map((v) => <NavLink key={v.id} label={v.name} description={v.cmPerPx ? "Scale set" : "No scale yet"} active={v.id === venue?.id} onClick={() => setCurrent(v.id)} />)}
            <FileButton onChange={add} accept="image/png,image/jpeg,image/webp,image/gif">
              {(props) => <Button {...props} size="xs" variant="light" leftSection={<IconPhotoPlus size={14} />}>Add floor plan</Button>}
            </FileButton>
          </Stack>
          {venue ? <VenueEditor key={venue.id} venue={venue} /> : <Text size="sm" c="dimmed">No floor plans yet.</Text>}
        </Group>
      </Stack>
    </Modal>
  );
}

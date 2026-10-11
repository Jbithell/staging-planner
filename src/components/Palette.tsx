import { Alert, Badge, Button, Group, Paper, Select, SegmentedControl, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useLocalStorage } from "@mantine/hooks";
import { IconBulb, IconChevronDown, IconChevronUp, IconHandClick, IconMap, IconStairs, IconFence } from "@tabler/icons-react";
import { CATALOGUE, ITEMS, STAIRS } from "../catalogue";
import type { Plan, Platform, Project, Side, Tool } from "../types";
import type { Analysis } from "../lib/analysis";
import { remaining } from "../lib/bom";
import { footprint, polysOverlap } from "../lib/geometry";
import { uid } from "../lib/util";
import { select, setProject, setStairKind, setTool, updatePlan, useStore } from "../store";
import { DRAG_MIME, defaultSupport, freeSpot } from "./PlanView";
import { ItemThumb, ThomannLink } from "./ItemThumb";

export function Tip({ children }: { children: React.ReactNode }) {
  return <Alert variant="light" color="orange" icon={<IconBulb size={18} />} p="xs"><Text size="xs">{children}</Text></Alert>;
}

function addPlatform(project: Project, plan: Plan, a: Analysis, no: string) {
  const [x, y] = freeSpot(plan, no, project.gridCm);
  const p: Platform = { id: uid(), item: no, x, y, rot: 0, support: { item: defaultSupport(project, plan, a) } };
  if (plan.platforms.some((q) => polysOverlap(footprint(p).pts, footprint(q).pts))) return;
  if (updatePlan((pl) => ({ ...pl, platforms: [...pl.platforms, p] }))) select([p.id]);
}

function PlatformCard({ project, plan, a, no }: { project: Project; plan: Plan; a: Analysis; no: string }) {
  const it = ITEMS[no];
  const free = remaining(project, plan, a, no);
  const usable = free > 0 || project.allowOverInventory;
  return (
    <Tooltip label={usable ? "Click to add, or drag onto the plan" : "You don't own any more of these. Add them in “Parts I own”, or turn on “Plan beyond what I own”."} openDelay={300} multiline w={220}>
      <UnstyledButton
        draggable={usable}
        onDragStart={(e) => { e.dataTransfer.setData(DRAG_MIME, no); e.dataTransfer.effectAllowed = "copy"; }}
        onClick={() => usable ? addPlatform(project, plan, a, no) : notifications.show({ color: "orange", message: `You have no ${it.short} platforms left. Add more in “Parts I own”, or turn on “Plan beyond what I own”.` })}
        style={{ opacity: usable ? 1 : 0.5, cursor: usable ? "grab" : "not-allowed" }}
      >
        <Paper withBorder p={6} radius="sm">
          <Group gap="xs" wrap="nowrap">
            <ItemThumb no={no} size={40} />
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={6} justify="space-between" wrap="nowrap">
                <Text size="sm" fw={600}>{it.short}</Text>
                <Badge size="xs" variant="light" color={free > 0 ? "teal" : "gray"}>{free} free</Badge>
              </Group>
              <Text size="xs" c="dimmed" truncate>{it.w! / 100} × {it.d! / 100} m{it.rated ? "" : " · decorative"} · <ThomannLink no={no} /></Text>
            </Stack>
          </Group>
        </Paper>
      </UnstyledButton>
    </Tooltip>
  );
}

export function Palette({ project, plan, a, onVenues }: { project: Project; plan: Plan; a: Analysis; onVenues: () => void }) {
  const tool = useStore((s) => s.tool);
  const stairKind = useStore((s) => s.stairKind);
  const platforms = CATALOGUE.filter((i) => i.group === "platform");
  const owned = platforms.filter((i) => (project.inventory[i.no] ?? 0) > 0);
  const others = platforms.filter((i) => !(project.inventory[i.no] ?? 0));
  const [showOthers, setShowOthers] = useLocalStorage({ key: "tsp:showOtherPlatforms", defaultValue: false });

  return (
    <Stack gap="sm">
      <SegmentedControl fullWidth size="xs" value={tool} onChange={(v) => setTool(v as Tool)} data={[
        { value: "select", label: <Group gap={4} justify="center" wrap="nowrap"><IconHandClick size={14} />Move</Group> },
        { value: "rail", label: <Group gap={4} justify="center" wrap="nowrap"><IconFence size={14} />Rails</Group> },
        { value: "stair", label: <Group gap={4} justify="center" wrap="nowrap"><IconStairs size={14} />Stairs</Group> },
      ]} />
      {tool === "select" && <Tip>Drag platforms around. <b>R</b> rotates, <b>Delete</b> removes, <b>Shift</b>-click or Shift-drag selects several. Handrails and stairs fixed to a platform move with it. Drag empty space to pan; scroll to zoom.</Tip>}
      {tool === "rail" && <Tip>Red dashed edges are open upstage edges and <b>must</b> have handrails. Amber ones are open sides: rail them if people could fall. Click an edge to add a 2m handrail (1m when 2m doesn't fit or you hold <b>Shift</b>); click a handrail to remove it.</Tip>}
      {tool === "stair" && (
        <>
          <Tip>Click an open edge to put stairs there; the edge doesn't need a handrail where the stairs are. Click stairs to remove them.</Tip>
          <Select size="xs" label="Stairs" value={stairKind} onChange={(v) => v && setStairKind(v)} allowDeselect={false}
            data={[{ value: "auto", label: "Pick for the stage height" }, ...STAIRS.map((s) => ({ value: s.id, label: `${s.label} · ${s.minHeight}–${s.maxHeight}cm` }))]} />
        </>
      )}

      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt={4}>Platforms you own</Text>
      {owned.length ? owned.map((i) => <PlatformCard key={i.no} project={project} plan={plan} a={a} no={i.no} />) : <Text size="xs" c="dimmed">None yet: add them in “Parts I own”.</Text>}
      {others.length > 0 && (
        <Button size="xs" variant="subtle" color="gray" justify="space-between" rightSection={showOthers ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />} onClick={() => setShowOthers((v) => !v)}>
          {showOthers ? "Hide" : "Show"} {others.length} other Tour Stage platforms
        </Button>
      )}
      {showOthers && others.map((i) => <PlatformCard key={i.no} project={project} plan={plan} a={a} no={i.no} />)}

      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt={4}>Plan settings</Text>
      <Select size="xs" label="Audience is at the" value={plan.audience} allowDeselect={false}
        onChange={(v) => v && updatePlan((pl) => ({ ...pl, audience: v as Side }))}
        data={[{ value: "top", label: "Top of the drawing" }, { value: "bottom", label: "Bottom of the drawing" }, { value: "left", label: "Left of the drawing" }, { value: "right", label: "Right of the drawing" }]} />
      <Select size="xs" label="Snap to grid" value={String(project.gridCm)} allowDeselect={false}
        onChange={(v) => v && setProject((p) => ({ ...p, gridCm: Number(v) }), false)}
        data={[{ value: "10", label: "10 cm" }, { value: "25", label: "25 cm" }, { value: "50", label: "50 cm" }, { value: "100", label: "1 m" }]} />
      <Group gap="xs" align="end" wrap="nowrap">
        <Select size="xs" label="Floor plan" style={{ flex: 1 }} value={plan.venueId ?? ""} allowDeselect={false}
          onChange={(v) => updatePlan((pl) => ({ ...pl, venueId: v || null }))}
          data={[{ value: "", label: "None (plain grid)" }, ...project.venues.map((v) => ({ value: v.id, label: v.name + (v.cmPerPx ? "" : " (no scale)") }))]} />
        <Tooltip label="Add or set up floor plans"><Button size="xs" variant="default" onClick={onVenues} leftSection={<IconMap size={14} />}>Edit</Button></Tooltip>
      </Group>
    </Stack>
  );
}

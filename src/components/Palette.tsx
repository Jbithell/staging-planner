import { Alert, Badge, Button, Group, Paper, Select, SegmentedControl, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useLocalStorage } from "@mantine/hooks";
import { IconBulb, IconChevronDown, IconChevronUp, IconFence, IconLayoutGrid, IconMap, IconStairs } from "@tabler/icons-react";
import { CATALOGUE, ITEMS, STAIRS } from "../catalogue";
import type { Plan, Platform, Project, Side, Tool } from "../types";
import type { Analysis } from "../lib/analysis";
import { remaining } from "../lib/bom";
import { footprint, polysOverlap } from "../lib/geometry";
import { uid } from "../lib/util";
import { select, setProject, setRailItem, setStairKind, setTool, updatePlan, useStore } from "../store";
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

/** A part with its Thomann photo: platforms to add, or the handrail / stairs the tool will place. */
function PartCard({ no, title, subtitle, free, active, usable, tooltip, onClick, dragNo }: {
  no: string; title: string; subtitle: React.ReactNode; free: number; active?: boolean; usable: boolean; tooltip: string; onClick: () => void; dragNo?: string;
}) {
  return (
    <Tooltip label={tooltip} openDelay={300} multiline w={220}>
      <UnstyledButton
        draggable={!!dragNo && usable}
        onDragStart={(e) => { if (dragNo) { e.dataTransfer.setData(DRAG_MIME, dragNo); e.dataTransfer.effectAllowed = "copy"; } }}
        onClick={onClick}
        style={{ opacity: usable ? 1 : 0.5, cursor: !usable ? "not-allowed" : dragNo ? "grab" : "pointer" }}
      >
        <Paper withBorder p={6} radius="sm" style={active ? { borderColor: "var(--mantine-color-orange-6)", boxShadow: "0 0 0 1px var(--mantine-color-orange-6)", background: "var(--mantine-color-orange-0)" } : undefined}>
          <Group gap="xs" wrap="nowrap">
            <ItemThumb no={no} size={40} />
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={6} justify="space-between" wrap="nowrap">
                <Text size="sm" fw={600} truncate>{title}</Text>
                <Badge size="xs" variant="light" color={free > 0 ? "teal" : "gray"} style={{ flex: "none" }}>{free} free</Badge>
              </Group>
              <Text size="xs" c="dimmed" truncate>{subtitle}</Text>
            </Stack>
          </Group>
        </Paper>
      </UnstyledButton>
    </Tooltip>
  );
}

const NOT_OWNED = "You don't own any more of these. Add them in “Parts I own”, or turn on “Plan beyond what I own”.";

function PlatformCard({ project, plan, a, no }: { project: Project; plan: Plan; a: Analysis; no: string }) {
  const it = ITEMS[no];
  const free = remaining(project, plan, a, no);
  const usable = free > 0 || project.allowOverInventory;
  return (
    <PartCard no={no} title={it.short} free={free} usable={usable} dragNo={no}
      subtitle={<>{it.w! / 100} × {it.d! / 100} m{it.rated ? "" : " · decorative"} · <ThomannLink no={no} /></>}
      tooltip={usable ? "Click to add, or drag onto the plan" : NOT_OWNED}
      onClick={() => usable ? addPlatform(project, plan, a, no) : notifications.show({ color: "orange", message: `You have no ${it.short} platforms left. Add more in “Parts I own”, or turn on “Plan beyond what I own”.` })} />
  );
}

function RailCards({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const railItem = useStore((s) => s.railItem);
  return (
    <>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt={4}>Handrail to place</Text>
      {CATALOGUE.filter((i) => i.group === "rail").map((it) => {
        const free = remaining(project, plan, a, it.no);
        const usable = free > 0 || project.allowOverInventory;
        return (
          <PartCard key={it.no} no={it.no} title={it.short} free={free} usable={usable} active={railItem === it.no}
            subtitle={<>{it.name.replace("Stairville Tour Stage ", "")} · <ThomannLink no={it.no} /></>}
            tooltip={usable ? `Click open edges to add ${it.short} handrails` : NOT_OWNED}
            onClick={() => setRailItem(it.no)} />
        );
      })}
    </>
  );
}

function StairCards({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const stairKind = useStore((s) => s.stairKind);
  const freeOf = (items: string[]) => Math.min(...items.map((no) => remaining(project, plan, a, no)));
  return (
    <>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt={4}>Stairs to place</Text>
      <Tooltip label="Uses whichever stairs suit the height of the platform you click, preferring ones you own" multiline w={220} openDelay={300}>
        <UnstyledButton onClick={() => setStairKind("auto")}>
          <Paper withBorder p={8} radius="sm" style={stairKind === "auto" ? { borderColor: "var(--mantine-color-orange-6)", boxShadow: "0 0 0 1px var(--mantine-color-orange-6)", background: "var(--mantine-color-orange-0)" } : undefined}>
            <Text size="sm" fw={600}>Pick for the stage height</Text>
            <Text size="xs" c="dimmed">Chooses the right stairs for each platform</Text>
          </Paper>
        </UnstyledButton>
      </Tooltip>
      {STAIRS.map((k) => {
        const free = freeOf(k.items);
        const usable = free > 0 || project.allowOverInventory;
        return (
          <PartCard key={k.id} no={k.items[0]} title={k.short} free={free} usable={usable} active={stairKind === k.id}
            subtitle={<>For {k.minHeight}–{k.maxHeight}cm · {k.items.map((no, i) => <span key={no}>{i ? " + " : ""}<ThomannLink no={no} /></span>)}</>}
            tooltip={usable ? `Click an open edge to add ${k.label}` : NOT_OWNED}
            onClick={() => setStairKind(k.id)} />
        );
      })}
    </>
  );
}

export function Palette({ project, plan, a, onVenues }: { project: Project; plan: Plan; a: Analysis; onVenues: () => void }) {
  const tool = useStore((s) => s.tool);
  const platforms = CATALOGUE.filter((i) => i.group === "platform");
  const owned = platforms.filter((i) => (project.inventory[i.no] ?? 0) > 0);
  const others = platforms.filter((i) => !(project.inventory[i.no] ?? 0));
  const [showOthers, setShowOthers] = useLocalStorage({ key: "tsp:showOtherPlatforms", defaultValue: false });

  return (
    <Stack gap="sm">
      <SegmentedControl fullWidth size="xs" value={tool} onChange={(v) => setTool(v as Tool)} data={[
        { value: "select", label: <Group gap={4} justify="center" wrap="nowrap"><IconLayoutGrid size={14} />Platforms</Group> },
        { value: "rail", label: <Group gap={4} justify="center" wrap="nowrap"><IconFence size={14} />Rails</Group> },
        { value: "stair", label: <Group gap={4} justify="center" wrap="nowrap"><IconStairs size={14} />Stairs</Group> },
      ]} />
      {tool === "select" && (
        <>
          <Tip>Click or drag a platform onto the plan, then drag it around. <b>R</b> rotates, <b>Delete</b> removes, <b>Shift</b>-click or Shift-drag selects several. Handrails and stairs fixed to a platform move with it. Drag empty space to pan; scroll to zoom.</Tip>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt={4}>Platforms you own</Text>
          {owned.length ? owned.map((i) => <PlatformCard key={i.no} project={project} plan={plan} a={a} no={i.no} />) : <Text size="xs" c="dimmed">None yet: add them in “Parts I own”.</Text>}
          {others.length > 0 && (
            <Button size="xs" variant="subtle" color="gray" justify="space-between" rightSection={showOthers ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />} onClick={() => setShowOthers((v) => !v)}>
              {showOthers ? "Hide" : "Show"} {others.length} other Tour Stage platforms
            </Button>
          )}
          {showOthers && others.map((i) => <PlatformCard key={i.no} project={project} plan={plan} a={a} no={i.no} />)}
        </>
      )}
      {tool === "rail" && (
        <>
          <Tip>Red dashed edges are open upstage edges and <b>must</b> have handrails. Amber ones are open sides: rail them if people could fall. Pick a handrail below, then click an edge to add it; click a handrail on the plan to remove it.</Tip>
          <RailCards project={project} plan={plan} a={a} />
        </>
      )}
      {tool === "stair" && (
        <>
          <Tip>Pick stairs below, then click an open edge to put them there; the edge doesn't need a handrail where the stairs are. Click stairs on the plan to remove them.</Tip>
          <StairCards project={project} plan={plan} a={a} />
        </>
      )}

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

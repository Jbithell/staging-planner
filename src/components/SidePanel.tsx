import { Badge, Button, Checkbox, Group, NumberInput, Paper, ScrollArea, Select, Stack, Table, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCircleCheck, IconCircleX, IconRotateClockwise2, IconTrash } from "@tabler/icons-react";
import { CATALOGUE, FLOOR, ITEMS, STAIR_KINDS, STAIRS } from "../catalogue";
import type { Plan, Project, Support } from "../types";
import type { Analysis } from "../lib/analysis";
import { bom, remaining } from "../lib/bom";
import { footprint, legCount } from "../lib/geometry";
import { deleteIds, rotateIds } from "../lib/edit";
import { select, updatePlan, useStore } from "../store";
import { ItemThumb, ThomannLink } from "./ItemThumb";

const SUPPORTS = CATALOGUE.filter((i) => i.group === "support" && (i.height != null || i.minHeight != null));

export function rotateSelection(project: Project, plan: Plan, ids: string[]) {
  const next = rotateIds(plan, ids, project.gridCm);
  if (!next) notifications.show({ color: "red", message: "There isn't room to rotate it there." });
  else updatePlan(() => next);
}

function SupportEditor({ project, plan, a, ids }: { project: Project; plan: Plan; a: Analysis; ids: string[] }) {
  const plats = plan.platforms.filter((p) => ids.includes(p.id));
  const current = new Set(plats.map((p) => p.support.item));
  const value = current.size === 1 ? [...current][0] : null;
  // Legs needed if every selected platform switched to the same leg type
  const legsNeeded = plats.reduce((s, p) => s + legCount({ ...p, support: { item: "legs" } }), 0);
  const options = [
    ...SUPPORTS.map((it) => {
      const own = plats.filter((p) => p.support.item === it.no).reduce((s, p) => s + legCount(p), 0);
      const free = remaining(project, plan, a, it.no) + own;
      const range = it.minHeight != null ? `${it.minHeight}–${it.maxHeight}cm` : `${it.height}cm`;
      return { value: it.no, label: `${it.short} · ${range} · ${free} free`, disabled: !project.allowOverInventory && free < legsNeeded, owned: (project.inventory[it.no] ?? 0) > 0 };
    }).sort((x, y) => Number(y.owned) - Number(x.owned)),
    { value: FLOOR, label: "No legs: on the floor · 9cm", disabled: false, owned: true },
  ];
  const tele = value && ITEMS[value]?.minHeight != null ? ITEMS[value] : null;
  const apply = (fn: (s: Support) => Support) => updatePlan((pl) => ({ ...pl, platforms: pl.platforms.map((p) => (ids.includes(p.id) ? { ...p, support: fn(p.support) } : p)) }));
  const rollriser = plats.every((p) => p.support.rollriser);
  return (
    <Stack gap={6}>
      <Select size="xs" label="Legs" value={value} placeholder="Mixed" allowDeselect={false} data={options.map(({ owned: _, ...o }) => o)}
        onChange={(v) => v && apply((s) => ({ item: v, rollriser: v === FLOOR ? false : s.rollriser, height: ITEMS[v]?.minHeight != null ? Math.max(ITEMS[v].minHeight!, Math.min(ITEMS[v].maxHeight!, s.height ?? ITEMS[v].minHeight!)) : undefined }))} />
      {value && value !== FLOOR && <Text size="xs" c="dimmed">{ITEMS[value]?.note} <ThomannLink no={value}>View on Thomann</ThomannLink></Text>}
      {tele && (
        <NumberInput size="xs" label="Leg height (cm)" min={tele.minHeight} max={tele.maxHeight} step={5} clampBehavior="blur"
          value={plats[0].support.height ?? tele.minHeight} onChange={(v) => typeof v === "number" && v >= tele.minHeight! && v <= tele.maxHeight! && apply((s) => ({ ...s, height: v }))} />
      )}
      {value !== FLOOR && (
        <Checkbox size="xs" label="On Rollriser wheels (+13cm)" checked={rollriser} onChange={(e) => apply((s) => ({ ...s, rollriser: e.currentTarget.checked }))} />
      )}
    </Stack>
  );
}

function Selection({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const selection = useStore((s) => s.selection);
  const plats = plan.platforms.filter((p) => selection.includes(p.id));
  const rails = plan.rails.filter((r) => selection.includes(r.id));
  const stairs = plan.stairs.filter((s) => selection.includes(s.id));
  if (!selection.length) return <Text size="xs" c="dimmed">Click a platform, handrail or stairs to change it.</Text>;
  const remove = () => { updatePlan((pl) => deleteIds(pl, selection)); select([]); };
  const single = plats.length === 1 && !rails.length && !stairs.length ? plats[0] : null;
  return (
    <Stack gap="xs">
      {single ? (
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <ItemThumb no={single.item} size={48} />
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text size="sm" fw={600}>{ITEMS[single.item]?.name}</Text>
            <Text size="xs" c="dimmed">{a.heights[single.id]}cm high · at {(single.x / 100).toFixed(2)}, {(single.y / 100).toFixed(2)} m · <ThomannLink no={single.item} /></Text>
            {!ITEMS[single.item]?.rated && <Text size="xs" c="orange.8">Decorative format: Thomann rate only the 2x1 and 1x1 at 750kg/m².</Text>}
          </Stack>
        </Group>
      ) : (
        <Text size="sm" fw={600}>
          {[plats.length && `${plats.length} platform${plats.length > 1 ? "s" : ""}`, rails.length && `${rails.length} handrail${rails.length > 1 ? "s" : ""}`, stairs.length && `${stairs.length} stairs`].filter(Boolean).join(", ")}
        </Text>
      )}
      {plats.length > 0 && <SupportEditor key={selection.join()} project={project} plan={plan} a={a} ids={plats.map((p) => p.id)} />}
      {rails.length === 1 && !plats.length && (
        <Select size="xs" label="Handrail" value={rails[0].item} allowDeselect={false}
          data={CATALOGUE.filter((i) => i.group === "rail").map((i) => ({ value: i.no, label: `${i.short} · ${remaining(project, plan, a, i.no)} free` }))}
          onChange={(v) => v && updatePlan((pl) => ({ ...pl, rails: pl.rails.map((r) => (r.id === rails[0].id ? { ...r, item: v } : r)) }))} />
      )}
      {stairs.length === 1 && !plats.length && (() => {
        const s = stairs[0], k = STAIR_KINDS[s.kind];
        const host = a.stairHost[s.id];
        return (
          <>
            <Select size="xs" label={`Stairs${host ? ` (stage ${a.heights[host]}cm)` : ""}`} value={s.kind} allowDeselect={false}
              data={STAIRS.map((x) => ({ value: x.id, label: `${x.label} · ${x.minHeight}–${x.maxHeight}cm` }))}
              onChange={(v) => v && updatePlan((pl) => ({ ...pl, stairs: pl.stairs.map((x) => (x.id === s.id ? { ...x, kind: v } : x)) }))} />
            {k?.rail && (
              <Select size="xs" label="Stair handrails" value={String(s.handrails)} allowDeselect={false}
                data={[{ value: "0", label: "None" }, { value: "1", label: "One side" }, { value: "2", label: "Both sides" }]}
                onChange={(v) => updatePlan((pl) => ({ ...pl, stairs: pl.stairs.map((x) => (x.id === s.id ? { ...x, handrails: Number(v) as 0 | 1 | 2 } : x)) }))} />
            )}
            <Group gap={6}>{k?.items.map((no) => <ThomannLink key={no} no={no}>{ITEMS[no]?.short}</ThomannLink>)}</Group>
          </>
        );
      })()}
      <Group gap="xs">
        {(plats.length > 0 || rails.length > 0) && <Button size="xs" variant="default" leftSection={<IconRotateClockwise2 size={14} />} onClick={() => rotateSelection(project, plan, selection)}>Rotate (R)</Button>}
        <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />} onClick={remove}>Delete</Button>
      </Group>
    </Stack>
  );
}

function Issues({ a }: { a: Analysis }) {
  const errors = a.issues.filter((i) => i.level === "error").length;
  if (!a.issues.length) return <Group gap={6}><IconCircleCheck size={18} color="#2f9e44" /><Text size="sm" c="teal.8">No problems found.</Text></Group>;
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">{errors} to fix, {a.issues.length - errors} to check. Click one to select it.</Text>
      {a.issues.map((i, k) => (
        <UnstyledButton key={k} onClick={() => select(i.ids)}>
          <Group gap={6} wrap="nowrap" align="flex-start">
            {i.level === "error" ? <IconCircleX size={16} color="#e03131" style={{ flex: "none", marginTop: 2 }} /> : <IconAlertTriangle size={16} color="#f08c00" style={{ flex: "none", marginTop: 2 }} />}
            <Text size="xs">{i.text}</Text>
          </Group>
        </UnstyledButton>
      ))}
    </Stack>
  );
}

function PartsSummary({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const lines = bom(project, plan, a);
  return (
    <Table fz="xs" verticalSpacing={2} horizontalSpacing={4}>
      <Table.Thead><Table.Tr><Table.Th>Part</Table.Th><Table.Th ta="right">Need</Table.Th><Table.Th ta="right">Own</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>
        {lines.map((l) => (
          <Table.Tr key={l.no}>
            <Table.Td>
              <Tooltip label={l.why ?? l.label} openDelay={300}><span>{ITEMS[l.no]?.short ?? l.label}{l.estimate ? " *" : ""}</span></Tooltip>
            </Table.Td>
            <Table.Td ta="right">{l.pieces}</Table.Td>
            <Table.Td ta="right">
              {l.shortPieces > 0 ? <Badge size="xs" color={l.hard ? "red" : "orange"} variant="light">{l.ownedPieces} (−{l.shortPieces})</Badge> : l.ownedPieces}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function SidePanel({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const area = plan.platforms.reduce((s, p) => { const f = footprint(p); return s + (ITEMS[p.item]?.shape === "rect" ? f.w * f.d : ITEMS[p.item]?.shape === "quarter" ? (Math.PI / 4) * f.w * f.d : (f.w * f.d) / 2); }, 0);
  return (
    <ScrollArea h="100%" type="auto" offsetScrollbars>
      <Stack gap="md" p="sm">
        <Paper withBorder p="xs"><Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>Selected</Text><Selection project={project} plan={plan} a={a} /></Paper>
        <Paper withBorder p="xs"><Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>Checks</Text><Issues a={a} /></Paper>
        <Paper withBorder p="xs">
          <Group justify="space-between" mb={4}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Parts for this plan</Text>
            <Text size="xs" c="dimmed">{(area / 10000).toFixed(1)} m² of stage</Text>
          </Group>
          <PartsSummary project={project} plan={plan} a={a} />
          <Text size="xs" c="dimmed" mt={4}>* estimated from the layout. Full list and shopping list under <b>Parts</b>.</Text>
        </Paper>
      </Stack>
    </ScrollArea>
  );
}


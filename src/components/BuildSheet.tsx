import { Badge, Button, Group, List, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { FLOOR, ITEMS, STAIR_KINDS } from "../catalogue";
import type { Plan, Project } from "../types";
import type { Analysis } from "../lib/analysis";
import { bom } from "../lib/bom";
import { OPPOSITE, SIDE_VEC, bbox, footprint, railEnds, type Pt } from "../lib/geometry";
import { Drawing, RAIL_COLOUR, contentBox, heightColour } from "./Drawing";
import { railOwners } from "./PlanView";
import { ItemThumb, ThomannLink } from "./ItemThumb";

const m = (cm: number) => `${(cm / 100).toFixed(2)} m`;

/** Orders things the way you'd build them: from the back (upstage) forwards, then across the drawing. */
function buildOrder<T>(plan: Plan, items: T[], centre: (t: T) => Pt): T[] {
  const away = SIDE_VEC[OPPOSITE[plan.audience]];
  const across = plan.audience === "top" || plan.audience === "bottom" ? 0 : 1;
  return [...items].sort((a, b) => {
    const ca = centre(a), cb = centre(b);
    const da = Math.round((ca[0] * away[0] + ca[1] * away[1]) / 10), db = Math.round((cb[0] * away[0] + cb[1] * away[1]) / 10);
    return db - da || ca[across] - cb[across];
  });
}

function Sheet({ plan, project, a, title, children, ...flags }: { plan: Plan; project: Project; a: Analysis; title: string; children?: React.ReactNode; numbers: Record<string, number>; railNumbers?: Record<string, number>; showJoins?: boolean; showRailJoins?: boolean; showVenue?: boolean }) {
  const b = contentBox(plan, null);
  const pad = 70;
  const vb = { x: b.x0 - pad, y: b.y0 - pad, w: b.x1 - b.x0 + pad * 2, h: b.y1 - b.y0 + pad * 2 };
  const scale = 1000 / vb.w;
  const gridX: number[] = [], gridY: number[] = [];
  for (let x = b.x0; x <= b.x1 + 0.5; x += 100) gridX.push(x);
  for (let y = b.y0; y <= b.y1 + 0.5; y += 100) gridY.push(y);
  return (
    <Paper withBorder p="md" className="sheet-page avoid-break">
      <Title order={4} mb="xs">{title}</Title>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ width: "100%", maxHeight: "70vh", display: "block" }}>
        {gridX.map((x) => <line key={`x${x}`} x1={x} x2={x} y1={b.y0} y2={b.y1} stroke="#e9ecef" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        {gridY.map((y) => <line key={`y${y}`} y1={y} y2={y} x1={b.x0} x2={b.x1} stroke="#e9ecef" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        {gridX.map((x) => <text key={`tx${x}`} x={x} y={b.y0 - 8} fontSize={11 / scale} textAnchor="middle" fill="#adb5bd">{(x - b.x0) / 100}</text>)}
        {gridY.map((y) => <text key={`ty${y}`} x={b.x0 - 8} y={y} fontSize={11 / scale} textAnchor="end" dominantBaseline="middle" fill="#adb5bd">{(y - b.y0) / 100}</text>)}
        <Drawing plan={plan} project={project} a={a} scale={scale} labels="number" showIssues={false} showVenue={flags.showVenue ?? false} {...flags} />
      </svg>
      {children}
    </Paper>
  );
}

export function BuildSheet({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const plats = buildOrder(plan, plan.platforms, (p) => { const f = footprint(p); return [f.pts[0][0] + f.w / 2, f.pts[0][1] + f.d / 2]; });
  const numbers = Object.fromEntries(plats.map((p, i) => [p.id, i + 1]));
  const rails = buildOrder(plan, plan.rails, (r) => { const [p, q] = railEnds(r); return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; });
  const railNumbers = Object.fromEntries(rails.map((r, i) => [r.id, i + 1]));
  const lines = bom(project, plan, a);
  const box = plan.platforms.length ? bbox(plan.platforms.flatMap((p) => footprint(p).pts)) : { x0: 0, y0: 0, x1: 0, y1: 0 };
  const weight = lines.reduce((s, l) => s + (l.weight ?? 0), 0);
  const P = (id: string) => `P${numbers[id]}`;
  const facingWord = (id: string, r: (typeof rails)[number]) => {
    const u = a.units.find((u) => u.pid === id && u.axis === r.dir && (r.dir === "h" ? Math.abs(u.mid[1] - r.y) < 1 : Math.abs(u.mid[0] - r.x) < 1));
    return u?.facing === "upstage" ? "upstage edge" : u?.facing === "downstage" ? "downstage edge" : "side";
  };
  const clamp4 = a.legs.filter((c) => c.level && c.pids.length >= 4);
  const clamp2 = a.legs.filter((c) => c.level && c.pids.length >= 2 && c.pids.length < 4);

  if (!plan.platforms.length) return <Text c="dimmed" p="xl">This plan has no platforms yet.</Text>;

  return (
    <Stack gap="md" p="md" maw={1200} mx="auto" className="print-root">
      <Group justify="space-between" className="no-print">
        <Text size="sm" c="dimmed">A printable build sheet for whoever puts the stage up. Print it in landscape.</Text>
        <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>Print</Button>
      </Group>
      <Paper withBorder p="md" className="sheet-page">
        <Title order={2}>{plan.name}</Title>
        {plan.notes && <Text size="sm" mb="xs">{plan.notes}</Text>}
        <Text size="sm" c="dimmed" mb="sm">
          Stairville Tour Stage · {plan.platforms.length} platforms · stage {m(box.x1 - box.x0)} × {m(box.y1 - box.y0)} · heights {[...new Set(Object.values(a.heights))].sort((x, y) => x - y).map((h) => `${h}cm`).join(", ")} · about {Math.round(weight)} kg
        </Text>
        {a.issues.some((i) => i.level === "error") && <Badge color="red" mb="sm">{(() => { const n = a.issues.filter((i) => i.level === "error").length; return `This plan still has ${n} problem${n > 1 ? "s" : ""} — check it before building`; })()}</Badge>}
        <Title order={4} mb={4}>Pick list</Title>
        <Table fz="sm" verticalSpacing={3}>
          <Table.Thead><Table.Tr><Table.Th /><Table.Th>Part</Table.Th><Table.Th>Item no.</Table.Th><Table.Th ta="right">Pieces</Table.Th><Table.Th /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {lines.map((l) => {
              const no = l.no;
              return (
                <Table.Tr key={l.no}>
                  <Table.Td w={44}><ItemThumb no={no} size={34} /></Table.Td>
                  <Table.Td>{ITEMS[no]?.name ?? l.label}{l.estimate && <Text span size="xs" c="dimmed"> (estimate)</Text>}</Table.Td>
                  <Table.Td><ThomannLink no={no} /></Table.Td>
                  <Table.Td ta="right"><b>{l.pieces}</b></Table.Td>
                  <Table.Td>{l.shortPieces > 0 && <Badge size="xs" color="red" variant="light">{l.shortPieces} not owned</Badge>}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed" mt={4}>Each handrail comes with its two railing holders. Bring an Allen key for the assembly clamps and railing holders.</Text>
      </Paper>

      <Sheet plan={plan} project={project} a={a} numbers={numbers} title="1 · Set out the platforms" showVenue>
        <Text size="xs" c="dimmed" mt={4}>Grid in metres from the back-left corner of the stage as drawn. Border colour shows the stage height.</Text>
        <Table fz="sm" mt="xs" verticalSpacing={2}>
          <Table.Thead><Table.Tr><Table.Th>No.</Table.Th><Table.Th>Platform</Table.Th><Table.Th>Legs</Table.Th><Table.Th>Height</Table.Th><Table.Th>Corner at (across, down)</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {plats.map((p) => {
              const f = footprint(p);
              const s = p.support;
              return (
                <Table.Tr key={p.id}>
                  <Table.Td fw={700}>P{numbers[p.id]}</Table.Td>
                  <Table.Td>{ITEMS[p.item]?.short} {f.d > f.w ? "(long side down the drawing)" : ""}</Table.Td>
                  <Table.Td>{s.item === FLOOR ? "none" : `${f.legs.length} × ${ITEMS[s.item]?.short}${s.height && ITEMS[s.item]?.minHeight != null ? ` set to ${s.height}cm` : ""}${s.rollriser ? " on Rollrisers" : ""}`}</Table.Td>
                  <Table.Td><Badge size="sm" variant="outline" style={{ borderColor: heightColour(a.heights[p.id]), color: "#212529" }}>{a.heights[p.id]}cm</Badge></Table.Td>
                  <Table.Td>{m(p.x - box.x0)}, {m(p.y - box.y0)}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Sheet>

      <Sheet plan={plan} project={project} a={a} numbers={numbers} title="2 · Join the platforms" showJoins>
        <Group gap="lg" mt="xs">
          <Text size="xs"><span style={{ color: "#40c057" }}>■</span> Assembly clamp (with self-levelling wedges either side)</Text>
          <Text size="xs"><span style={{ color: "#e64980" }}>●</span> Leg clamp 4</Text>
          <Text size="xs"><span style={{ color: "#7950f2" }}>●</span> Leg clamp 2</Text>
          <Text size="xs"><span style={{ color: "#adb5bd" }}>●</span> Leg (no clamp)</Text>
        </Group>
        <List size="sm" mt="xs" spacing={2}>
          {[...a.joints].map((j) => (numbers[j.a] < numbers[j.b] ? j : { ...j, a: j.b, b: j.a })).sort((x, y) => numbers[x.a] - numbers[y.a] || numbers[x.b] - numbers[y.b]).map((j) => {
            const n = Math.max(1, Math.ceil(j.len / 100 - 0.05));
            return <List.Item key={`${j.a}${j.b}`}>{P(j.a)} – {P(j.b)}: {n} assembly clamp{n > 1 ? "s" : ""}, {n * 2} self-levelling wedges ({m(j.len)} joint)</List.Item>;
          })}
          {clamp4.length > 0 && <List.Item>Leg clamp 4 where {clamp4.map((c) => c.pids.map(P).join("/")).join(", ")} meet</List.Item>}
          {clamp2.length > 0 && <List.Item>Leg clamp 2 at {clamp2.map((c) => c.pids.map(P).join("/")).join(", ")}</List.Item>}
          {a.legs.some((c) => !c.level && c.pids.length > 1) && <List.Item>Where platforms of different heights meet, the legs aren't clamped together.</List.Item>}
        </List>
      </Sheet>

      {(plan.rails.length > 0 || plan.stairs.length > 0) && (
        <Sheet plan={plan} project={project} a={a} numbers={numbers} railNumbers={railNumbers} title="3 · Handrails and stairs" showRailJoins>
          <List size="sm" mt="xs" spacing={2}>
            {rails.map((r) => {
              const owners = [...railOwners(r, a)];
              return <List.Item key={r.id}><b style={{ color: RAIL_COLOUR }}>R{railNumbers[r.id]}</b> {ITEMS[r.item]?.short} along the {owners.length ? facingWord(owners[0], r) : "edge"} of {owners.map(P).join(" and ") || "?"}</List.Item>;
            })}
            {a.railJoins.length > 0 && <List.Item>{a.railJoins.length} handrail clamp{a.railJoins.length > 1 ? "s" : ""} where handrail ends meet (◆)</List.Item>}
            {plan.stairs.map((s) => {
              const k = STAIR_KINDS[s.kind];
              const host = a.stairHost[s.id];
              return <List.Item key={s.id}>{k?.label ?? "Stairs"} at {host ? P(host) : "?"}{s.handrails ? `, with ${s.handrails} stair handrail${s.handrails > 1 ? "s" : ""}` : ""}</List.Item>;
            })}
          </List>
        </Sheet>
      )}
    </Stack>
  );
}

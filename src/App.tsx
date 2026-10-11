import { useEffect, useMemo } from "react";
import { ActionIcon, Anchor, AppShell, Badge, Box, Button, Group, Kbd, List, Modal, ScrollArea, SegmentedControl, Stack, Table, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconArrowBackUp, IconArrowForwardUp, IconBox, IconCloudCheck, IconCloudUpload, IconHelp, IconLayoutBoard } from "@tabler/icons-react";
import type { View } from "./types";
import { activePlan, redo, select, setTool, setView, undo, updatePlan, useStore } from "./store";
import { analyse } from "./lib/analysis";
import { deleteIds, nudgeIds } from "./lib/edit";
import { PlanView } from "./components/PlanView";
import { Palette } from "./components/Palette";
import { SidePanel, rotateSelection } from "./components/SidePanel";
import { PlanMenu } from "./components/PlanMenu";
import { InventoryModal } from "./components/InventoryModal";
import { VenueModal } from "./components/VenueModal";
import { BuildSheet } from "./components/BuildSheet";
import { PartsView } from "./components/PartsView";

function SaveIndicator() {
  const s = useStore((st) => st.saveState);
  if (s === "error") return <Badge color="red" leftSection={<IconAlertTriangle size={12} />}>Save failed – download your file!</Badge>;
  if (s === "saved") return <Tooltip label="Saved in this browser. Use Download file to back up or move to another computer."><Badge variant="light" color="teal" leftSection={<IconCloudCheck size={12} />}>Saved</Badge></Tooltip>;
  return <Badge variant="light" color="gray" leftSection={<IconCloudUpload size={12} />}>Saving…</Badge>;
}

function HelpModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ["Undo / redo", <><Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> / <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>Z</Kbd></>],
    ["Tools", <><Kbd>M</Kbd> move · <Kbd>H</Kbd> handrails · <Kbd>S</Kbd> stairs</>],
    ["Rotate selection", <Kbd>R</Kbd>],
    ["Delete selection", <><Kbd>Delete</Kbd> / <Kbd>Backspace</Kbd></>],
    ["Nudge selection by one grid step", "Arrow keys"],
    ["Select several", <><Kbd>Shift</Kbd>-click, or <Kbd>Shift</Kbd>-drag a box</>],
    ["Select all / none", <><Kbd>Ctrl</Kbd>+<Kbd>A</Kbd> / <Kbd>Esc</Kbd></>],
    ["Pan / zoom / fit", <>Drag empty space · mouse wheel · <Kbd>0</Kbd></>],
    ["1m handrail instead of 2m", <>Hold <Kbd>Shift</Kbd> with the handrail tool</>],
  ];
  return (
    <Modal opened={opened} onClose={onClose} title={<Title order={4}>How this works</Title>} size="lg">
      <Stack gap="sm">
        <Text size="sm">Tour Stage Planner lays out a <b>Stairville Tour Stage</b> deck from the parts you own.</Text>
        <List type="ordered" size="sm" spacing={4}>
          <List.Item><b>Parts I own</b>: check the quantities. Plans can only use what's listed there, unless you turn on <i>Plan beyond what I own</i>.</List.Item>
          <List.Item><b>Floor plan</b> (optional): add an image of the room and set its scale, so the stage is drawn to scale on it.</List.Item>
          <List.Item><b>Platforms</b>: click or drag them from the left, move them around and pick their legs (height) on the right.</List.Item>
          <List.Item><b>Handrails</b>: open upstage edges <span style={{ color: "#e03131" }}>(red)</span> must be railed; open sides <span style={{ color: "#f08c00" }}>(amber)</span> are a warning. Above 80cm every open edge needs rails.</List.Item>
          <List.Item><b>Build sheet</b>: a printable pick list and step-by-step drawings for the people putting it up. <b>Parts</b> lists everything needed and what to buy.</List.Item>
        </List>
        <Text size="sm">Everything saves in this browser. Use <b>Download file</b> in the plan menu to back up or move to another computer; clearing browser data deletes your plans.</Text>
        <Table striped><Table.Tbody>{rows.map(([x, y]) => <Table.Tr key={x}><Table.Td><Text size="sm">{x}</Text></Table.Td><Table.Td><Text size="sm">{y}</Text></Table.Td></Table.Tr>)}</Table.Tbody></Table>
        <Text size="xs" c="dimmed">Connector counts (assembly clamps, self-levelling wedges, leg and handrail clamps) are estimates. Always follow the Tour Stage assembly instructions. Debug log: filter the browser console by “[TSP]”.</Text>
      </Stack>
    </Modal>
  );
}

export default function App() {
  const project = useStore((s) => s.project);
  const view = useStore((s) => s.view);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const plan = activePlan(project);
  const a = useMemo(() => analyse(plan), [plan]);
  const [inventory, inv] = useDisclosure(false);
  const [venues, ven] = useDisclosure(false);
  const [seenHelp, setSeenHelp] = useLocalStorage({ key: "tsp:seenHelp", defaultValue: false, getInitialValueInEffect: false });
  const [help, helpH] = useDisclosure(!seenHelp);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.ctrlKey || e.metaKey;
      const st = useStore.getState();
      const sel = st.selection;
      const pl = activePlan(st.project);
      const g = st.project.gridCm;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); select([...pl.platforms, ...pl.rails, ...pl.stairs].map((x) => x.id)); return; }
      if (mod || st.view !== "design") return;
      const k = e.key.toLowerCase();
      if (k === "m") setTool("select");
      else if (k === "h") setTool("rail");
      else if (k === "s") setTool("stair");
      else if (k === "escape") select([]);
      else if (!sel.length) return;
      else if (k === "r") rotateSelection(st.project, pl, sel);
      else if (k === "delete" || k === "backspace") { e.preventDefault(); updatePlan((p) => deleteIds(p, sel)); select([]); }
      else if (k.startsWith("arrow")) {
        e.preventDefault();
        const d = { arrowleft: [-g, 0], arrowright: [g, 0], arrowup: [0, -g], arrowdown: [0, g] }[k] ?? [0, 0];
        const next = nudgeIds(pl, sel, d[0], d[1]);
        if (next) updatePlan(() => next);
        else notifications.show({ color: "red", message: "Platforms can't overlap." });
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  const design = view === "design";
  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 290, breakpoint: 0, collapsed: { desktop: !design, mobile: !design } }} aside={{ width: 320, breakpoint: 0, collapsed: { desktop: !design, mobile: !design } }} padding={0}>
      <AppShell.Header className="no-print">
        <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="lg" radius="md"><IconLayoutBoard size={20} /></ThemeIcon>
            <Stack gap={0} visibleFrom="md">
              <Text fw={700} lh={1.1}>Tour Stage Planner</Text>
              <Text size="xs" c="dimmed" lh={1.1}>for the Stairville Tour Stage system</Text>
            </Stack>
            <PlanMenu />
            <SegmentedControl size="sm" value={view} onChange={(v) => setView(v as View)} data={[{ value: "design", label: "Design" }, { value: "build", label: "Build sheet" }, { value: "parts", label: "Parts" }]} />
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Button variant="light" leftSection={<IconBox size={16} />} onClick={inv.open}>Parts I own</Button>
            <Tooltip label="Undo (Ctrl+Z)"><ActionIcon variant="subtle" color="gray" size="lg" disabled={!canUndo} onClick={undo}><IconArrowBackUp size={20} /></ActionIcon></Tooltip>
            <Tooltip label="Redo (Ctrl+Shift+Z)"><ActionIcon variant="subtle" color="gray" size="lg" disabled={!canRedo} onClick={redo}><IconArrowForwardUp size={20} /></ActionIcon></Tooltip>
            <SaveIndicator />
            <Tooltip label="Help"><ActionIcon variant="subtle" color="gray" size="lg" onClick={helpH.open}><IconHelp size={20} /></ActionIcon></Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="no-print">
        <AppShell.Section grow component={ScrollArea} p="sm" type="auto">
          <Palette project={project} plan={plan} a={a} onVenues={ven.open} />
        </AppShell.Section>
        <AppShell.Section p="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
          <Text size="xs" c="dimmed" ta="center">
            Not affiliated with Thomann or Stairville. Product photos and links: <Anchor href="https://www.thomann.co.uk" target="_blank" size="xs">thomann.co.uk</Anchor>.{" "}
            <Tooltip label={`Built ${new Date(__BUILD_TIME__).toLocaleString()}`}><span>Version {__COMMIT__.slice(0, 7)}</span></Tooltip>
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Aside className="no-print">
        <SidePanel project={project} plan={plan} a={a} />
      </AppShell.Aside>

      <AppShell.Main h="100dvh" style={{ display: "flex", flexDirection: "column" }} className="print-scroll">
        {design ? (
          <PlanView project={project} plan={plan} a={a} />
        ) : (
          <Box style={{ flex: 1, overflow: "auto" }} className="print-scroll">
            {view === "build" ? <BuildSheet project={project} plan={plan} a={a} /> : <PartsView project={project} plan={plan} a={a} />}
          </Box>
        )}
      </AppShell.Main>

      <InventoryModal opened={inventory} onClose={inv.close} />
      {venues && <VenueModal opened onClose={ven.close} />}
      <HelpModal opened={help} onClose={() => { helpH.close(); setSeenHelp(true); }} />
    </AppShell>
  );
}

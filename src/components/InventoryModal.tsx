import { useState } from "react";
import { Button, Group, Modal, NumberInput, Stack, Switch, Table, Text, TextInput, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconSearch } from "@tabler/icons-react";
import { CATALOGUE, DEFAULT_INVENTORY, GROUP_LABELS, type Group as G } from "../catalogue";
import { setProject, useStore } from "../store";
import { gbp } from "../lib/util";
import { ItemThumb, ThomannLink } from "./ItemThumb";
import { Tip } from "./Palette";

export function setAllowOver(v: boolean) {
  setProject((p) => ({ ...p, allowOverInventory: v }), false);
}

export function InventoryModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const project = useStore((s) => s.project);
  const [q, setQ] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const setQty = (no: string, n: number) => setProject((p) => ({ ...p, inventory: { ...p.inventory, [no]: Math.max(0, Math.floor(n)) } }));
  const items = CATALOGUE.filter((i) => (!ownedOnly || (project.inventory[i.no] ?? 0) > 0) && (!q || `${i.name} ${i.no}`.toLowerCase().includes(q.toLowerCase())));
  const groups = [...new Set(items.map((i) => i.group))] as G[];
  const reset = () => modals.openConfirmModal({
    title: "Reset to the original order?",
    children: <Text size="sm">Quantities go back to what was on Thomann invoice 90373565, and everything else to 0. You can undo this.</Text>,
    labels: { confirm: "Reset", cancel: "Cancel" },
    onConfirm: () => setProject((p) => ({ ...p, inventory: { ...DEFAULT_INVENTORY } })),
  });

  return (
    <Modal opened={opened} onClose={onClose} size="xl" title={<Title order={4}>Parts I own</Title>}>
      <Stack gap="sm">
        <Tip>Enter how many of each <b>pack</b> you own (a leg set is 4 legs, a self-levelling pack is 4 pieces). Plans can only use what's here, so you always know a plan can be built from your stock. Item numbers link to Thomann.</Tip>
        <Switch checked={project.allowOverInventory} onChange={(e) => setAllowOver(e.currentTarget.checked)}
          label="Plan beyond what I own" description="Lets plans use parts you don't have yet. They show up on the shopping list under Parts." />
        <Group gap="xs">
          <TextInput size="xs" style={{ flex: 1 }} placeholder="Search parts" leftSection={<IconSearch size={14} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} />
          <Switch size="xs" label="Only parts I own" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.currentTarget.checked)} />
          <Button size="xs" variant="default" onClick={reset}>Reset to original order</Button>
        </Group>
        <Table verticalSpacing={4} fz="sm" stickyHeader>
          <Table.Thead>
            <Table.Tr><Table.Th /><Table.Th>Part</Table.Th><Table.Th>Item no.</Table.Th><Table.Th ta="right">Price</Table.Th><Table.Th w={110}>Packs owned</Table.Th></Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {groups.map((g) => [
              <Table.Tr key={g}><Table.Td colSpan={5} bg="gray.0"><Text size="xs" fw={700} tt="uppercase" c="dimmed">{GROUP_LABELS[g]}</Text></Table.Td></Table.Tr>,
              ...items.filter((i) => i.group === g).map((i) => (
                <Table.Tr key={i.no}>
                  <Table.Td w={52}><ItemThumb no={i.no} size={40} /></Table.Td>
                  <Table.Td>
                    <Text size="sm">{i.name}</Text>
                    <Text size="xs" c="dimmed">{[i.pack && i.pack > 1 && `${i.pack} pieces per pack`, i.note].filter(Boolean).join(" · ")}</Text>
                  </Table.Td>
                  <Table.Td><ThomannLink no={i.no} /></Table.Td>
                  <Table.Td ta="right"><Text size="xs" c="dimmed">{i.price != null ? gbp(i.price) : "–"}</Text></Table.Td>
                  <Table.Td><NumberInput size="xs" min={0} value={project.inventory[i.no] ?? 0} onChange={(v) => setQty(i.no, Number(v) || 0)} /></Table.Td>
                </Table.Tr>
              )),
            ])}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed">Prices are a guide, copied from thomann.co.uk in 2026. Check Thomann for current prices and stock.</Text>
      </Stack>
    </Modal>
  );
}

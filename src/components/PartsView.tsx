import { Alert, Badge, Button, Group, Paper, Stack, Switch, Table, Text, Title } from "@mantine/core";
import { IconPrinter, IconShoppingCart } from "@tabler/icons-react";
import { CATALOGUE, ITEMS } from "../catalogue";
import type { Plan, Project } from "../types";
import type { Analysis } from "../lib/analysis";
import { bom, packOf } from "../lib/bom";
import { gbp } from "../lib/util";
import { ItemThumb, ThomannLink } from "./ItemThumb";
import { setAllowOver } from "./InventoryModal";

export function PartsView({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const lines = bom(project, plan, a);
  const short = lines.filter((l) => l.shortPieces > 0);
  const total = short.reduce((s, l) => s + (l.buyCost ?? 0), 0);
  const unknownPrice = short.some((l) => l.buyCost == null);
  const usedItems = new Set(lines.flatMap((l) => l.items));
  const spare = CATALOGUE.filter((i) => (project.inventory[i.no] ?? 0) > 0 && !usedItems.has(i.no));

  return (
    <Stack gap="md" p="md" maw={1100} mx="auto" className="print-root">
      <Group justify="space-between" className="no-print">
        <Switch checked={project.allowOverInventory} onChange={(e) => setAllowOver(e.currentTarget.checked)} label="Plan beyond what I own" />
        <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>Print</Button>
      </Group>
      <Paper withBorder p="md">
        <Title order={3} mb="xs">Parts for “{plan.name}”</Title>
        <Table fz="sm" verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr><Table.Th /><Table.Th>Part</Table.Th><Table.Th>Item no.</Table.Th><Table.Th ta="right">Needed</Table.Th><Table.Th ta="right">Owned</Table.Th><Table.Th ta="right">Weight</Table.Th></Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((l) => (
              <Table.Tr key={l.key}>
                <Table.Td w={52}><ItemThumb no={l.items[0]} size={40} /></Table.Td>
                <Table.Td>
                  <Text size="sm">{l.label}</Text>
                  {l.why && <Text size="xs" c="dimmed">Estimate: {l.why.toLowerCase()}</Text>}
                </Table.Td>
                <Table.Td><Stack gap={0}>{l.items.map((no) => <ThomannLink key={no} no={no} />)}</Stack></Table.Td>
                <Table.Td ta="right">{l.pieces}</Table.Td>
                <Table.Td ta="right">{l.shortPieces > 0 ? <Badge color={l.hard ? "red" : "orange"} variant="light">{l.ownedPieces} · short {l.shortPieces}</Badge> : l.ownedPieces}</Table.Td>
                <Table.Td ta="right"><Text size="xs" c="dimmed">{l.weight != null ? `${l.weight.toFixed(1)} kg` : "–"}</Text></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed" mt={4}>Pieces, not packs. Platforms, legs, handrails and stairs come from the plan; connectors and CargoBoxes are estimated from the layout.</Text>
      </Paper>

      <Paper withBorder p="md">
        <Group gap="xs" mb="xs"><IconShoppingCart size={20} /><Title order={3}>Shopping list</Title></Group>
        {short.length === 0 ? (
          <Text size="sm" c="teal.8">You own everything this plan needs.</Text>
        ) : (
          <>
            {!project.allowOverInventory && <Alert color="orange" mb="xs" p="xs"><Text size="xs">Only estimated connectors are short. Turn on “Plan beyond what I own” to plan with platforms, legs or handrails you haven't bought yet.</Text></Alert>}
            <Table fz="sm" verticalSpacing={4}>
              <Table.Thead><Table.Tr><Table.Th /><Table.Th>Buy</Table.Th><Table.Th>Item no.</Table.Th><Table.Th ta="right">Packs</Table.Th><Table.Th ta="right">Approx. cost</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {short.map((l) => {
                  const no = l.items[0];
                  return (
                    <Table.Tr key={l.key}>
                      <Table.Td w={52}><ItemThumb no={no} size={40} /></Table.Td>
                      <Table.Td>{ITEMS[no]?.name}{packOf(no) > 1 && <Text span size="xs" c="dimmed"> ({packOf(no)} per pack, {l.shortPieces} pieces short)</Text>}</Table.Td>
                      <Table.Td><ThomannLink no={no} /></Table.Td>
                      <Table.Td ta="right">{l.buyPacks}</Table.Td>
                      <Table.Td ta="right">{l.buyCost != null ? gbp(l.buyCost) : "see Thomann"}</Table.Td>
                    </Table.Tr>
                  );
                })}
                <Table.Tr><Table.Td colSpan={4} ta="right" fw={700}>Total{unknownPrice ? " (excluding items without a price)" : ""}</Table.Td><Table.Td ta="right" fw={700}>{gbp(total)}</Table.Td></Table.Tr>
              </Table.Tbody>
            </Table>
            <Text size="xs" c="dimmed" mt={4}>Prices are a guide from thomann.co.uk in 2026; follow the links for current prices.</Text>
          </>
        )}
      </Paper>

      {spare.length > 0 && (
        <Paper withBorder p="md">
          <Title order={4} mb="xs">Owned but not used in this plan</Title>
          <Group gap="xs">
            {spare.map((i) => <Badge key={i.no} variant="default" size="lg" leftSection={<ItemThumb no={i.no} size={18} />}>{(project.inventory[i.no] ?? 0) * packOf(i.no)} × {i.short}</Badge>)}
          </Group>
        </Paper>
      )}
    </Stack>
  );
}

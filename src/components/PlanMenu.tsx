import { useState } from "react";
import { Button, FileButton, Menu, Modal, Stack, TextInput, Textarea, Group } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconCopy, IconDownload, IconEdit, IconFilePlus, IconTrash, IconUpload, IconCheck } from "@tabler/icons-react";
import { activePlan, deletePlan, duplicatePlan, newPlan, openPlan, renamePlan, replaceProject, useStore } from "../store";
import { downloadProject, parseProject } from "../storage";
import { log } from "../log";

function RenameModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const plan = useStore((s) => activePlan(s.project));
  const [name, setName] = useState(plan.name);
  const [notes, setNotes] = useState(plan.notes);
  return (
    <Modal opened={opened} onClose={onClose} title="Plan name and notes">
      <Stack gap="sm">
        <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} data-autofocus />
        <Textarea label="Notes" description="Shown on the build sheet" autosize minRows={2} value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
        <Group justify="flex-end"><Button onClick={() => { renamePlan(plan.id, { name: name.trim() || plan.name, notes }); onClose(); }}>Save</Button></Group>
      </Stack>
    </Modal>
  );
}

export function PlanMenu() {
  const project = useStore((s) => s.project);
  const plan = activePlan(project);
  const [renaming, setRenaming] = useState(false);

  const upload = async (file: File | null) => {
    if (!file) return;
    try {
      const p = parseProject(await file.text());
      modals.openConfirmModal({
        title: "Open this file?",
        children: `It replaces the plans, floor plans and parts list in this browser with the ${p.plans.length} plan(s) in “${file.name}”. Download your current file first if you want to keep it. You can undo this.`,
        labels: { confirm: "Open file", cancel: "Cancel" },
        onConfirm: () => { replaceProject(p); log("storage", "uploaded", file.name); notifications.show({ color: "teal", message: `Opened ${file.name}` }); },
      });
    } catch (e) {
      notifications.show({ color: "red", title: "Couldn't open that file", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const confirmDelete = () => modals.openConfirmModal({
    title: `Delete “${plan.name}”?`,
    children: "The plan is removed from this file. You can undo this.",
    labels: { confirm: "Delete", cancel: "Cancel" }, confirmProps: { color: "red" },
    onConfirm: () => deletePlan(plan.id),
  });

  return (
    <>
      <Menu shadow="md" width={300} position="bottom-start">
        <Menu.Target>
          <Button variant="default" rightSection={<IconChevronDown size={14} />} maw={340} styles={{ label: { overflow: "hidden", textOverflow: "ellipsis" } }}>{plan.name}</Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Plans</Menu.Label>
          {project.plans.map((p) => (
            <Menu.Item key={p.id} onClick={() => openPlan(p.id)} leftSection={p.id === plan.id ? <IconCheck size={14} /> : <span style={{ width: 14 }} />}>{p.name}</Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item leftSection={<IconFilePlus size={14} />} onClick={() => newPlan(`Plan ${project.plans.length + 1}`)}>New plan</Menu.Item>
          <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => setRenaming(true)}>Rename / notes…</Menu.Item>
          <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => duplicatePlan(plan.id)}>Duplicate plan</Menu.Item>
          <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={confirmDelete}>Delete plan…</Menu.Item>
          <Menu.Divider />
          <Menu.Label>File (all plans, floor plans and parts)</Menu.Label>
          <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => downloadProject(project)}>Download file</Menu.Item>
          <FileButton onChange={upload} accept=".json,application/json">
            {(props) => <Menu.Item {...props} closeMenuOnClick={false} leftSection={<IconUpload size={14} />}>Open file…</Menu.Item>}
          </FileButton>
        </Menu.Dropdown>
      </Menu>
      {renaming && <RenameModal opened onClose={() => setRenaming(false)} />}
    </>
  );
}

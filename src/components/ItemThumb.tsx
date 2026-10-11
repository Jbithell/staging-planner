import { useState } from "react";
import { Anchor, Center, Image, Tooltip } from "@mantine/core";
import { IconExternalLink, IconPackage } from "@tabler/icons-react";
import { ITEMS, imageUrl, thomannUrl } from "../catalogue";

/** Thomann's product photo, falling back to an icon when offline. */
export function ItemThumb({ no, size = 48 }: { no: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed || !ITEMS[no]) return <Center w={size} h={size} bg="gray.1" style={{ borderRadius: 4, flex: "none" }}><IconPackage size={size * 0.5} color="#adb5bd" /></Center>;
  return <Image src={imageUrl(no)} w={size} h={size} fit="contain" radius="sm" bg="white" style={{ flex: "none" }} onError={() => setFailed(true)} alt="" draggable={false} />;
}

/** Item number linking to the product on thomann.co.uk. */
export function ThomannLink({ no, children, size = "xs" }: { no: string; children?: React.ReactNode; size?: string }) {
  const it = ITEMS[no];
  if (!it) return <>{children ?? no}</>;
  return (
    <Tooltip label={it.page ? "Open on thomann.co.uk" : "Search thomann.co.uk for this item"} openDelay={400}>
      <Anchor href={thomannUrl(it)} target="_blank" rel="noopener noreferrer" size={size} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
        {children ?? <>{no} <IconExternalLink size={11} style={{ verticalAlign: -1 }} /></>}
      </Anchor>
    </Tooltip>
  );
}

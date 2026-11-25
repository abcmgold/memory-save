import { notFound } from "next/navigation";
import { EntryForm } from "@/components/journal/EntryForm";
import { composeContext, localNow, requirePageUser } from "@/server/services/page-data";
import { loadEntryOr404 } from "@/server/services/entry-page";

export const metadata = { title: "Sửa nhật ký · MemorySave" };

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const entry = await loadEntryOr404(user.id, (await params).id);
  if (!entry.isOwner) notFound();
  const { friends, defaultAudience } = await composeContext(user);
  return <EntryForm mode="edit" entry={entry} now={localNow()} friends={friends} defaultAudience={defaultAudience} />;
}

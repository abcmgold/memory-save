import { EntryForm } from "@/components/journal/EntryForm";
import { composeContext, localNow, requirePageUser } from "@/server/services/page-data";

export const metadata = { title: "Viết nhật ký · MemorySave" };

export default async function NewEntryPage() {
  const user = await requirePageUser();
  const { friends, defaultAudience } = await composeContext(user);
  return <EntryForm mode="create" now={localNow()} friends={friends} defaultAudience={defaultAudience} />;
}

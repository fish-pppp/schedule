import "server-only";

import { revalidatePath } from "next/cache";

export function refreshSchedule() {
  revalidatePath("/", "layout");
}

import { requestUrl } from "obsidian";
import type { TaskCaptureSettings } from "./settings";
import type { Bucket, TaskItem } from "./types";

const BUCKET_TO_API: Record<Bucket, string> = {
  "Do First": "DoFirst",
  "Do Soon": "DoSoon",
  Delegate: "Delegate",
  Waiting: "Waiting",
  "On-Hold": "On-Hold",
};

export async function sendTaskToTaskboard(
  settings: TaskCaptureSettings,
  item: TaskItem
): Promise<void> {
  const url = normalizeMutateUrl(settings.taskboardApiUrl);
  const password = settings.dashboardPassword.trim();

  if (!url) {
    throw new Error("Add the taskboard API URL in plugin settings.");
  }
  if (!password) {
    throw new Error("Add the dashboard password in plugin settings.");
  }

  const response = await requestUrl({
    url,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Dashboard-Password": password,
    },
    body: JSON.stringify({
      action: "add",
      task: {
        title: item.text,
        bucket: BUCKET_TO_API[item.bucket],
      },
    }),
  });

  if (response.status < 200 || response.status >= 300) {
    const message = parseError(response.text) || `HTTP ${response.status}`;
    throw new Error(message);
  }
}

function normalizeMutateUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/api/mutate")) return trimmed;
  return `${trimmed}/api/mutate`;
}

function parseError(text: string): string {
  try {
    const json = JSON.parse(text);
    return json?.error ? String(json.error) : "";
  } catch {
    return text.trim();
  }
}

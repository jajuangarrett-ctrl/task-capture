export const BUCKETS = ["Do First", "Do Soon", "Delegate", "Waiting", "On-Hold"] as const;
export type Bucket = (typeof BUCKETS)[number];

export interface TaskItem {
  bucket: Bucket;
  text: string;
}

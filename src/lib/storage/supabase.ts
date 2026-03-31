import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const BUCKET = "synctyme-timesheets";

export function buildStoragePath(
  tenantId: string,
  consultantId: string,
  timesheetId: string,
  filename: string
): string {
  return `${tenantId}/${consultantId}/${timesheetId}/${filename}`;
}

export async function uploadFile(
  file: File,
  path: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (error) return { url: null, error: error.message };

    const url = getPublicUrl(path);
    return { url, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function deleteFile(
  path: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

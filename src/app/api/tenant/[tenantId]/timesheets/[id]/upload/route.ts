import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { withRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { uploadFile, buildStoragePath, deleteFile } from "@/lib/storage/supabase";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const POST = withRole(["CONSULTANT"])(async (req, context) => {
  const params = await context.params;
  const tenantId = params.tenantId;
  const timesheetId = params.id;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, companyId: tenantId },
    include: { consultant: { select: { id: true, userId: true } } },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  if (timesheet.consultant.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (timesheet.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Can only upload files to DRAFT timesheets" },
      { status: 400 }
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Accepted: PDF, JPG, PNG, DOC, DOCX" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 10MB limit" },
      { status: 400 }
    );
  }

  if (timesheet.uploadedFileUrl) {
    const oldPath = buildStoragePath(
      tenantId,
      timesheet.consultantId,
      timesheetId,
      timesheet.uploadedFileName!
    );
    await deleteFile(oldPath);
  }

  const path = buildStoragePath(
    tenantId,
    timesheet.consultantId,
    timesheetId,
    file.name
  );

  const { url, error } = await uploadFile(file, path);
  if (error || !url) {
    return NextResponse.json(
      { error: error ?? "Upload failed" },
      { status: 500 }
    );
  }

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      uploadedFileUrl: url,
      uploadedFileName: file.name,
      uploadedFileSize: file.size,
      uploadedFileMimeType: file.type,
    },
  });

  await writeAuditLog({
    companyId: tenantId,
    userId,
    role: "CONSULTANT",
    entity: "Timesheet",
    entityId: timesheetId,
    action: "TIMESHEET_FILE_UPLOADED",
    newValue: file.name,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ timesheet: updated });
});

import { adminPost, getAdminClientErrorMessage } from "@/lib/admin-client"
import type { MarkdownEmojiItem } from "@/lib/markdown-emoji"

export interface UploadMarkdownEmojiFilesData {
  items: MarkdownEmojiItem[]
}

function isMarkdownEmojiItem(value: unknown): value is MarkdownEmojiItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const row = value as Record<string, unknown>
  return typeof row.shortcode === "string" && typeof row.label === "string" && typeof row.icon === "string"
}

function isUploadMarkdownEmojiFilesData(value: unknown): value is UploadMarkdownEmojiFilesData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const row = value as Record<string, unknown>
  return (
    Array.isArray(row.items) &&
    row.items.every(isMarkdownEmojiItem)
  )
}

export async function saveAdminSiteSettings(payload: Record<string, unknown>) {
  try {
    const result = await adminPost("/api/admin/site-settings", payload, {
      defaultSuccessMessage: "保存成功",
      defaultErrorMessage: "保存失败",
    })

    return {
      ok: true,
      message: result.message,
    }
  } catch (error) {
    return {
      ok: false,
      message: getAdminClientErrorMessage(error, "保存失败"),
    }
  }
}

export async function uploadAdminMarkdownEmojiFiles(files: File[]) {
  try {
    const formData = new FormData()
    for (const file of files) {
      formData.append("files", file)
    }

    const result = await adminPost<UploadMarkdownEmojiFilesData>(
      "/api/admin/site-settings/markdown-emoji/upload",
      formData,
      {
        validateData: isUploadMarkdownEmojiFilesData,
        defaultSuccessMessage: "上传完成",
        defaultErrorMessage: "上传失败",
      },
    )

    return {
      ok: true as const,
      message: result.message,
      data: result.data,
    }
  } catch (error) {
    return {
      ok: false as const,
      message: getAdminClientErrorMessage(error, "上传失败"),
    }
  }
}

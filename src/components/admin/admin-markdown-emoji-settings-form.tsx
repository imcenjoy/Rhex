"use client"

import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { useRef, useState, useTransition } from "react"

import { SettingsInputField, SettingsSection } from "@/components/admin/admin-settings-fields"
import { IconPicker } from "@/components/ui/icon-picker"
import { LevelIcon } from "@/components/level-icon"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { saveAdminSiteSettings, uploadAdminMarkdownEmojiFiles } from "@/lib/admin-site-settings-client"
import { DEFAULT_MARKDOWN_EMOJI_ITEMS, type MarkdownEmojiItem, normalizeMarkdownEmojiItems } from "@/lib/markdown-emoji"

interface AdminMarkdownEmojiSettingsFormProps {
  initialItems: MarkdownEmojiItem[]
}

export function AdminMarkdownEmojiSettingsForm({ initialItems }: AdminMarkdownEmojiSettingsFormProps) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<MarkdownEmojiItem[]>(normalizeMarkdownEmojiItems(initialItems))
  const [isUploadPending, startUploadTransition] = useTransition()
  const [isPending, startTransition] = useTransition()

  function clearUploadInput() {
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ""
    }
  }

  function handleUploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) {
      return
    }

    startUploadTransition(async () => {
      const result = await uploadAdminMarkdownEmojiFiles(files)
      if (!result.ok) {
        toast.error(result.message, "上传失败")
        clearUploadInput()
        return
      }

      const existingShortcodes = new Set(items.map((item) => item.shortcode))
      const importedItems: MarkdownEmojiItem[] = []
      let duplicateCount = 0

      for (const item of result.data.items) {
        if (existingShortcodes.has(item.shortcode)) {
          duplicateCount += 1
          continue
        }

        importedItems.push(item)
        existingShortcodes.add(item.shortcode)
      }

      setItems(normalizeMarkdownEmojiItems([...items, ...importedItems]))

      const skippedText = duplicateCount > 0 ? `，跳过 ${duplicateCount} 个重复短码` : ""
      toast.success(`已上传 ${importedItems.length} 个表情${skippedText}`, "上传完成")

      clearUploadInput()
    })
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          const result = await saveAdminSiteSettings({
            markdownEmojiMap: items,
            section: "site-markdown-emoji",
          })
          if (!result.ok) {
            toast.error(result.message, "保存失败")
            return
          }
          toast.success(result.message, "保存成功")
          router.refresh()
        })
      }}
    >
      <SettingsSection
        title="Markdown 表情"
        description="独立配置 Markdown 短码表情，例如 `:smile:`、`:rocket:`，支持 emoji、图片链接与完整 SVG 图标。"
      >
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">本地批量上传</div>
              <p className="text-xs leading-5 text-muted-foreground">支持一次选择多个 png、jpg、gif、webp、avif、svg 文件；文件名会自动生成短码。</p>
            </div>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp,.avif,.svg,image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
              multiple
              className="sr-only"
              onChange={(event) => handleUploadFiles(event.target.files)}
            />
            <Button type="button" variant="outline" disabled={isUploadPending} onClick={() => uploadInputRef.current?.click()}>
              <Upload data-icon="inline-start" />
              {isUploadPending ? "上传中..." : "选择文件"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`markdown-emoji-${index}`} className="rounded-2xl bg-muted/35 p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_auto] xl:items-start">
                <SettingsInputField
                  label="短码"
                  value={item.shortcode}
                  onChange={(value) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, shortcode: value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() } : row))}
                  placeholder="如 smile"
                />
                <div className="space-y-2">
                  <SettingsInputField
                    label="显示名称"
                    value={item.label}
                    onChange={(value) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, label: value } : row))}
                    placeholder="如 微笑"
                  />
                  <IconPicker
                    label="图标"
                    value={item.icon}
                    onChange={(value) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, icon: value } : row))}
                    popoverTitle="选择 Markdown 表情图标"
                    containerClassName="space-y-2"
                    triggerClassName="flex h-11 w-full items-center gap-3 rounded-[18px] border border-border bg-background px-4 text-left text-sm transition-colors hover:bg-accent"
                    textareaRows={4}
                  />
                </div>
                <div className="flex justify-end xl:pt-8">
                  <Button type="button" variant="outline" className="rounded-full" disabled={items.length <= 1} onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}>删除</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setItems((current) => [...current, { shortcode: `emoji_${current.length + 1}`, label: "新表情", icon: "😀" }])}>新增表情</Button>
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setItems(DEFAULT_MARKDOWN_EMOJI_ITEMS)}>恢复默认</Button>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-4 space-y-2">
          <p className="text-sm font-medium">使用方式预览</p>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span key={`preview-${item.shortcode}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <EmojiPreview icon={item.icon} label={item.label} />
                <span>{item.label}</span>
                <code>:{item.shortcode}:</code>
              </span>
            ))}
          </div>
          <p className="text-xs leading-6 text-muted-foreground">前台帖子中输入对应短码，例如 <code>:smile:</code>，渲染时才会替换为表情；编辑器工具栏会优先展示前 8 个已配置表情。</p>
        </div>
      </SettingsSection>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? "保存中..." : "保存 Markdown 表情"}</Button>
      </div>
    </form>
  )
}

function EmojiPreview({ icon, label }: { icon: string; label: string }) {
  return <LevelIcon icon={icon} title={label} className="h-4 w-4 text-sm" emojiClassName="text-inherit" svgClassName="[&>svg]:block" />
}

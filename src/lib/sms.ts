import "server-only"

import {
  invokeAddonProviderRuntime,
  listAddonProviderRuntimeItems,
} from "@/lib/addon-provider-registry"
import { getServerSiteSettings } from "@/lib/site-settings"
import type { ServerSiteSettingsData } from "@/lib/site-settings.types"

export interface SmsSendInput {
  phone: string
  code?: string
  scene?: "verification" | "notification" | string
  templateCode?: string
  templateParam?: Record<string, unknown>
  signName?: string
  outId?: string
}

export interface SmsSendResult {
  provider: string
  sent: boolean
  messageId?: string | null
  requestId?: string | null
}

interface SmsProviderRuntime {
  isRunnable?: (input: SmsSendInput) => boolean | Promise<boolean>
  send?: (input: SmsSendInput) => SmsSendResult | Promise<SmsSendResult | void> | void
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function hasAliyunSmsConfig(settings: ServerSiteSettingsData) {
  return Boolean(
    settings.smsEnabled
    && normalizeOptionalString(settings.smsAliyunAccessKeyId)
    && normalizeOptionalString(settings.smsAliyunAccessKeySecret)
    && normalizeOptionalString(settings.smsAliyunSignName)
    && normalizeOptionalString(settings.smsAliyunTemplateCode),
  )
}

function buildTemplateParam(input: SmsSendInput, settings: ServerSiteSettingsData) {
  if (input.templateParam) {
    return input.templateParam
  }

  if (input.code) {
    const codeKey = normalizeOptionalString(settings.smsAliyunCodeParamName) || "code"
    return { [codeKey]: input.code }
  }

  return {}
}

async function sendWithAliyun(input: SmsSendInput, settings: ServerSiteSettingsData): Promise<SmsSendResult> {
  if (!hasAliyunSmsConfig(settings)) {
    throw new Error("站点未配置阿里云短信发送能力")
  }

  const [{ default: DysmsapiClient, SendSmsRequest }, { $OpenApiUtil }] = await Promise.all([
    import("@alicloud/dysmsapi20170525"),
    import("@alicloud/openapi-core"),
  ])
  const client = new DysmsapiClient(new $OpenApiUtil.Config({
    accessKeyId: normalizeOptionalString(settings.smsAliyunAccessKeyId),
    accessKeySecret: normalizeOptionalString(settings.smsAliyunAccessKeySecret),
    endpoint: normalizeOptionalString(settings.smsAliyunEndpoint) || "dysmsapi.aliyuncs.com",
    regionId: normalizeOptionalString(settings.smsAliyunRegionId) || "cn-hangzhou",
  }))
  const response = await client.sendSms(new SendSmsRequest({
    phoneNumbers: input.phone,
    signName: input.signName || normalizeOptionalString(settings.smsAliyunSignName),
    templateCode: input.templateCode || normalizeOptionalString(settings.smsAliyunTemplateCode),
    templateParam: JSON.stringify(buildTemplateParam(input, settings)),
    outId: input.outId,
  }))
  const body = response.body

  if (body?.code !== "OK") {
    throw new Error(body?.message || body?.code || "阿里云短信发送失败")
  }

  return {
    provider: "aliyun",
    sent: true,
    messageId: body.bizId ?? null,
    requestId: body.requestId ?? null,
  }
}

function normalizeProviderResult(provider: string, value: SmsSendResult | void | null | undefined): SmsSendResult {
  if (!value) {
    return {
      provider,
      sent: true,
    }
  }

  return {
    provider: value.provider || provider,
    sent: value.sent !== false,
    messageId: value.messageId ?? null,
    requestId: value.requestId ?? null,
  }
}

export async function canSendSms() {
  const settings = await getServerSiteSettings()

  if (hasAliyunSmsConfig(settings)) {
    return true
  }

  const providers = await listAddonProviderRuntimeItems<SmsProviderRuntime>("sms")
  return providers.some((item) => typeof item.runtime?.send === "function")
}

export async function sendSms(input: SmsSendInput): Promise<SmsSendResult> {
  const providers = await listAddonProviderRuntimeItems<SmsProviderRuntime>("sms")

  for (const item of providers) {
    if (typeof item.runtime?.send !== "function") {
      continue
    }

    const runnable = typeof item.runtime.isRunnable === "function"
      ? await invokeAddonProviderRuntime(item, "isRunnable", () => input)
      : true

    if (runnable === false) {
      continue
    }

    const result = await invokeAddonProviderRuntime(item, "send", () => input)
    return normalizeProviderResult(item.provider.code, result as SmsSendResult | void | null | undefined)
  }

  return sendWithAliyun(input, await getServerSiteSettings())
}

export async function sendSmsVerificationCode(input: {
  phone: string
  code: string
  purpose?: string
}) {
  return sendSms({
    phone: input.phone,
    code: input.code,
    scene: input.purpose ? `verification:${input.purpose}` : "verification",
  })
}

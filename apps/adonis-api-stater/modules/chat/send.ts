/**
 * Posts a chat message to a Slack or Discord incoming webhook.
 *
 * Refuses a URL the provider did not issue, then sends through the outbound
 * module, so the request cannot reach the private network and does not
 * follow redirects. Any status other than 2xx is an error, with the status
 * in the message.
 */
import { sendOutboundRequest, type OutboundOptions } from '#modules/outbound/request'
import {
  buildChatMessage,
  isChatWebhookUrl,
  type ChatMessageInput,
  type ChatMessageLimits,
  type ChatProvider,
} from '#modules/chat/message'

export class ChatDeliveryError extends Error {
  constructor(
    message: string,
    public status: number | null
  ) {
    super(message)
    this.name = 'ChatDeliveryError'
  }
}

export type SendChatOptions = OutboundOptions & {
  timeoutMs?: number
  limits?: ChatMessageLimits
  /** The sender, for tests. Default `sendOutboundRequest`. */
  send?: typeof sendOutboundRequest
}

export async function sendChatMessage(
  provider: ChatProvider,
  webhookUrl: string,
  input: ChatMessageInput,
  options: SendChatOptions = {}
): Promise<void> {
  if (!isChatWebhookUrl(provider, webhookUrl)) {
    throw new ChatDeliveryError(`Not a ${provider} incoming-webhook URL`, null)
  }

  const body = JSON.stringify(buildChatMessage(provider, input, options.limits))
  const send = options.send ?? sendOutboundRequest
  const response = await send(
    webhookUrl,
    {
      headers: { 'Content-Type': 'application/json' },
      body,
      timeoutMs: options.timeoutMs ?? 10_000,
    },
    { allowPrivate: options.allowPrivate, lookup: options.lookup }
  )

  if (response.status < 200 || response.status >= 300) {
    throw new ChatDeliveryError(
      `${provider} answered ${response.status} ${response.statusText}`.trim(),
      response.status
    )
  }
}

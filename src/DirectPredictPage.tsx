import { useState } from 'react'
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  CardHeader,
  Field,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Subtitle2,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components'
import type { BadgeProps } from '@fluentui/react-components'
import { PredictService } from './generated/services/PredictService'

// The prompt's msdyn_aimodelid. Set it in .env.local (see .env.example). Vite bakes it into the bundle at build time.
const MODEL_ID = (import.meta.env.VITE_TICKET_TRIAGE_MODEL_ID ?? '').trim()

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  actions: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM },
  badges: { display: 'flex', gap: tokens.spacingHorizontalS },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  raw: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    maxHeight: '360px',
    overflow: 'auto',
    margin: 0,
  },
})

const priorityColor: Record<string, BadgeProps['color']> = {
  High: 'danger',
  Medium: 'warning',
  Low: 'success',
}

type Triage = { category?: string; priority?: string; summary?: string; suggestedReply?: string }
type Json = Record<string, unknown>

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

function pick(o: Json, key: string): string | undefined {
  const k = Object.keys(o).find((x) => x.toLowerCase() === key.toLowerCase())
  const v = k ? o[k] : undefined
  return typeof v === 'string' ? v : undefined
}

function toTriage(v: unknown): Triage | null {
  if (typeof v === 'string') {
    const cleaned = v.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
    try {
      return toTriage(JSON.parse(cleaned))
    } catch {
      return null
    }
  }
  if (!isObj(v)) return null
  const t: Triage = {
    category: pick(v, 'category'),
    priority: pick(v, 'priority'),
    summary: pick(v, 'summary'),
    suggestedReply: pick(v, 'suggestedReply'),
  }
  return t.category || t.priority || t.summary || t.suggestedReply ? t : null
}

// The prompt output can arrive as structuredOutput (object or {text}) or as plain text.
function parseOutput(output: Json): Triage | null {
  const so = output.structuredOutput
  return toTriage(so) ?? (isObj(so) ? toTriage(so.text) : null) ?? toTriage(output.text)
}

function friendlyHint(message: string, status?: number): string | null {
  const m = message.toLowerCase()
  if (status === 403 || m.includes('entitlement') || m.includes('privilege'))
    return 'You might not have access to this prompt. Make sure it is shared with you, and that your environment has AI Builder credits.'
  if (status === 429 || m.includes('maxconcurrent') || m.includes('throttl'))
    return 'The service is busy. Wait a few seconds and try again.'
  return null
}

export function DirectPredictPage() {
  const styles = useStyles()
  const [ticketText, setTicketText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Triage | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; hint: string | null } | null>(null)
  const [pending, setPending] = useState(false)
  const [raw, setRaw] = useState<unknown>(null)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setStatus(null)
    setPending(false)
    setRaw(null)
    setElapsedMs(null)
    const start = performance.now()
    try {
      const response = await PredictService.Predict(MODEL_ID, '2.0', undefined, {
        '@odata.type': '#Microsoft.Dynamics.CRM.expando',
        TicketText: ticketText.trim(),
        'TicketText@odata.type': 'String',
      }, JSON.stringify({ consumptionSource: 'PowerApps', partnerSource: 'AIBuilder' }))
      setElapsedMs(Math.round(performance.now() - start))
      setRaw(response)

      const err = response.error as { message?: string; status?: number } | undefined
      const data = (response.data ?? {}) as Json
      const dataErr = isObj(data.error) ? (data.error as { message?: string }) : undefined
      if (!response.success || dataErr) {
        const message = err?.message ?? dataErr?.message ?? 'The Predict call failed.'
        setError({ message, hint: friendlyHint(message, err?.status) })
        return
      }

      const r2 = isObj(data.responsev2) ? data.responsev2 : {}
      if (String(r2.overrideHttpStatusCode ?? '') === '202') {
        setPending(true)
        return
      }

      const output = isObj(r2.predictionOutput) ? r2.predictionOutput : {}
      const opStatus = typeof r2.operationStatus === 'string' ? r2.operationStatus : null
      setStatus(opStatus)
      const parsed = parseOutput(output)
      if (parsed) setResult(parsed)
      else setError({ message: 'The prompt returned an output this page could not read. Check the raw response below.', hint: null })
    } catch (e) {
      setElapsedMs(Math.round(performance.now() - start))
      const message = e instanceof Error ? e.message : String(e)
      setError({ message, hint: friendlyHint(message) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <MessageBar intent="info">
        <MessageBarBody>
          This tab calls the AI prompt directly through the Dataverse <b>Predict</b> action. No flow is involved.
        </MessageBarBody>
      </MessageBar>

      {!MODEL_ID && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Prompt ID not set</MessageBarTitle>
            Add <code>VITE_TICKET_TRIAGE_MODEL_ID</code> to <code>.env.local</code>, then rebuild and redeploy the app.
          </MessageBarBody>
        </MessageBar>
      )}

      <Field label="Support ticket" hint="Paste the customer's message, then select Triage (direct).">
        <Textarea
          value={ticketText}
          onChange={(_, data) => setTicketText(data.value)}
          rows={6}
          resize="vertical"
          placeholder="I was charged twice for my subscription this month..."
        />
      </Field>

      <div className={styles.actions}>
        <Button appearance="primary" onClick={run}         disabled={loading || !MODEL_ID || !ticketText.trim()}>
          Triage (direct)
        </Button>
        {loading && <Spinner size="tiny" label="Calling Predict..." />}
        {elapsedMs !== null && !loading && <Caption1>Took {elapsedMs.toLocaleString()} ms</Caption1>}
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Predict failed</MessageBarTitle>
            {error.message}
            {error.hint && <div>{error.hint}</div>}
          </MessageBarBody>
        </MessageBar>
      )}

      {pending && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Still running</MessageBarTitle>
            The prompt is running in the background (202). This page doesn't wait for background results. Try again.
          </MessageBarBody>
        </MessageBar>
      )}

      {result && (
        <Card>
          <CardHeader
            header={<Subtitle2>Result</Subtitle2>}
            description={status ? <Caption1>Status: {status}</Caption1> : undefined}
            action={
              <div className={styles.badges}>
                <Badge appearance="tint" color="brand">{result.category ?? 'Unknown'}</Badge>
                <Badge appearance="filled" color={priorityColor[result.priority ?? ''] ?? 'informative'}>
                  {result.priority ?? 'Unknown'}
                </Badge>
              </div>
            }
          />
          <div className={styles.section}>
            <Text weight="semibold">Summary</Text>
            <Body1>{result.summary}</Body1>
          </div>
          <div className={styles.section}>
            <Text weight="semibold">Suggested reply</Text>
            <Body1>{result.suggestedReply}</Body1>
          </div>
        </Card>
      )}

      {raw !== null && (
        <Accordion collapsible>
          <AccordionItem value="raw">
            <AccordionHeader>Raw response</AccordionHeader>
            <AccordionPanel>
              <pre className={styles.raw}>{JSON.stringify(raw, null, 2)}</pre>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}

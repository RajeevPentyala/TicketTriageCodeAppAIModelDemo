import { useCallback, useEffect, useState } from 'react'
import {
  Body1,
  Button,
  Caption1,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Subtitle2,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
} from '@fluentui/react-components'
import { ArrowClockwiseRegular } from '@fluentui/react-icons'
import { Msdyn_aieventsService } from './generated/services/Msdyn_aieventsService'
import type { Msdyn_aievents } from './generated/models/Msdyn_aieventsModel'

const MAX_ROWS = 100
const MODEL_NAME_ANNOTATION = '_msdyn_aimodelid_value@OData.Community.Display.V1.FormattedValue'

// The SDK requests all OData annotations, so the lookup's display name arrives on each row.
type AiEventRow = Msdyn_aievents & { [MODEL_NAME_ANNOTATION]?: string }

interface UsageRow {
  id: string
  time: string
  promptName: string
  llmModel: string
  partner: string
  usedIn: string
  isTest: boolean
  units: number | null
  credits: number | null
}

const useStyles = makeStyles({
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalM },
  summary: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  actions: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  tableWrap: { overflowX: 'auto' },
  number: { textAlign: 'right' },
})

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' ? v : null)

// msdyn_eventdata is a JSON string: { messageConsumption: { units, consumption }, consumptionSource, partnerSource, llmModelName }
function parseEventData(json?: string) {
  try {
    const data = JSON.parse(json ?? '{}')
    const usage = data.messageConsumption ?? {}
    return {
      llmModel: str(data.llmModelName),
      partner: str(data.partnerSource),
      usedIn: str(data.consumptionSource),
      units: num(usage.units),
      credits: num(usage.consumption),
    }
  } catch {
    return { llmModel: '', partner: '', usedIn: '', units: null, credits: null }
  }
}

export function AiUsagePage() {
  const styles = useStyles()
  const [rows, setRows] = useState<UsageRow[]>([])
  const [hideTests, setHideTests] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await Msdyn_aieventsService.getAll({
        select: ['msdyn_aieventid', 'createdon', 'msdyn_eventdata', 'msdyn_quicktest', '_msdyn_aimodelid_value'],
        filter: hideTests ? 'msdyn_quicktest eq false' : undefined,
        orderBy: ['createdon desc'],
        top: MAX_ROWS,
      })
      if (!response.success) {
        setError(response.error?.message ?? "Couldn't load AI events.")
        return
      }
      setRows(
        ((response.data ?? []) as AiEventRow[]).map((e) => ({
          id: e.msdyn_aieventid,
          time: e.createdon ? new Date(e.createdon).toLocaleString() : '',
          promptName: e[MODEL_NAME_ANNOTATION] ?? e._msdyn_aimodelid_value ?? '',
          isTest: e.msdyn_quicktest === true,
          ...parseEventData(e.msdyn_eventdata),
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [hideTests])

  useEffect(() => {
    void load()
  }, [load])

  const total = rows.reduce((sum, r) => sum + (r.credits ?? 0), 0)

  return (
    <>
      <div className={styles.header}>
        <div className={styles.summary}>
          <Subtitle2>Estimated credits for displayed events: {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} Copilot Credits</Subtitle2>
          <Caption1>
            Latest {MAX_ROWS} AI events you can access; test runs {hideTests ? 'hidden' : 'shown'}. Showing {rows.length}.
          </Caption1>
        </div>
        <div className={styles.actions}>
          <Switch label="Hide test runs" checked={hideTests} onChange={(_, d) => setHideTests(d.checked)} />
          <Button icon={<ArrowClockwiseRegular />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading && <Spinner size="small" label="Loading AI events..." />}

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Couldn't load AI usage</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      )}

      {!loading && !error && rows.length === 0 && <Body1>No AI events found.</Body1>}

      {rows.length > 0 && (
        <div className={styles.tableWrap}>
          <Table aria-label="AI credit usage" size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Time</TableHeaderCell>
                <TableHeaderCell>Prompt name</TableHeaderCell>
                <TableHeaderCell>LLM model</TableHeaderCell>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell>Used in</TableHeaderCell>
                <TableHeaderCell>Test run</TableHeaderCell>
                <TableHeaderCell className={styles.number}>Units</TableHeaderCell>
                <TableHeaderCell className={styles.number}>Credits (est.)</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.time}</TableCell>
                  <TableCell>{r.promptName || '—'}</TableCell>
                  <TableCell>{r.llmModel || '—'}</TableCell>
                  <TableCell>{r.partner || '—'}</TableCell>
                  <TableCell>{r.usedIn || '—'}</TableCell>
                  <TableCell>{r.isTest ? 'Yes' : 'No'}</TableCell>
                  <TableCell className={styles.number}>{r.units ?? '—'}</TableCell>
                  <TableCell className={styles.number}>
                    {r.credits === null ? '—' : r.credits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

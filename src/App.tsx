import { useState } from 'react'
import {
  Badge,
  Body1,
  Button,
  Card,
  CardHeader,
  Field,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Subtitle2,
  Tab,
  TabList,
  Text,
  Textarea,
  Title2,
  tokens,
} from '@fluentui/react-components'
import type { BadgeProps } from '@fluentui/react-components'
import { TicketTriageFlowService } from './generated/services/TicketTriageFlowService'
import type { ResponseActionOutput } from './generated/models/TicketTriageFlowModel'
import { AiUsagePage } from './AiUsagePage'
import { DirectPredictPage } from './DirectPredictPage'

type TabValue = 'triage' | 'predict' | 'usage'

const useStyles = makeStyles({
  page: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: tokens.spacingHorizontalXXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  widePage: { maxWidth: '1200px' },
  actions: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM },
  badges: { display: 'flex', gap: tokens.spacingHorizontalS },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
})

const priorityColor: Record<string, BadgeProps['color']> = {
  High: 'danger',
  Medium: 'warning',
  Low: 'success',
}

function App() {
  const styles = useStyles()
  const [tab, setTab] = useState<TabValue>('triage')
  const [ticketText, setTicketText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResponseActionOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const triage = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await TicketTriageFlowService.Run({ text: ticketText.trim() })
      if (response.success && response.data) {
        setResult(response.data)
      } else {
        setError(response.error?.message ?? 'The flow didn\'t return a result.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={mergeClasses(styles.page, tab === 'usage' && styles.widePage)}>
      <Title2>Ticket Triage</Title2>

      <TabList selectedValue={tab} onTabSelect={(_, data) =>       setTab(data.value as TabValue)}>
        <Tab value="triage">Triage</Tab>
              <Tab value="predict">Direct Predict</Tab>
        <Tab value="usage">AI usage</Tab>
      </TabList>

            {tab === 'usage' ? <AiUsagePage /> : tab === 'predict' ? <DirectPredictPage /> : <>
      <Field label="Support ticket" hint="Paste the customer's message, then select Triage.">
        <Textarea
          value={ticketText}
          onChange={(_, data) => setTicketText(data.value)}
          rows={6}
          resize="vertical"
          placeholder="I was charged twice for my subscription this month..."
        />
      </Field>

      <div className={styles.actions}>
        <Button appearance="primary" onClick={triage} disabled={loading || !ticketText.trim()}>
          Triage
        </Button>
        {loading && <Spinner size="tiny" label="Asking the AI prompt..." />}
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Triage failed</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      )}

      {result && (
        <Card>
          <CardHeader
            header={<Subtitle2>Result</Subtitle2>}
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
            <Body1>{result.suggestedreply}</Body1>
          </div>
        </Card>
      )}
      </>}
    </main>
  )
}

export default App

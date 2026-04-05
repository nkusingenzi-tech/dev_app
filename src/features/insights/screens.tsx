import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit'
import { Text, View } from 'react-native'

import { useAppSession } from '../../app/AppSessionContext'
import { buildAnalytics, buildProgress } from '../../app/services/appHelpers'
import { chartConfig, chartWidth } from '../../theme/theme'
import { appStyles } from '../../theme/styles'
import { EmptyStateCard, NavigationCard, ScreenShell, SectionCard } from '../../ui/components'
import type { InsightsStackParamList } from '../../navigation/types'

export function InsightsOverviewScreen({
  navigation,
}: NativeStackScreenProps<InsightsStackParamList, 'InsightsOverview'>) {
  const { checkIns } = useAppSession()
  const progress = buildProgress(checkIns)

  return (
    <ScreenShell subtitle="Insights" title="steady.path">
      <View style={appStyles.heroPanel}>
        <Text style={appStyles.eyebrow}>Analytics</Text>
        <Text style={appStyles.heroTitle}>Pattern review from saved check-ins.</Text>
        <Text style={appStyles.heroText}>
          Analytics are isolated into separate mobile screens instead of one long mixed view.
        </Text>
      </View>

      {checkIns.length === 0 ? (
        <SectionCard eyebrow="Insights" title="No analytics yet">
          <EmptyStateCard
            title="No data available."
            body="Add a few check-ins first. The analytics screens will populate automatically."
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard eyebrow="Metrics" title="Recovery metrics">
            <View style={appStyles.stack}>
              <View style={appStyles.insightCard}>
                <Text style={appStyles.microLabel}>Current no-slip streak</Text>
                <Text style={appStyles.insightValue}>{progress.currentNoSlipStreak}</Text>
                <Text style={appStyles.bodyText}>
                  Consecutive no-slip check-ins from the latest entry backward.
                </Text>
              </View>
              <View style={appStyles.insightCard}>
                <Text style={appStyles.microLabel}>Best no-slip streak</Text>
                <Text style={appStyles.insightValue}>{progress.bestNoSlipStreak}</Text>
                <Text style={appStyles.bodyText}>
                  Longest run of no-slip check-ins recorded on this device.
                </Text>
              </View>
              <View style={appStyles.insightCard}>
                <Text style={appStyles.microLabel}>Check-ins this week</Text>
                <Text style={appStyles.insightValue}>{progress.checkInsThisWeek}</Text>
                <Text style={appStyles.bodyText}>Entries created in the last 7 days.</Text>
              </View>
              <View style={appStyles.insightCard}>
                <Text style={appStyles.microLabel}>Slip rate</Text>
                <Text style={appStyles.insightValue}>{progress.slipRatePercent}%</Text>
                <Text style={appStyles.bodyText}>Percentage of saved check-ins marked as slips.</Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard eyebrow="Charts" title="Analytics screens">
            <NavigationCard
              eyebrow="Trend"
              title="Urge trend"
              body="Open the line chart that tracks recent urge levels."
              actionLabel="Open urge trend"
              onPress={() => navigation.navigate('UrgeTrend')}
            />
            <NavigationCard
              eyebrow="Breakdown"
              title="Outcome summary"
              body="Open the chart that breaks down slip and no-slip entries."
              actionLabel="Open outcome summary"
              onPress={() => navigation.navigate('OutcomeSummary')}
            />
            <NavigationCard
              eyebrow="Distribution"
              title="Mood distribution"
              body="Open the pie chart for the current mood mix."
              actionLabel="Open mood distribution"
              onPress={() => navigation.navigate('MoodDistribution')}
            />
          </SectionCard>
        </>
      )}
    </ScreenShell>
  )
}

export function UrgeTrendScreen() {
  const { checkIns } = useAppSession()
  const analytics = buildAnalytics(checkIns)

  return (
    <ScreenShell subtitle="Urge trend" title="steady.path">
      <SectionCard eyebrow="Trend" title="Recent urge levels">
        {checkIns.length === 0 ? (
          <EmptyStateCard title="No data available." body="Add a few check-ins first." />
        ) : (
          <View style={appStyles.chartCard}>
            <Text style={appStyles.chartTitle}>Recent urge levels</Text>
            <LineChart
              data={{
                labels: analytics.urgeLabels,
                datasets: [{ data: analytics.urgeValues }],
              }}
              width={chartWidth}
              height={220}
              withInnerLines={false}
              withOuterLines={false}
              withShadow={false}
              withDots
              bezier
              fromZero
              chartConfig={chartConfig}
              style={appStyles.chart}
            />
          </View>
        )}
      </SectionCard>
    </ScreenShell>
  )
}

export function OutcomeSummaryScreen() {
  const { checkIns } = useAppSession()
  const analytics = buildAnalytics(checkIns)

  return (
    <ScreenShell subtitle="Outcome summary" title="steady.path">
      <SectionCard eyebrow="Breakdown" title="Slip vs no-slip">
        {checkIns.length === 0 ? (
          <EmptyStateCard title="No data available." body="Add a few check-ins first." />
        ) : (
          <View style={appStyles.chartCard}>
            <Text style={appStyles.chartTitle}>Slip vs no-slip</Text>
            <BarChart
              data={{
                labels: analytics.slips.map((item) => item.label),
                datasets: [{ data: analytics.slips.map((item) => item.value) }],
              }}
              width={chartWidth}
              height={220}
              fromZero
              yAxisLabel=""
              yAxisSuffix=""
              showValuesOnTopOfBars
              withInnerLines={false}
              chartConfig={chartConfig}
              style={appStyles.chart}
            />
          </View>
        )}
      </SectionCard>
    </ScreenShell>
  )
}

export function MoodDistributionScreen() {
  const { checkIns } = useAppSession()
  const analytics = buildAnalytics(checkIns)

  return (
    <ScreenShell subtitle="Mood distribution" title="steady.path">
      <SectionCard eyebrow="Distribution" title="Mood mix">
        {checkIns.length === 0 ? (
          <EmptyStateCard title="No data available." body="Add a few check-ins first." />
        ) : (
          <View style={appStyles.chartCard}>
            <Text style={appStyles.chartTitle}>Mood distribution</Text>
            <PieChart
              data={analytics.moods}
              width={chartWidth}
              height={220}
              accessor="count"
              backgroundColor="transparent"
              chartConfig={chartConfig}
              paddingLeft="0"
              hasLegend
            />
          </View>
        )}
      </SectionCard>
    </ScreenShell>
  )
}

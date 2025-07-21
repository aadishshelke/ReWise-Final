// import { DashboardLayout } from "../layouts/DashboardLayout";
import { HeaderSection } from "../components/HeaderSection";
import { WeeklyGoalTracker } from "../components/WeeklyGoalTracker";
import { SmartSuggestionsCarousel } from "../components/SmartSuggestionsCarousel";
import { QuickActionsRow } from "../components/QuickActionsRow";
import { AnalyticsSection } from "../components/AnalyticsSection";
import { StudentSpotlightCard } from "../components/StudentSpotlightCard";
import { XPBadgeSection } from "../components/XPBadgeSection";
import { BalBuddyWidget } from "../components/BalBuddyWidget";

export default function Dashboard() {
  return (
    <>
      <HeaderSection />
      <WeeklyGoalTracker />
      <SmartSuggestionsCarousel />
      <QuickActionsRow />
      <AnalyticsSection />
      <StudentSpotlightCard />
      <XPBadgeSection />
      <BalBuddyWidget />
    </>
  );
}

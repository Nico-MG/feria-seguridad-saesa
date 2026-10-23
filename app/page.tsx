import Header from "@/components/Header";
import Hero from "@/components/Hero";
import QuickLinks from "@/components/QuickLinks";
import HomeSchedule from "@/components/HomeSchedule";

import { getActiveEvent, getTalksFromSupabase } from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const event = await getActiveEvent();
  const talks = event ? await getTalksFromSupabase(event.id) : [];

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <Hero eventDate={event?.date ?? null} />

      <div className="mx-auto max-w-5xl px-5 pb-12">
        <HomeSchedule talks={talks} />
        <QuickLinks />
      </div>
    </main>
  );
}

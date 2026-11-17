export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase';
import GuestRsvpClient from './GuestRsvpClient';

type Props = { params: Promise<{ token: string }> };

// Generates the rich image preview inside WhatsApp chats
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createClient();

  const { data: guest } = await supabase
    .from('guests')
    .select('full_name, events(title, location_name, invitation_image_url)')
    .eq('invite_token', token)
    .single();

const event = Array.isArray(guest?.events) ? guest.events[0] : guest?.events;

  if (!guest || !event) {
    return { title: 'Event Invitation' };
  }

  return {
    title: `${event.title} — Invitation for ${guest.full_name}`,
    description: `You are cordially invited to ${event.title} at ${event.location_name}. Tap to RSVP.`,
    openGraph: {
      title: `${event.title} — ${guest.full_name}`,
      description: `Location: ${event.location_name}`,
      images: event.invitation_image_url ? [event.invitation_image_url] : [],
    },
  };
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = createClient();

  const { data: guest } = await supabase
    .from('guests')
    .select('*, events(*)')
    .eq('invite_token', token)
    .single();

  if (!guest || guest.status === 'replaced') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="text-xl font-semibold text-[#1C1917]">Invitation Unavailable</h1>
          <p className="text-sm text-stone-500">
            This invitation link is invalid or has been updated by the host.
          </p>
        </div>
      </div>
    );
  }

  const event = Array.isArray(guest.events) ? guest.events[0] : guest.events;

  return <GuestRsvpClient initialGuest={guest} event={event} />;
}

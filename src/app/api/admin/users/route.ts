import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAuthorized(req: Request) {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
  const callerEmail = req.headers.get('x-admin-email')?.trim().toLowerCase();
  return Boolean(adminEmail && callerEmail === adminEmail);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabaseAdmin = getAdminClient();
  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, host_id, title, event_date, location_name')
    .order('event_date', { ascending: false });

  const { data: guests } = await supabaseAdmin.from('guests').select('id, event_id, status');

  const enrichedUsers = usersData.users.map((u) => {
    const userEvents = (events || []).filter((e) => e.host_id === u.id);
    const eventIds = new Set(userEvents.map((e) => e.id));
    const totalGuests = (guests || []).filter((g) => eventIds.has(g.event_id)).length;
    const isBanned = Boolean(u.banned_until && new Date(u.banned_until) > new Date());

    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      events_count: userEvents.length,
      guests_count: totalGuests,
      banned: isBanned,
      guest_limit: u.user_metadata?.guest_limit ?? null,
    };
  });

  const enrichedEvents = (events || []).map((ev) => {
    const host = usersData.users.find((u) => u.id === ev.host_id);
    const evGuests = (guests || []).filter((g) => g.event_id === ev.id);
    return {
      ...ev,
      host_email: host?.email || 'Unknown',
      guests_count: evGuests.length,
    };
  });

  return NextResponse.json({ users: enrichedUsers, events: enrichedEvents });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { email, password, guest_limit } = await req.json();
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Email and 6+ char password required' }, { status: 400 });
  }

  const supabaseAdmin = getAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: guest_limit ? { guest_limit: Number(guest_limit) } : {},
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data.user });
}

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId, action, newPassword, guestLimit } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const supabaseAdmin = getAdminClient();

  if (action === 'toggle_ban') {
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
    const currentlyBanned = Boolean(
      userRes?.user?.banned_until && new Date(userRes.user.banned_until) > new Date()
    );
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: currentlyBanned ? 'none' : '876000h',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ banned: !currentlyBanned });
  }

  if (action === 'reset_password') {
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true });
  }

  if (action === 'set_limit') {
    const limitVal = guestLimit === '' || guestLimit === null ? null : Number(guestLimit);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { guest_limit: limitVal },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guest_limit: limitVal });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId, eventId } = await req.json();
  const supabaseAdmin = getAdminClient();

  if (eventId) {
    const { error } = await supabaseAdmin.from('events').delete().eq('id', eventId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }

  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }

  return NextResponse.json({ error: 'Missing target ID' }, { status: 400 });
}

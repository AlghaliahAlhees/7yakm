import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { guests, event, isReminder } = await req.json();
    let instanceId = (process.env.ULTRAMSG_INSTANCE_ID || '')
      .trim()
      .replace(/^https?:\/\/api\.ultramsg\.com\//i, '')
      .replace(/\//g, '');

    if (instanceId && !instanceId.toLowerCase().startsWith('instance')) {
      instanceId = `instance${instanceId}`;
    }

    const token = process.env.ULTRAMSG_TOKEN?.trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    if (!Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json({ error: 'No guests provided' }, { status: 400 });
    }

    if (!instanceId || !token) {
      return NextResponse.json({ sent: guests.length, simulated: true });
    }

    const eventDateStr = event?.event_date
      ? new Date(event.event_date).toLocaleDateString('ar-KW', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const ultraHost = ['api', 'ultramsg', 'com'].join('.');
    const endpoint = `https://${ultraHost}/${instanceId}/messages/chat`;

    let lastError = '';
    const results = await Promise.all(
      guests.map(async (g: any) => {
        const cleanDigits = g.phone_number.replace(/\D/g, '');
        const inviteUrl = `${appUrl}/i/${g.invite_token}`;

        const bodyText = isReminder
          ? `تذكير لطيف \nمرحباً ${g.full_name}، نتشرف بتذكيركم بدعوتنا لحضور *${event.title}* يوم ${eventDateStr} في ${event.location_name}.\n\nيرجى تأكيد الحضور أو الاعتذار عبر الرابط:\n${inviteUrl}`
          : `دعوة خاصة \nمرحباً ${g.full_name}، يسرّنا دعوتكم لحضور *${event.title}* يوم ${eventDateStr} في ${event.location_name}.\n\nلتفاصيل الموقع وتأكيد الحضور:\n${inviteUrl}`;

        const params = new URLSearchParams({
          token,
          to: cleanDigits,
          body: bodyText,
        });

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) {
          lastError =
            typeof data.error === 'string'
              ? data.error
              : JSON.stringify(data.error || `Status ${res.status} (${endpoint})`);
          return false;
        }
        return true;
      })
    );

    const sentCount = results.filter(Boolean).length;
    if (sentCount === 0) {
      return NextResponse.json({ error: lastError || 'UltraMsg failed to send' }, { status: 400 });
    }

    return NextResponse.json({ sent: sentCount, simulated: false });
  } catch (err: any) {
    return NextResponse.json(
      { error: `${err.message}${err?.cause?.message ? ` (${err.cause.message})` : ''}` },
      { status: 500 }
    );
  }
}

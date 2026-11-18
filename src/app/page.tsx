"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Users,
  Search,
  ExternalLink,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  Clock,
  LogOut,
  QrCode,
  ArrowUp,
  ArrowDown,
  Loader2,
  KeyRound,
  GripVertical,
  Globe,
  Copy,
  Send,
  Bell,
} from "lucide-react";

import { createClient } from "@/lib/supabase";
import AuthForm from "../components/AuthForm";
import {
  NewEventModal,
  ImportGuestsModal,
  ReplaceGuestModal,
  CopyFromEventModal,
} from "../components/HostModals";

export default function HostDashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [replacingGuest, setReplacingGuest] = useState<any>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const isAr = lang === "ar";
  const [events, setEvents] = useState<any[]>([]);
  const [showCopyModal, setShowCopyModal] = useState(false);

  function notify(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadEvents(data.user.id);
      }
    });
  }, []);

  async function loadEvents(userId: string) {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("host_id", userId)
      .order("created_at", { ascending: false });

    const list = data || [];
    setEvents(list);
    if (list.length > 0) {
      selectEvent(list[0]);
    } else {
      setSelectedEvent(null);
      setCollections([]);
      setGuests([]);
    }
  }

  async function selectEvent(evInput: any) {
    const ev = Array.isArray(evInput) ? evInput[0] : evInput;
    if (!ev?.id) return;
    setSelectedEvent(ev);
    const [{ data: cols }, { data: gst }] = await Promise.all([
      supabase
        .from("collections")
        .select("*")
        .eq("event_id", ev.id)
        .order("sort_order"),
      supabase
        .from("guests")
        .select("*")
        .eq("event_id", ev.id)
        .order("created_at", { ascending: false }),
    ]);
    setCollections(cols || []);
    setGuests(gst || []);
  }

  async function handleAddCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const ev = Array.isArray(selectedEvent) ? selectedEvent[0] : selectedEvent;
    if (!ev?.id) {
      alert("No active event selected. Please refresh the page.");
      return;
    }

    const { data, error } = await supabase
      .from("collections")
      .insert({ event_id: ev.id, name: newCollectionName.trim() })
      .select()
      .single();

    if (error) {
      alert(`Error adding group: ${error.message}`);
      return;
    }
    if (data) {
      setCollections([...collections, data]);
      setNewCollectionName("");
    }
  }

  async function handleDeleteCollection(
    collectionId: string,
    collectionName: string,
  ) {
    if (
      !confirm(
        `Delete "${collectionName}"? Guests inside will move to General / Unassigned.`,
      )
    )
      return;

    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId);
    if (error) {
      alert(`Error deleting group: ${error.message}`);
      return;
    }
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    setGuests((prev) =>
      prev.map((g) =>
        g.collection_id === collectionId ? { ...g, collection_id: null } : g,
      ),
    );
  }

  async function handleMoveCollection(index: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= collections.length) return;

    const updated = [...collections];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    const reindexed = updated.map((c, idx) => ({ ...c, sort_order: idx }));
    setCollections(reindexed);
    notify(`Moved "${moved.name}" ${direction}`);

    await Promise.all(
      reindexed.map((c) =>
        supabase
          .from("collections")
          .update({ sort_order: c.sort_order })
          .eq("id", c.id),
      ),
    );
  }

  async function handleDropCollection(targetIndex: number) {
    if (
      draggedColIndex === null ||
      draggedColIndex === targetIndex ||
      targetIndex < 0
    )
      return;

    const updated = [...collections];
    const [moved] = updated.splice(draggedColIndex, 1);
    updated.splice(targetIndex, 0, moved);

    const reindexed = updated.map((c, idx) => ({ ...c, sort_order: idx }));
    setCollections(reindexed);
    setDraggedColIndex(null);
    notify(`Reordered "${moved.name}"`);

    await Promise.all(
      reindexed.map((c) =>
        supabase
          .from("collections")
          .update({ sort_order: c.sort_order })
          .eq("id", c.id),
      ),
    );
  }

  async function handleMoveGuestGroup(
    guestId: string,
    newCollectionId: string,
  ) {
    const targetId = newCollectionId || null;
    const { error } = await supabase
      .from("guests")
      .update({ collection_id: targetId })
      .eq("id", guestId);

    if (error) {
      alert(`Error moving guest: ${error.message}`);
      return;
    }
    setGuests((prev) =>
      prev.map((g) =>
        g.id === guestId ? { ...g, collection_id: targetId } : g,
      ),
    );
  }
  async function handleDeleteGuest(guestId: string, guestName: string) {
    if (!confirm(`Remove ${guestName} from this event?`)) return;
    const { error } = await supabase.from("guests").delete().eq("id", guestId);
    if (error) {
      alert(`Error deleting guest: ${error.message}`);
      return;
    }
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
  }

  async function dispatchPlatformWhatsApp(
    targetGuests: any[],
    isReminder: boolean,
  ) {
    const ev = Array.isArray(selectedEvent) ? selectedEvent : selectedEvent;
    if (!ev || targetGuests.length === 0) return false;

    setBusyAction("sending");
    const res = await fetch("/api/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guests: targetGuests,
        event: ev,
        isReminder,
        lang,
      }),
    });
    const result = await res.json();
    setBusyAction(null);

    if (!res.ok) {
      alert(`WhatsApp send failed: ${result.error}`);
      return false;
    }

    if (result.simulated) {
      notify(
        isAr
          ? `تمت جدولة ${result.sent} رسالة عبر رقم المنصة (وضع التجربة)`
          : `Queued ${result.sent} message(s) via platform number (Test Mode)`,
      );
    } else {
      notify(
        isAr
          ? `تم إرسال ${result.sent} رسالة عبر واتساب المنصة`
          : `Sent ${result.sent} message(s) via platform WhatsApp`,
      );
    }
    return true;
  }

  async function handleSendAllDraftInvites() {
    const draftGuests = activeGuests.filter((g) => g.status === "draft");
    if (draftGuests.length === 0) return;

    const confirmText = isAr
      ? `إرسال الدعوات الآن إلى ${draftGuests.length} ضيوف عبر رقم المنصة الرسمي؟`
      : `Send invitations to ${draftGuests.length} guests via your platform's official WhatsApp number?`;

    if (!confirm(confirmText)) return;

    const ok = await dispatchPlatformWhatsApp(draftGuests, false);
    if (!ok) return;

    const draftIds = draftGuests.map((g) => g.id);
    const { error } = await supabase
      .from("guests")
      .update({ status: "pending" })
      .in("id", draftIds);

    if (!error) {
      setGuests((prev) =>
        prev.map((g) =>
          draftIds.includes(g.id) ? { ...g, status: "pending" } : g,
        ),
      );
    }
  }

  async function handleRemindAllPending() {
    const pendingGuests = guests.filter((g) => g.status === "pending");
    if (pendingGuests.length === 0) return;

    const confirmText = isAr
      ? `هل تريد إرسال تذكير واتساب إلى جميع الضيوف الذين لم يردوا (${pendingGuests.length} ضيف)؟`
      : `Send a WhatsApp reminder to all ${pendingGuests.length} guests who haven't responded yet?`;

    if (!confirm(confirmText)) return;

    const ok = await dispatchPlatformWhatsApp(pendingGuests, true);
    if (ok) {
      notify(
        isAr
          ? `تم إرسال التذكير إلى ${pendingGuests.length} ضيف`
          : `Sent reminder to ${pendingGuests.length} pending guests`,
      );
    }
  }
  async function handleEditGuest(guest: any) {
    const newName = prompt(
      isAr ? "تعديل اسم الضيف:" : "Edit guest name:",
      guest.full_name,
    );
    if (newName === null) return;
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const newPhone = prompt(
      isAr
        ? "تعديل رقم الهاتف (مع رمز الدولة مثل +965):"
        : "Edit phone number (with country code e.g. +965):",
      guest.phone_number,
    );
    if (newPhone === null) return;
    const trimmedPhone = newPhone.trim();
    if (!trimmedPhone) return;

    const { error } = await supabase
      .from("guests")
      .update({
        full_name: trimmedName,
        phone_number: trimmedPhone,
      })
      .eq("id", guest.id);

    if (error) {
      alert(
        isAr
          ? `تعذر التحديث: ${error.message}`
          : `Failed to update: ${error.message}`,
      );
      return;
    }

    setGuests((prev) =>
      prev.map((g) =>
        g.id === guest.id
          ? { ...g, full_name: trimmedName, phone_number: trimmedPhone }
          : g,
      ),
    );
    notify(isAr ? "تم تحديث بيانات الضيف بنجاح" : "Guest details updated");
  }

  async function handleSendOrRemindGuest(
    guest: any,
    mode: "invite" | "reminder" = "invite",
  ) {
    const isReminder = mode === "reminder";
    const ok = await dispatchPlatformWhatsApp([guest], isReminder);
    if (!ok) return;

    if (guest.status === "draft") {
      const { error } = await supabase
        .from("guests")
        .update({ status: "pending" })
        .eq("id", guest.id);

      if (!error) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guest.id ? { ...g, status: "pending" } : g,
          ),
        );
      }
    }
  }

  async function handleUpdatePin(e: React.FormEvent) {
    e.preventDefault();
    const ev = Array.isArray(selectedEvent) ? selectedEvent : selectedEvent;
    if (!ev?.id || !pinDraft.trim()) return;

    setBusyAction("pin");
    const { data, error } = await supabase
      .from("events")
      .update({ gatekeeper_pin: pinDraft.trim() })
      .eq("id", ev.id)
      .select()
      .single();

    setBusyAction(null);
    if (error) {
      alert(`Could not save PIN: ${error.message}`);
      return;
    }
    if (data) {
      setSelectedEvent(data);
      setEditingPin(false);
      notify(`Door PIN updated to ${data.gatekeeper_pin}`);
    }
  }

  async function handleDeleteEvent() {
    const ev = Array.isArray(selectedEvent) ? selectedEvent : selectedEvent;
    if (!ev?.id) return;

    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف "${ev.title}"؟ سيتم حذف جميع المجموعات والضيوف المرتبطين بها.`
      : `Delete "${ev.title}"? This will permanently remove all its groups and guest invites.`;

    if (!confirm(confirmMsg)) return;

    setBusyAction("delete-event");
    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    setBusyAction(null);

    if (error) {
      alert(`Error deleting event: ${error.message}`);
      return;
    }

    const remaining = events.filter((item) => item.id !== ev.id);
    setEvents(remaining);
    notify(isAr ? "تم حذف المناسبة" : "Event deleted");

    if (remaining.length > 0) {
      selectEvent(remaining[0]);
    } else {
      setSelectedEvent(null);
      setCollections([]);
      setGuests([]);
    }
  }

  if (!user) {
    return (
      <AuthForm
        onAuthenticated={(u) => {
          setUser(u);
          loadEvents(u.id);
        }}
      />
    );
  }
  const activeGuests = guests.filter((g) => g.status !== "replaced");
  const acceptedHeadcount = activeGuests
    .filter((g) => g.status === "accepted")
    .reduce((sum, g) => sum + 1 + (g.extra_guests || 0), 0);
  const arrivedTotal = activeGuests.reduce(
    (sum, g) => sum + (g.arrived_count || 0),
    0,
  );
  const pendingCount = activeGuests.filter(
    (g) => g.status === "pending",
  ).length;
  const draftCount = activeGuests.filter((g) => g.status === "draft").length; // <--- ADD THIS LINE

  const collectionMap = Object.fromEntries(
    collections.map((c) => [c.id, c.name]),
  );

  const filteredGuests = activeGuests.filter((g) => {
    const familyName = collectionMap[g.collection_id] || "Unassigned";
    const matchesSearch =
      g.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      familyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "attended"
        ? g.arrived_count > 0
        : g.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const groupedSections = [
    ...collections.map((col) => ({
      id: col.id,
      name: col.name,
      items: filteredGuests.filter((g) => g.collection_id === col.id),
    })),
    {
      id: "unassigned",
      name: "General / Unassigned",
      items: filteredGuests.filter((g) => !g.collection_id),
    },
  ].filter(
    (sec) =>
      sec.items.length > 0 || (searchQuery === "" && sec.id !== "unassigned"),
  );
  const statusLabels: Record<string, string> = {
    all: isAr ? "الكل" : "All",
    draft: isAr ? "غير مرسل" : "Draft",
    accepted: isAr ? "مؤكد" : "Accepted",
    pending: isAr ? "بانتظار الرد" : "Pending",
    declined: isAr ? "معتذر" : "Declined",
    attended: isAr ? "حضر" : "Attended",
  };

  async function enforceGuestQuota(newlyAdded: any[]) {
    const guestLimit = Number(user?.user_metadata?.guest_limit || 0);
    if (!guestLimit) {
      setGuests((prev) => [...newlyAdded, ...prev]);
      return true;
    }

    const remaining = Math.max(0, guestLimit - guests.length);
    if (newlyAdded.length <= remaining) {
      setGuests((prev) => [...newlyAdded, ...prev]);
      return true;
    }

    // Keep only what fits within the quota, and remove the excess from Supabase
    const allowed = newlyAdded.slice(0, remaining);
    const excessIds = newlyAdded.slice(remaining).map((g) => g.id);

    if (excessIds.length > 0) {
      await supabase.from("guests").delete().in("id", excessIds);
    }

    if (allowed.length > 0) {
      setGuests((prev) => [...allowed, ...prev]);
    }

    alert(
      isAr
        ? `لقد وصلت إلى الحد الأقصى لباقتك (${guestLimit} ضيف). تم حفظ ${allowed.length} ضيف فقط.`
        : `You reached your package quota (${guestLimit} guests). Only ${allowed.length} guests were saved.`,
    );
    return false;
  }

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-[#FAF8F5] text-[#1C1917] pb-20"
    >
      <header className="bg-white border-b border-stone-200 px-5 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-[#B48A5A] font-semibold">
              {isAr ? "لوحة المضيف" : "Host Dashboard"}
            </p>
            {events.length > 0 && selectedEvent ? (
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={selectedEvent.id}
                  onChange={(e) => {
                    const found = events.find((ev) => ev.id === e.target.value);
                    if (found) selectEvent(found);
                  }}
                  className="text-base font-bold bg-[#FAF8F5] border border-stone-200 rounded-xl px-2.5 py-1 text-[#1C1917] max-w-[200px] sm:max-w-xs truncate focus:outline-none focus:border-[#2E5A44]"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busyAction === "delete-event"}
                  onClick={handleDeleteEvent}
                  className="text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200/80 px-2.5 py-1 rounded-lg shrink-0"
                  title={isAr ? "حذف هذه المناسبة" : "Delete this event"}
                >
                  {busyAction === "delete-event"
                    ? isAr
                      ? "جاري الحذف..."
                      : "Deleting..."
                    : isAr
                      ? "حذف"
                      : "Delete"}
                </button>
              </div>
            ) : (
              <h1 className="text-lg font-bold truncate">
                {isAr ? "مناسباتي" : "My Gatherings"}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-stone-200 text-stone-700 text-xs font-semibold px-3 py-2 rounded-xl hover:border-[#B48A5A]"
            >
              <Globe className="w-3.5 h-3.5 text-[#B48A5A]" />
              <span>{isAr ? "EN" : "عربي"}</span>
            </button>
            <button
              onClick={() => setShowNewEventModal(true)}
              className="inline-flex items-center gap-1.5 bg-[#2E5A44] text-white text-xs font-semibold px-3.5 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" /> {isAr ? "مناسبة جديدة" : "New Event"}
            </button>
            <button
              onClick={() => {
                supabase.auth.signOut();
                setUser(null);
              }}
              className="p-2 text-stone-400 hover:text-stone-700"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {user?.email?.toLowerCase() ===
              process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() && (
              <a
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#2E5A44] text-white px-3 py-1.5 rounded-xl hover:bg-[#244736]"
              >
                {isAr ? "لوحة الإدارة" : "Admin"}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pt-6 space-y-6">
        {!selectedEvent ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-stone-200 space-y-3">
            <p className="font-semibold">No events created yet</p>
            <button
              onClick={() => setShowNewEventModal(true)}
              className="bg-[#2E5A44] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Create Your First Gathering
            </button>
          </div>
        ) : (
          <>
            {/* 3 Live Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-stone-200/80">
                <p className="text-xs text-stone-500">
                  {isAr ? "الضيوف المؤكدون" : "Confirmed Guests"}
                </p>
                <p className="text-2xl font-bold text-[#2E5A44] mt-1">
                  {acceptedHeadcount}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-stone-200/80">
                <p className="text-xs text-stone-500">
                  {isAr ? "الحضور عند البوابة" : "Arrived at Door"}
                </p>
                <p className="text-2xl font-bold text-[#1C1917] mt-1">
                  {arrivedTotal}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-stone-200/80">
                <p className="text-xs text-stone-500">
                  {isAr ? "بانتظار الرد" : "Pending RSVP"}
                </p>
                <p className="text-2xl font-bold text-[#B48A5A] mt-1">
                  {pendingCount}
                </p>
              </div>
            </div>

            {/* Door Scanner PIN Bar */}
            <div className="bg-white px-4 py-3 rounded-2xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <KeyRound className="w-4 h-4 text-[#B48A5A]" />
                <span className="text-stone-500">
                  {isAr ? "رمز البوابة:" : "Door Scanner PIN:"}
                </span>
                {editingPin ? (
                  <form
                    onSubmit={handleUpdatePin}
                    className="inline-flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      maxLength={6}
                      value={pinDraft}
                      onChange={(e) => setPinDraft(e.target.value)}
                      className="w-20 border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold"
                    />
                    <button
                      type="submit"
                      disabled={busyAction === "pin"}
                      className="bg-[#2E5A44] text-white px-2.5 py-1 rounded-lg text-xs font-semibold"
                    >
                      {busyAction === "pin"
                        ? isAr
                          ? "حفظ..."
                          : "Saving..."
                        : isAr
                          ? "حفظ"
                          : "Save"}
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="font-mono font-bold text-sm text-[#1C1917] bg-[#FAF8F5] px-2.5 py-0.5 rounded-md border border-stone-200">
                      {selectedEvent.gatekeeper_pin || "1234"}
                    </span>
                    <button
                      onClick={() => {
                        setPinDraft(selectedEvent.gatekeeper_pin || "1234");
                        setEditingPin(true);
                      }}
                      className="text-[#2E5A44] font-semibold underline ms-1"
                    >
                      {isAr ? "تغيير" : "Change"}
                    </button>
                  </>
                )}
              </div>
              <a
                href={`/door/${selectedEvent.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold px-3 py-1.5 rounded-xl"
              >
                <QrCode className="w-3.5 h-3.5 text-[#B48A5A]" />{" "}
                {isAr ? "ماسح البوابة" : "Open Door Scanner"}
              </a>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/80">
              <form
                onSubmit={handleAddCollection}
                className="flex items-center gap-2 flex-1 min-w-[220px]"
              >
                <input
                  type="text"
                  placeholder={
                    isAr
                      ? "مجموعة جديدة (مثال: عائلة الفلان)"
                      : "New family group (e.g. A Family)"
                  }
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="flex-1 rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="bg-stone-800 text-white text-xs font-semibold px-3 py-2 rounded-xl"
                >
                  {isAr ? "إضافة مجموعة" : "Add Group"}
                </button>
              </form>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-1.5 bg-[#2E5A44] text-white text-xs font-semibold px-3.5 py-2 rounded-xl"
                >
                  <UserPlus className="w-4 h-4" />{" "}
                  {isAr ? "إضافة ضيوف" : "Import / Add Guests"}
                </button>
                {events.length > 1 && (
                  <button
                    onClick={() => setShowCopyModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-stone-300 text-stone-800 text-xs font-semibold px-3.5 py-2 rounded-xl hover:border-[#2E5A44]"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#2E5A44]" />
                    {isAr ? "نسخ من مناسبة" : "Copy from Event"}
                  </button>
                )}

                <a
                  href={`/door/${selectedEvent.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold px-3.5 py-2 rounded-xl"
                >
                  <QrCode className="w-4 h-4 text-[#B48A5A]" />{" "}
                  {isAr ? "ماسح البوابة" : "Door Scanner"}
                </a>
              </div>
            </div>

            {/* Send Invitations Banner */}
            {draftCount > 0 && (
              <div className="bg-[#2E5A44] text-white p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                <div>
                  <p className="font-bold text-sm">
                    {isAr
                      ? `${draftCount} ضيوف جاهزون لإرسال الدعوة`
                      : `${draftCount} ${draftCount === 1 ? "guest is" : "guests are"} ready to invite`}
                  </p>
                  <p className="text-xs opacity-85">
                    {isAr
                      ? "راجع الأسماء والمجموعات ثم أرسل الدعوات."
                      : "Review names & family groups, then send when ready."}
                  </p>
                </div>
                <button
                  onClick={handleSendAllDraftInvites}
                  className="bg-white text-[#2E5A44] font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 hover:bg-stone-100"
                >
                  {isAr
                    ? `إرسال ${draftCount} دعوة`
                    : `Send ${draftCount} Invitations`}
                </button>
              </div>
            )}

            {/* Remind All Pending Guests Banner */}
            {guests.filter((g) => g.status === "pending").length > 0 && (
              <div className="bg-amber-50 border border-amber-200/80 text-amber-950 p-4 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">
                    {isAr
                      ? `${guests.filter((g) => g.status === "pending").length} ضيوف بانتظار الرد`
                      : `${guests.filter((g) => g.status === "pending").length} guests haven't responded yet`}
                  </p>
                  <p className="text-xs text-amber-800">
                    {isAr
                      ? "أرسل تذكيراً لطيفاً عبر واتساب لجميع غير المؤكدين دفعة واحدة."
                      : "Send a gentle WhatsApp reminder to all pending guests at once."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemindAllPending}
                  className="bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 hover:bg-amber-700"
                >
                  {isAr
                    ? `تذكير الجميع (${guests.filter((g) => g.status === "pending").length})`
                    : `Remind All (${guests.filter((g) => g.status === "pending").length})`}
                </button>
              </div>
            )}

            {/* Search & Filter Pills */}
            <div className="space-y-3">
              <div className="relative">
                <Search
                  className={`w-4 h-4 text-stone-400 absolute ${isAr ? "right-3.5" : "left-3.5"} top-3`}
                />
                <input
                  type="text"
                  placeholder={
                    isAr
                      ? "ابحث باسم الضيف أو المجموعة..."
                      : "Search by guest name or family group (e.g. A Family)..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded-xl border border-stone-200 bg-white ${isAr ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm`}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  "all",
                  "draft",
                  "accepted",
                  "pending",
                  "declined",
                  "attended",
                ].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                      statusFilter === st
                        ? "bg-[#1C1917] text-white"
                        : "bg-white text-stone-600 border border-stone-200"
                    }`}
                  >
                    {statusLabels[st]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {groupedSections.map((group) => {
                const colIndex = collections.findIndex(
                  (c) => c.id === group.id,
                );
                return (
                  <div
                    key={group.id}
                    draggable={group.id !== "unassigned"}
                    onDragStart={() => setDraggedColIndex(colIndex)}
                    onDragOver={(e) => {
                      if (group.id !== "unassigned") e.preventDefault();
                    }}
                    onDrop={() => {
                      if (group.id !== "unassigned")
                        handleDropCollection(colIndex);
                    }}
                    onDragEnd={() => setDraggedColIndex(null)}
                    className={`bg-white rounded-2xl border overflow-hidden transition ${
                      draggedColIndex === colIndex
                        ? "opacity-50 border-[#2E5A44] scale-[0.99]"
                        : "border-stone-200/80"
                    }`}
                  >
                    <div
                      className={`bg-[#FAF8F5] px-4 py-3 border-b border-stone-200/70 flex items-center justify-between ${
                        group.id !== "unassigned"
                          ? "cursor-grab active:cursor-grabbing"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {group.id !== "unassigned" && (
                          <GripVertical className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                        <Users className="w-4 h-4 text-[#B48A5A]" />
                        <h2 className="font-bold text-sm">
                          {group.id === "unassigned"
                            ? isAr
                              ? "عام / غير مصنف"
                              : "General / Unassigned"
                            : group.name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500 font-medium">
                          {group.items.length} {isAr ? "دعوات" : "invites"}
                        </span>
                        {group.id !== "unassigned" && (
                          <div className="flex items-center gap-1">
                            <button
                              disabled={colIndex <= 0}
                              onClick={() =>
                                handleMoveCollection(colIndex, "up")
                              }
                              className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30"
                              title={isAr ? "تحريك للأعلى" : "Move group up"}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={colIndex === collections.length - 1}
                              onClick={() =>
                                handleMoveCollection(colIndex, "down")
                              }
                              className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30"
                              title={isAr ? "تحريك للأسفل" : "Move group down"}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteCollection(group.id, group.name)
                              }
                              className="text-[11px] font-semibold text-red-600 hover:text-red-800 px-2 py-0.5 rounded-md hover:bg-red-50"
                            >
                              {isAr ? "حذف المجموعة" : "Delete Group"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-stone-100">
                      {group.items.length === 0 ? (
                        <p className="p-4 text-xs text-stone-400">
                          {isAr
                            ? "لا يوجد ضيوف في هذه المجموعة بعد."
                            : "No guests in this group yet."}
                        </p>
                      ) : (
                        group.items.map((g) => (
                          <div
                            key={g.id}
                            className="p-4 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">
                                  {g.full_name}
                                </span>
                                {g.extra_guests > 0 && (
                                  <span className="text-[11px] font-bold bg-[#FAF8F5] text-[#2E5A44] border border-[#2E5A44]/20 px-2 py-0.5 rounded-full">
                                    +{g.extra_guests}
                                  </span>
                                )}
                                {g.arrived_count > 0 && (
                                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                    {isAr ? "حضر" : "Attended"} (
                                    {g.arrived_count}/{1 + g.extra_guests})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-500" dir="ltr">
                                {g.phone_number}
                              </p>
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-[11px] text-stone-400">
                                  {isAr ? "المجموعة:" : "Group:"}
                                </span>
                                <select
                                  value={g.collection_id || ""}
                                  onChange={(e) =>
                                    handleMoveGuestGroup(g.id, e.target.value)
                                  }
                                  className="text-[11px] bg-[#FAF8F5] border border-stone-200 rounded-lg px-2 py-0.5 text-stone-700 font-medium"
                                >
                                  <option value="">
                                    {isAr
                                      ? "عام / غير مصنف"
                                      : "General / Unassigned"}
                                  </option>
                                  {collections.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {g.guest_note && (
                                <p className="text-xs italic text-stone-600 bg-[#FAF8F5] px-2.5 py-1 rounded-lg">
                                  &ldquo;{g.guest_note}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              {g.status === "draft" ? (
                                <button
                                  disabled={busyAction === "sending"}
                                  onClick={() =>
                                    handleSendOrRemindGuest(g, "invite")
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-semibold bg-[#2E5A44] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#244736] disabled:opacity-50"
                                  title={
                                    isAr ? "إرسال الدعوة" : "Send Invitation"
                                  }
                                >
                                  <Send className="w-3 h-3" />
                                  {isAr ? "إرسال" : "Send"}
                                </button>
                              ) : (
                                <button
                                  disabled={busyAction === "sending"}
                                  onClick={() =>
                                    handleSendOrRemindGuest(g, "invite")
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 px-2.5 py-1.5 rounded-lg hover:bg-stone-200/70 disabled:opacity-50"
                                  title={
                                    isAr
                                      ? "إعادة إرسال الدعوة"
                                      : "Resend Invitation"
                                  }
                                >
                                  <Send className="w-3 h-3" />
                                  {isAr ? "إعادة إرسال" : "Resend"}
                                </button>
                              )}

                              {g.status === "pending" && (
                                <button
                                  disabled={busyAction === "sending"}
                                  onClick={() =>
                                    handleSendOrRemindGuest(g, "reminder")
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                                  title={isAr ? "إرسال تذكير" : "Send Reminder"}
                                >
                                  <Bell className="w-3 h-3" />
                                  {isAr ? "تذكير" : "Remind"}
                                </button>
                              )}

                              {g.status === "accepted" && (
                                <CheckCircle2 className="w-4 h-4 text-[#2E5A44]" />
                              )}

                              {g.status === "declined" && (
                                <button
                                  onClick={() => setReplacingGuest(g)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg"
                                >
                                  <RefreshCw className="w-3 h-3" />{" "}
                                  {isAr ? "استبدال" : "Replace"}
                                </button>
                              )}

                              <a
                                href={`/i/${g.invite_token}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2E5A44] bg-[#2E5A44]/10 px-2.5 py-1.5 rounded-lg"
                              >
                                {isAr ? "الدعوة" : "Invite"}{" "}
                                <ExternalLink className="w-3 h-3" />
                              </a>

                              <button
                                onClick={() =>
                                  handleDeleteGuest(g.id, g.full_name)
                                }
                                className="text-xs font-semibold text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                                title={isAr ? "حذف الضيف" : "Remove guest"}
                              >
                                {isAr ? "حذف" : "Delete"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditGuest(g)}
                                className="text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg"
                              >
                                {isAr ? "تعديل" : "Edit"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showNewEventModal && (
        <NewEventModal
          user={user}
          onClose={() => setShowNewEventModal(false)}
          onCreated={() => loadEvents(user.id)}
        />
      )}
      {showImportModal && selectedEvent && (
        <ImportGuestsModal
          eventId={selectedEvent.id}
          collections={collections}
          onClose={() => setShowImportModal(false)}
          onSaved={(added) => enforceGuestQuota(added)}
        />
      )}

      {showCopyModal && selectedEvent && (
        <CopyFromEventModal
          currentEventId={selectedEvent.id}
          events={events}
          targetCollections={collections}
          isAr={isAr}
          onClose={() => setShowCopyModal(false)}
          onCopied={async (copied) => {
            const allFit = await enforceGuestQuota(copied);
            if (allFit) {
              notify(
                isAr
                  ? `تم نسخ ${copied.length} ضيوف`
                  : `Copied ${copied.length} guests`,
              );
            }
          }}
        />
      )}

      {replacingGuest && selectedEvent && (
        <ReplaceGuestModal
          guest={replacingGuest}
          eventId={selectedEvent.id}
          onClose={() => setReplacingGuest(null)}
          onReplaced={() => selectEvent(selectedEvent)}
        />
      )}
    </main>
  );
}

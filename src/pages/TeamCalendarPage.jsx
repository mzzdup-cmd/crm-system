import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamCalendar } from "../hooks/useTeamCalendar";

import TeamCalendarGrid from "../components/calendar/TeamCalendarGrid";
import CalendarLegend from "../components/calendar/CalendarLegend";
import CalendarDayModal from "../components/calendar/CalendarDayModal";
import CalendarInsightsPanel from "../components/calendar/CalendarInsightsPanel";
import CalendarEventModal from "../components/calendar/CalendarEventModal";
import RealtimeIndicator from "../components/ui/RealtimeIndicator";
import LoadingState from "../components/LoadingState";

import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../services/calendarEventService";

export default function TeamCalendarPage() {
  const { userData } = useAuth();
  const toast = useToast();

  const {
    monthTitle,
    monthGrid,
    schedulesByDate,
    getDayEvents,
    insights,
    loading,
    connected,
    isLeadership,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  } = useTeamCalendar();

  const [selectedDate, setSelectedDate] =
    useState(null);

  const [eventModalOpen, setEventModalOpen] =
    useState(false);

  const [editingEvent, setEditingEvent] =
    useState(null);

  const [savingEvent, setSavingEvent] =
    useState(false);

  async function handleSaveEvent(payload) {
    setSavingEvent(true);

    try {
      if (editingEvent?.id) {
        await updateCalendarEvent(
          editingEvent.id,
          payload,
          userData
        );
        toast.success("Событие обновлено");
      } else {
        await createCalendarEvent(
          payload,
          userData
        );
        toast.success("Событие создано");
      }

      setEventModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось сохранить событие"
      );
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(event) {
    if (!event?.id || !event.editable) {
      return;
    }

    try {
      await deleteCalendarEvent(event.id);
      toast.success("Событие удалено");
      setSelectedDate(null);
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось удалить событие"
      );
    }
  }

  if (loading) {
    return (
      <LoadingState message="Загрузка календаря..." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">
            Календарь команды
          </h1>

          <p className="text-slate-400 mt-2 flex items-center gap-3 flex-wrap">
            <span>
              Единый календарь выходных, отпусков и событий
            </span>
            <RealtimeIndicator connected={connected} />
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isLeadership && (
            <button
              type="button"
              onClick={() => {
                setEditingEvent(null);
                setEventModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 transition-colors"
            >
              + Событие
            </button>
          )}

          <Link
            to="/time-off"
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Запросы отсутствия
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
          >
            ←
          </button>

          <div className="text-xl md:text-2xl font-bold min-w-[180px] text-center">
            {monthTitle}
          </div>

          <button
            type="button"
            onClick={goToNextMonth}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
          >
            →
          </button>
        </div>

        <button
          type="button"
          onClick={goToToday}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
        >
          Сегодня
        </button>
      </div>

      <CalendarLegend />

      <TeamCalendarGrid
        monthGrid={monthGrid}
        schedulesByDate={schedulesByDate}
        onSelectDay={setSelectedDate}
        onSwipe={(direction) => {
          if (direction === "prev") {
            goToPreviousMonth();
          } else {
            goToNextMonth();
          }
        }}
      />

      <CalendarInsightsPanel insights={insights} />

      <CalendarDayModal
        open={Boolean(selectedDate)}
        dateKey={selectedDate}
        schedule={
          selectedDate
            ? schedulesByDate[selectedDate] || null
            : null
        }
        events={
          selectedDate
            ? getDayEvents(selectedDate)
            : []
        }
        isLeadership={isLeadership}
        onClose={() => setSelectedDate(null)}
        onEditEvent={(event) => {
          setEditingEvent(event);
          setEventModalOpen(true);
        }}
        onDeleteEvent={handleDeleteEvent}
      />

      <CalendarEventModal
        open={eventModalOpen}
        initialEvent={editingEvent}
        defaultDate={selectedDate}
        loading={savingEvent}
        onClose={() => {
          setEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
      />
    </div>
  );
}

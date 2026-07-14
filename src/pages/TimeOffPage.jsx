import {
  useState,
} from "react";

import { Link } from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

import { useToast }
from "../context/ToastContext";

import { usePermissions }
from "../hooks/usePermissions";

import { useOperationalRequests }
from "../hooks/useOperationalRequests";

import {
  createTimeOffRequest,
  reviewTimeOffRequest,
  deleteTimeOffRequest,
} from "../services/timeOffRequestService";

import {
  createVacationRequest,
  reviewVacationRequest,
  deleteVacationRequest,
} from "../services/vacationRequestService";

import {
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
} from "../constants/timeOff";

import {
  getManagerNameById,
} from "../constants/managers";

import PageHeader
from "../components/ui/PageHeader";

import LoadingState
from "../components/LoadingState";

import ConfirmModal
from "../components/ui/ConfirmModal";

const inputClass =
  "w-full bg-surface-raised p-3.5 rounded-xl";

function StatusBadge({ status }) {
  const colors = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    approved: "bg-green-500/15 text-green-300 border-green-500/30",
    rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full border ${colors[status] || colors.pending}`}
    >
      {REQUEST_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function TimeOffPage({
  embedded = false,
}) {
  const { user, userData } = useAuth();
  const toast = useToast();
  const { isLeadership } = usePermissions();

  const {
    timeOffRequests,
    vacationRequests,
    summary,
    loading,
  } = useOperationalRequests();

  const [offDate, setOffDate] =
    useState("");

  const [offComment, setOffComment] =
    useState("");

  const [vacationStart, setVacationStart] =
    useState("");

  const [vacationEnd, setVacationEnd] =
    useState("");

  const [vacationComment, setVacationComment] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const actor = userData
    ? {
        ...userData,
        uid: user?.uid || userData.uid,
      }
    : null;

  const createdByUid =
    user?.uid || actor?.uid || null;

  const vacationDays =
    vacationStart &&
    vacationEnd &&
    vacationEnd >= vacationStart
      ? Math.ceil(
          (new Date(`${vacationEnd}T12:00:00`) -
            new Date(`${vacationStart}T12:00:00`)) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  async function submitDayOff() {
    if (!offDate || !actor) {
      toast.error("Выберите дату");
      return;
    }

    setSubmitting(true);

    try {
      await createTimeOffRequest({
        date: offDate,
        comment: offComment,
        userData: actor,
        createdByUid,
      });

      toast.success(
        "Запрос на выходной отправлен"
      );
      setOffDate("");
      setOffComment("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVacation() {
    if (
      !vacationStart ||
      !vacationEnd ||
      !actor
    ) {
      toast.error("Укажите период");
      return;
    }

    setSubmitting(true);

    try {
      await createVacationRequest({
        startDate: vacationStart,
        endDate: vacationEnd,
        comment: vacationComment,
        userData: actor,
        createdByUid,
      });

      toast.success(
        "Запрос на отпуск отправлен"
      );
      setVacationStart("");
      setVacationEnd("");
      setVacationComment("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview({
    type,
    requestId,
    status,
  }) {
    if (!actor) {
      return;
    }

    setSubmitting(true);

    try {
      if (type === "dayOff") {
        await reviewTimeOffRequest({
          requestId,
          status,
          userData: actor,
        });
      } else {
        await reviewVacationRequest({
          requestId,
          status,
          userData: actor,
        });
      }

      toast.success(
        status === REQUEST_STATUS.APPROVED
          ? "Запрос одобрен"
          : "Запрос отклонён"
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !actor) {
      return;
    }

    setSubmitting(true);

    try {
      if (deleteTarget.type === "dayOff") {
        await deleteTimeOffRequest({
          requestId: deleteTarget.requestId,
          userData: actor,
        });
      } else {
        await deleteVacationRequest({
          requestId: deleteTarget.requestId,
          userData: actor,
        });
      }

      toast.success(
        deleteTarget.wasApproved
          ? "Отсутствие удалено, календарь обновлён"
          : "Запрос удалён"
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function canDeleteRequest(request) {
    if (!actor) {
      return false;
    }

    if (isLeadership) {
      return (
        request.status ===
          REQUEST_STATUS.PENDING ||
        request.status ===
          REQUEST_STATUS.APPROVED
      );
    }

    const isOwn =
      request.managerId === actor.managerId ||
      request.createdBy === actor.uid;

    return (
      isOwn &&
      (
        request.status ===
          REQUEST_STATUS.PENDING ||
        request.status ===
          REQUEST_STATUS.APPROVED
      )
    );
  }

  if (loading) {
    return (
      <LoadingState message="Загрузка запросов..." />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {!embedded && (
        <PageHeader
          title="Запросы"
          subtitle="Выходные и отпуска"
        />
      )}

      {isLeadership &&
        summary.pendingTotal > 0 && (
          <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-amber-200">
              Ожидают подтверждения:{" "}
              {summary.pendingTotal}
            </h2>

            {summary.pendingTimeOff.map(
              (request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  type="dayOff"
                  onReview={handleReview}
                  onDelete={
                    canDeleteRequest(request)
                      ? () =>
                          setDeleteTarget({
                            type: "dayOff",
                            requestId: request.id,
                            label: `${request.manager || getManagerNameById(request.managerId)} — ${request.date}`,
                            wasApproved: false,
                          })
                      : null
                  }
                  submitting={submitting}
                />
              )
            )}

            {summary.pendingVacations.map(
              (request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  type="vacation"
                  onReview={handleReview}
                  onDelete={
                    canDeleteRequest(request)
                      ? () =>
                          setDeleteTarget({
                            type: "vacation",
                            requestId: request.id,
                            label: `${request.manager || getManagerNameById(request.managerId)} — ${request.startDate} — ${request.endDate}`,
                            wasApproved: false,
                          })
                      : null
                  }
                  submitting={submitting}
                />
              )
            )}
          </section>
        )}

      {!isLeadership && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold">
              Запрос на выходной
            </h2>

            <label className="block">
              <span className="text-sm text-neutral-400">
                Дата *
              </span>
              <input
                type="date"
                value={offDate}
                onChange={(e) =>
                  setOffDate(e.target.value)
                }
                className={`${inputClass} mt-1`}
              />
            </label>

            <input
              placeholder="Комментарий (необязательно)"
              value={offComment}
              onChange={(e) =>
                setOffComment(e.target.value)
              }
              className={inputClass}
            />

            <button
              type="button"
              onClick={submitDayOff}
              disabled={submitting}
              className="w-full bg-brand hover:opacity-90 p-3.5 rounded-xl font-bold disabled:opacity-50"
            >
              Отправить запрос
            </button>
          </section>

          <section className="bg-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold">
              Запрос на отпуск
            </h2>

            <label className="block">
              <span className="text-sm text-neutral-400">
                Дата начала *
              </span>
              <input
                type="date"
                value={vacationStart}
                onChange={(e) =>
                  setVacationStart(
                    e.target.value
                  )
                }
                className={`${inputClass} mt-1`}
              />
            </label>

            <label className="block">
              <span className="text-sm text-neutral-400">
                Дата конца *
              </span>
              <input
                type="date"
                value={vacationEnd}
                onChange={(e) =>
                  setVacationEnd(
                    e.target.value
                  )
                }
                className={`${inputClass} mt-1`}
              />
            </label>

            {vacationDays > 0 && (
              <div className="text-sm text-brand">
                Дней отпуска: {vacationDays}
              </div>
            )}

            <input
              placeholder="Комментарий (необязательно)"
              value={vacationComment}
              onChange={(e) =>
                setVacationComment(
                  e.target.value
                )
              }
              className={inputClass}
            />

            <button
              type="button"
              onClick={submitVacation}
              disabled={submitting}
              className="w-full bg-violet-500 hover:bg-violet-400 p-3.5 rounded-xl font-bold disabled:opacity-50"
            >
              Отправить запрос
            </button>
          </section>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">
          {isLeadership
            ? "Все запросы"
            : "Мои запросы"}
        </h2>

        {timeOffRequests.length === 0 &&
          vacationRequests.length === 0 && (
            <div className="text-neutral-500 bg-surface rounded-2xl p-6">
              Запросов пока нет
            </div>
          )}

        {timeOffRequests.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            type="dayOff"
            onReview={
              isLeadership
                ? handleReview
                : null
            }
            onDelete={
              canDeleteRequest(request)
                ? () =>
                    setDeleteTarget({
                      type: "dayOff",
                      requestId: request.id,
                      label: `${request.manager || getManagerNameById(request.managerId)} — ${request.date}`,
                      wasApproved:
                        request.status ===
                        REQUEST_STATUS.APPROVED,
                    })
                : null
            }
            submitting={submitting}
          />
        ))}

        {vacationRequests.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            type="vacation"
            onReview={
              isLeadership
                ? handleReview
                : null
            }
            onDelete={
              canDeleteRequest(request)
                ? () =>
                    setDeleteTarget({
                      type: "vacation",
                      requestId: request.id,
                      label: `${request.manager || getManagerNameById(request.managerId)} — ${request.startDate} — ${request.endDate}`,
                      wasApproved:
                        request.status ===
                        REQUEST_STATUS.APPROVED,
                    })
                : null
            }
            submitting={submitting}
          />
        ))}
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Удалить отсутствие?"
        message={
          deleteTarget
            ? deleteTarget.wasApproved
              ? `${deleteTarget.label} — строка исчезнет из календаря команды.`
              : `Удалить запрос: ${deleteTarget.label}?`
            : ""
        }
        confirmLabel="Удалить"
        variant="danger"
        loading={submitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() =>
          setDeleteTarget(null)
        }
      />

      <Link
        to="/"
        className="text-sm text-brand hover:underline"
      >
        ← Dashboard
      </Link>
    </div>
  );
}

function RequestRow({
  request,
  type,
  onReview,
  onDelete,
  submitting,
}) {
  const isPending =
    request.status ===
    REQUEST_STATUS.PENDING;

  const isApproved =
    request.status ===
    REQUEST_STATUS.APPROVED;

  return (
    <div className="bg-surface rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">
            {request.manager ||
              getManagerNameById(
                request.managerId
              )}
          </span>
          <StatusBadge
            status={request.status}
          />
          <span className="text-xs text-neutral-500">
            {type === "dayOff"
              ? "Выходной"
              : "Отпуск"}
          </span>
        </div>

        <div className="text-neutral-300 mt-2 text-sm">
          {type === "dayOff"
            ? request.date
            : `${request.startDate} — ${request.endDate} (${request.daysCount} дн.)`}
        </div>

        {request.comment && (
          <div className="text-neutral-500 text-sm mt-1">
            {request.comment}
          </div>
        )}
      </div>

      {onReview && isPending && (
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              onReview({
                type,
                requestId: request.id,
                status:
                  REQUEST_STATUS.APPROVED,
              })
            }
            className="px-4 py-2 rounded-xl bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-50"
          >
            Одобрить
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              onReview({
                type,
                requestId: request.id,
                status:
                  REQUEST_STATUS.REJECTED,
              })
            }
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
          >
            Отклонить
          </button>
        </div>
      )}

      {onDelete && (isPending || isApproved) && (
        <button
          type="button"
          disabled={submitting}
          onClick={onDelete}
          className="px-4 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50 shrink-0"
        >
          {isApproved
            ? "Удалить"
            : "Отменить запрос"}
        </button>
      )}
    </div>
  );
}

import {
  useEffect,
  useState,
} from "react";

import { useAuth }
from "../context/AuthContext";

import { useToast }
from "../context/ToastContext";

import {
  getAllNightShifts,
  addNightShift,
  updateNightShift,
  deleteNightShift,
  getShiftManagerName,
} from "../services/shiftService";

import { MANAGERS } from "../constants/managers";
import { NIGHT_SHIFT_BONUS } from "../constants/salary";

import LoadingState
from "../components/LoadingState";

import ConfirmModal
from "../components/ui/ConfirmModal";

export default function NightShiftsPage({
  embedded = false,
}) {
  const { user, userData } = useAuth();
  const toast = useToast();

  const [manager, setManager] =
    useState("");

  const [date, setDate] =
    useState("");

  const [shifts, setShifts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [editShift, setEditShift] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const actor = userData
    ? {
        ...userData,
        uid: user?.uid,
      }
    : null;

  useEffect(() => {
    loadShifts();
  }, []);

  async function loadShifts() {
    setLoading(true);

    const data =
      await getAllNightShifts();

    setShifts(data);
    setLoading(false);
  }

  async function addShift() {
    if (!manager || !date || !actor) {
      return;
    }

    setSaving(true);

    try {
      await addNightShift(
        {
          manager,
          date,
          amount: NIGHT_SHIFT_BONUS,
        },
        actor
      );

      toast.success(
        "Смена добавлена"
      );

      setManager("");
      setDate("");

      await loadShifts();
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось добавить"
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (
      !editShift ||
      !editShift.manager ||
      !editShift.date ||
      !actor
    ) {
      return;
    }

    setSaving(true);

    try {
      await updateNightShift({
        shiftId: editShift.id,
        updates: {
          manager: editShift.manager,
          date: editShift.date,
          amount: NIGHT_SHIFT_BONUS,
        },
        userData: actor,
      });

      toast.success(
        "Смена обновлена"
      );

      setEditShift(null);
      await loadShifts();
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось сохранить"
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !actor) {
      return;
    }

    setSaving(true);

    try {
      await deleteNightShift({
        shiftId: deleteTarget.id,
        userData: actor,
      });

      toast.success(
        "Смена удалена"
      );

      setShifts((current) =>
        current.filter(
          (item) =>
            item.id !==
            deleteTarget.id
        )
      );

      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось удалить"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Загрузка смен..." />
    );
  }

  return (
    <div>
      {!embedded && (
        <h1 className="text-4xl font-bold mb-8">
          Ночные смены
        </h1>
      )}

      <div className="bg-surface p-6 rounded-2xl max-w-xl">
        <select
          value={manager}
          onChange={(e) =>
            setManager(e.target.value)
          }
          className="w-full bg-surface-raised p-4 rounded-xl mb-4"
        >
          <option value="">
            Менеджер
          </option>

          {MANAGERS.map((item) => (
            <option
              key={item.id}
              value={item.name}
            >
              {item.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) =>
            setDate(e.target.value)
          }
          className="w-full bg-surface-raised p-4 rounded-xl mb-4"
        />

        <button
          onClick={addShift}
          disabled={saving}
          className="
            w-full bg-brand hover:bg-brand-muted
            p-4 rounded-xl font-bold
            disabled:opacity-50
          "
        >
          {saving
            ? "Сохранение..."
            : "Добавить смену"}
        </button>
      </div>

      <div className="mt-10 space-y-4">
        {shifts.map((shift) => (
          <div
            key={shift.id}
            className="
              bg-surface p-4 rounded-2xl
              flex flex-col sm:flex-row
              sm:justify-between gap-4
            "
          >
            <div>
              <div className="font-bold text-xl">
                {getShiftManagerName(
                  shift
                )}
              </div>

              <div className="text-neutral-400 mt-2">
                {shift.date}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-brand font-bold text-2xl">
                +{NIGHT_SHIFT_BONUS} ₽
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditShift({
                    id: shift.id,
                    manager:
                      shift.manager ||
                      getShiftManagerName(
                        shift
                      ),
                    date: shift.date,
                  })
                }
                className="
                  px-3 py-2 rounded-xl
                  bg-surface-raised hover:bg-surface-hover
                  text-sm
                "
              >
                Изменить
              </button>

              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(shift)
                }
                className="
                  px-3 py-2 rounded-xl
                  bg-red-600/80 hover:bg-red-600
                  text-sm
                "
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {editShift && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/60 p-4
          "
        >
          <div
            className="
              bg-surface border border-neutral-700
              rounded-2xl p-6 max-w-md w-full
            "
          >
            <h2 className="text-xl font-bold mb-4">
              Редактировать смену
            </h2>

            <select
              value={editShift.manager}
              onChange={(e) =>
                setEditShift({
                  ...editShift,
                  manager:
                    e.target.value,
                })
              }
              className="
                w-full bg-surface-raised
                p-3 rounded-xl mb-4
              "
            >
              {MANAGERS.map((item) => (
                <option
                  key={item.id}
                  value={item.name}
                >
                  {item.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={editShift.date}
              onChange={(e) =>
                setEditShift({
                  ...editShift,
                  date: e.target.value,
                })
              }
              className="
                w-full bg-surface-raised
                p-3 rounded-xl mb-6
              "
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() =>
                  setEditShift(null)
                }
                className="
                  px-4 py-2 rounded-xl
                  bg-surface-raised
                "
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="
                  px-4 py-2 rounded-xl
                  bg-brand-muted font-semibold
                  disabled:opacity-50
                "
              >
                {saving
                  ? "Сохранение..."
                  : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Удалить смену?"
        message={
          deleteTarget
            ? `${getShiftManagerName(deleteTarget)} — ${deleteTarget.date}`
            : ""
        }
        confirmLabel="Удалить"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() =>
          setDeleteTarget(null)
        }
      />
    </div>
  );
}

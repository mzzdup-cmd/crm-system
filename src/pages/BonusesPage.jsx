import {
  useEffect,
  useState,
} from "react";

import { useAuth }
from "../context/AuthContext";

import { useToast }
from "../context/ToastContext";

import {
  getAllManualBonuses,
  addManualBonus,
  updateManualBonus,
  deleteManualBonus,
  getBonusManagerName,
} from "../services/bonusService";

import { MANAGERS } from "../constants/managers";

import MoneyInput
from "../components/ui/MoneyInput";

import LoadingState
from "../components/LoadingState";

import {
  parseMoneyNumber,
} from "../utils/moneyFormat";

import ConfirmModal
from "../components/ui/ConfirmModal";

export default function BonusesPage({
  embedded = false,
}) {
  const { user, userData } = useAuth();
  const toast = useToast();

  const [manager, setManager] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [comment, setComment] =
    useState("");

  const [bonuses, setBonuses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [editBonus, setEditBonus] =
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
    loadBonuses();
  }, []);

  async function loadBonuses() {
    setLoading(true);

    const data =
      await getAllManualBonuses();

    setBonuses(data);
    setLoading(false);
  }

  async function addBonus() {
    if (!manager || !amount || !actor) {
      return;
    }

    setSaving(true);

    try {
      await addManualBonus(
        {
          manager,
          amount: parseMoneyNumber(amount),
          comment,
        },
        actor
      );

      toast.success(
        "Бонус добавлен"
      );

      setManager("");
      setAmount("");
      setComment("");

      await loadBonuses();
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
      !editBonus ||
      !editBonus.manager ||
      !editBonus.amount ||
      !actor
    ) {
      return;
    }

    setSaving(true);

    try {
      await updateManualBonus({
        bonusId: editBonus.id,
        updates: {
          manager: editBonus.manager,
          amount: parseMoneyNumber(
            editBonus.amount
          ),
          comment:
            editBonus.comment || "",
        },
        userData: actor,
      });

      toast.success(
        "Бонус обновлён"
      );

      setEditBonus(null);
      await loadBonuses();
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
      await deleteManualBonus({
        bonusId: deleteTarget.id,
        userData: actor,
      });

      toast.success(
        "Бонус удалён"
      );

      setBonuses((current) =>
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
      <LoadingState message="Загрузка бонусов..." />
    );
  }

  return (
    <div>
      {!embedded && (
        <h1 className="text-4xl font-bold mb-8">
          Ручные бонусы
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

        <MoneyInput
          placeholder="Сумма бонуса"
          value={amount}
          onChange={setAmount}
          className="w-full bg-surface-raised p-4 rounded-xl mb-4"
        />

        <textarea
          placeholder="Комментарий"
          value={comment}
          onChange={(e) =>
            setComment(e.target.value)
          }
          className="w-full bg-surface-raised p-4 rounded-xl mb-4"
        />

        <button
          onClick={addBonus}
          disabled={saving}
          className="
            w-full bg-pink-500 hover:bg-pink-600
            p-4 rounded-xl font-bold
            disabled:opacity-50
          "
        >
          {saving
            ? "Сохранение..."
            : "Добавить бонус"}
        </button>
      </div>

      <div className="mt-10 space-y-4">
        {bonuses.map((bonus) => (
          <div
            key={bonus.id}
            className="
              bg-surface p-4 rounded-2xl
              flex flex-col sm:flex-row
              sm:justify-between gap-4
            "
          >
            <div>
              <div className="font-bold text-xl">
                {getBonusManagerName(
                  bonus
                )}
              </div>

              <div className="text-neutral-400 mt-2">
                {bonus.comment ||
                  "Без комментария"}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-pink-400 font-bold text-2xl">
                +{bonus.amount} ₽
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditBonus({
                    id: bonus.id,
                    manager:
                      bonus.manager ||
                      getBonusManagerName(
                        bonus
                      ),
                    amount: bonus.amount,
                    comment:
                      bonus.comment || "",
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
                  setDeleteTarget(bonus)
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

      {editBonus && (
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
              Редактировать бонус
            </h2>

            <select
              value={editBonus.manager}
              onChange={(e) =>
                setEditBonus({
                  ...editBonus,
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

            <MoneyInput
              value={editBonus.amount}
              onChange={(value) =>
                setEditBonus({
                  ...editBonus,
                  amount: value,
                })
              }
              className="
                w-full bg-surface-raised
                p-3 rounded-xl mb-4
              "
            />

            <textarea
              value={editBonus.comment}
              onChange={(e) =>
                setEditBonus({
                  ...editBonus,
                  comment:
                    e.target.value,
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
                  setEditBonus(null)
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
                  bg-pink-600 font-semibold
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
        title="Удалить бонус?"
        message={
          deleteTarget
            ? `${getBonusManagerName(deleteTarget)} — +${deleteTarget.amount} ₽`
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

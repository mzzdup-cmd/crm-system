import {
  useEffect,
  useState,
  useMemo,
} from "react";

import { useAuth }
from "../context/AuthContext";

import { usePermissions }
from "../hooks/usePermissions";

import { useToast }
from "../context/ToastContext";

import {
  subscribeKnowledgeFaq,
  createKnowledgeFaqItem,
  updateKnowledgeFaqItem,
  deleteKnowledgeFaqItem,
} from "../services/knowledgeFaqService";

import {
  subscribeKnowledgeNotes,
  createKnowledgeNote,
  updateKnowledgeNote,
  deleteKnowledgeNote,
} from "../services/knowledgeNotesService";

import {
  subscribeKnowledgeScripts,
  createKnowledgeScript,
  updateKnowledgeScript,
  deleteKnowledgeScript,
  canEditScript,
} from "../services/knowledgeScriptsService";

import {
  filterActiveKnowledgeItems,
  itemMatchesSearch,
  itemMatchesTags,
  sortKnowledgeItems,
} from "../domain/knowledge/knowledgeSearch";

import { SCRIPT_TAGS } from "../constants/knowledgeBase";

export function useKnowledgeBase() {
  const { user, userData } = useAuth();
  const { isLeadership } = usePermissions();
  const toast = useToast();

  const [faq, setFaq] = useState([]);
  const [notes, setNotes] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const actor = userData
    ? {
        ...userData,
        uid: user?.uid || userData.uid,
        email:
          user?.email ||
          userData.email ||
          null,
      }
    : null;

  const createdByUid =
    user?.uid || actor?.uid || null;

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setLoading(true);

    const unsubFaq =
      subscribeKnowledgeFaq(setFaq);

    const unsubNotes =
      subscribeKnowledgeNotes(setNotes);

    const unsubScripts =
      subscribeKnowledgeScripts(
        userData,
        setScripts
      );

    setLoading(false);

    return () => {
      unsubFaq();
      unsubNotes();
      unsubScripts();
    };
  }, [userData]);

  const filteredFaq = useMemo(() => {
    return sortKnowledgeItems(
      filterActiveKnowledgeItems(faq).filter(
        (item) =>
          itemMatchesSearch(item, search)
      )
    );
  }, [faq, search]);

  const filteredNotes = useMemo(() => {
    return sortKnowledgeItems(
      filterActiveKnowledgeItems(notes).filter(
        (item) =>
          itemMatchesSearch(item, search)
      )
    );
  }, [notes, search]);

  const filteredScripts = useMemo(() => {
    return sortKnowledgeItems(
      filterActiveKnowledgeItems(scripts)
        .filter((item) =>
          itemMatchesSearch(item, search)
        )
        .filter((item) =>
          itemMatchesTags(
            item,
            selectedTags
          )
        )
    );
  }, [scripts, search, selectedTags]);

  function toggleTag(tag) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter(
            (item) => item !== tag
          )
        : [...current, tag]
    );
  }

  async function saveFaq(data, existing) {
    try {
      if (existing) {
        await updateKnowledgeFaqItem({
          id: existing.id,
          updates: data,
          userData: actor,
        });
      } else {
        await createKnowledgeFaqItem(
          data,
          actor
        );
      }

      toast.success("FAQ сохранён");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function removeFaq(item) {
    try {
      await deleteKnowledgeFaqItem({
        id: item.id,
        userData: actor,
      });
      toast.success("FAQ удалён");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveNote(data, existing) {
    try {
      if (existing) {
        await updateKnowledgeNote({
          id: existing.id,
          updates: data,
          userData: actor,
        });
      } else {
        await createKnowledgeNote(
          data,
          actor
        );
      }

      toast.success("Заметка сохранена");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function removeNote(item) {
    try {
      await deleteKnowledgeNote({
        id: item.id,
        userData: actor,
      });
      toast.success("Заметка удалена");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveScript(data, existing) {
    try {
      if (existing) {
        await updateKnowledgeScript({
          id: existing.id,
          updates: data,
          existing,
          userData: actor,
        });
      } else {
        await createKnowledgeScript(
          data,
          actor,
          createdByUid
        );
      }

      toast.success("Обработка сохранена");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function removeScript(item) {
    try {
      await deleteKnowledgeScript({
        id: item.id,
        existing: item,
        userData: actor,
      });
      toast.success("Обработка удалена");
    } catch (error) {
      toast.error(error.message);
    }
  }

  function canEdit(item) {
    if (isLeadership) {
      return true;
    }

    return canEditScript(item, userData);
  }

  const recentUpdates = useMemo(() => {
    return sortKnowledgeItems(
      filterActiveKnowledgeItems([
        ...notes.map((item) => ({
          ...item,
          section: "note",
        })),
        ...scripts.map((item) => ({
          ...item,
          section: "script",
        })),
        ...faq.map((item) => ({
          ...item,
          section: "faq",
        })),
      ])
    ).slice(0, 5);
  }, [faq, notes, scripts]);

  return {
    loading,
    isLeadership,
    search,
    setSearch,
    selectedTags,
    toggleTag,
    scriptTags: SCRIPT_TAGS,
    filteredFaq,
    filteredNotes,
    filteredScripts,
    recentUpdates,
    saveFaq,
    removeFaq,
    saveNote,
    removeNote,
    saveScript,
    removeScript,
    canEdit,
  };
}

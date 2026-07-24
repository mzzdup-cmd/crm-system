import {
  dialogLinksMatch,
} from "./dialogLinkUtils.js";

/**
 * When the form has a Bluesales dialog and BS ID found another
 * client card, refuse binding unless dialogs match.
 * Empty card dialog also rejects — otherwise a wrong BS ID
 * silently attaches a new dialog's sale to an old lead.
 */
export function shouldRejectBsIdBinding({
  formDialogLink,
  bsClientDialogLink,
}) {
  const formDialog = String(
    formDialogLink || ""
  ).trim();
  const bsDialog = String(
    bsClientDialogLink || ""
  ).trim();

  if (!formDialog) {
    return false;
  }

  if (!bsDialog) {
    return true;
  }

  return !dialogLinksMatch(
    formDialog,
    bsDialog
  );
}

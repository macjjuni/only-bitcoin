"use client";

import { createPortal } from "react-dom";
import ChatPanel, { type ChatPanelProps } from "./ChatPanel";

interface ChatPanelPortalProps extends ChatPanelProps {
  shouldRenderPanel: boolean;
}

export default function ChatPanelPortal({
  shouldRenderPanel,
  isClosing,
  identity,
  hasAcceptedNotice,
  draft,
  selectedReply,
  expandedMessageIds,
  savedScrollTop,
  pendingSayRequestId,
  onClose,
  onAcceptNotice,
  onChangeDraft,
  onChangeSelectedReply,
  onToggleMessageExpanded,
  onChangeSavedScrollTop,
  onChangePendingSayRequestId,
}: ChatPanelPortalProps) {
  if (!shouldRenderPanel) {
    return null;
  }

  return createPortal(
    <ChatPanel
      isClosing={isClosing}
      identity={identity}
      hasAcceptedNotice={hasAcceptedNotice}
      draft={draft}
      selectedReply={selectedReply}
      expandedMessageIds={expandedMessageIds}
      savedScrollTop={savedScrollTop}
      pendingSayRequestId={pendingSayRequestId}
      onClose={onClose}
      onAcceptNotice={onAcceptNotice}
      onChangeDraft={onChangeDraft}
      onChangeSelectedReply={onChangeSelectedReply}
      onToggleMessageExpanded={onToggleMessageExpanded}
      onChangeSavedScrollTop={onChangeSavedScrollTop}
      onChangePendingSayRequestId={onChangePendingSayRequestId}
    />,
    document.body,
  );
}

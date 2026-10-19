import { LockKeyhole, Sparkles, Trophy } from "lucide-react";
import { cosmeticKind, themeKind } from "../constants/store";

export function ProfileBadge({ id, inline = false }: { id: string | null | undefined; inline?: boolean }) {
  const kind = cosmeticKind(id);
  if (kind !== "comet" && kind !== "champion") return null;
  return <span className={`profile-badge badge-${kind}${inline ? " profile-badge-inline" : ""}`} aria-label={`${kind} badge`} title={`${kind} badge`}>
    {kind === "comet" ? <Sparkles size={13} fill="currentColor" /> : <Trophy size={13} fill="currentColor" />}
  </span>;
}

export function StorePreview({ id, assetUrl }: { id: string; assetUrl: string | null }) {
  const kind = cosmeticKind(id);
  if (kind === "comet" || kind === "champion") {
    return <div className={`store-item-preview store-preview-${kind}`} aria-hidden="true">
      <span className="store-preview-avatar">L<ProfileBadge id={id} /></span>
      <span className="store-preview-caption">Your profile</span>
    </div>;
  }
  if (kind === "aurora" || kind === "stardust") {
    return <div className={`store-item-preview store-preview-${kind}`} aria-hidden="true">
      <span className="store-mini-challenge"><span className="store-mini-mark"><LockKeyhole size={14} /></span><span>My 21 days<strong>Day 08</strong></span></span>
    </div>;
  }
  const previewName = themeKind(id);
  return <div className={`store-item-preview store-preview-${previewName}`} aria-hidden="true">
    {assetUrl ? <img src={assetUrl} alt="" loading="lazy" /> : <><span className="preview-orbit" /><span className="preview-lock"><LockKeyhole size={28} /></span></>}
  </div>;
}

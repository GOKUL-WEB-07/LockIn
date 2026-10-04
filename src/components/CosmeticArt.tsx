import { LockKeyhole, Sparkles, Trophy } from "lucide-react";
import { cosmeticKind } from "../constants/store";

export function ProfileBadge({ id }: { id: string | null | undefined }) {
  const kind = cosmeticKind(id);
  if (kind !== "comet" && kind !== "champion") return null;
  return <span className={`profile-badge badge-${kind}`} aria-label={`${kind} badge`} title={`${kind} badge`}>
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
  const previewName = id.endsWith("a001") ? "ocean" : id.endsWith("a002") ? "violet" : id.endsWith("a003") ? "rose" : id.endsWith("a004") ? "sunset" : id.endsWith("a005") ? "sage" : id.endsWith("a006") ? "amber" : "other";
  return <div className={`store-item-preview store-preview-${previewName}`} aria-hidden="true">
    {assetUrl ? <img src={assetUrl} alt="" loading="lazy" /> : <><span className="preview-orbit" /><span className="preview-lock"><LockKeyhole size={28} /></span></>}
  </div>;
}

import lockMark from "../assets/lock-mark.png";

export function BrandMark({ className = "" }: { className?: string }) {
  return <img className={`brand-mark ${className}`} src={lockMark} alt="" aria-hidden="true" />;
}

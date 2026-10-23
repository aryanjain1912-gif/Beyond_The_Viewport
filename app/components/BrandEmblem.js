import Image from "next/image";

export default function BrandEmblem({ className = "" }) {
  return (
    <Image
      className={`brand-emblem${className ? ` ${className}` : ""}`}
      src="/sanctum-emblem.svg"
      alt=""
      aria-hidden="true"
      width={44}
      height={44}
    />
  );
}

import Image from "next/image";

// Shared logo lockup for the signed-out shell (login/signup) — the source
// image already includes the "Nest" wordmark, so it needs no separate
// text label alongside it. alt names the product for screen readers.
export function BrandMark() {
  return (
    <div className="mb-2 flex justify-center">
      <Image src="/nest-logo-full.png" alt="Nest" width={168} height={168} priority />
    </div>
  );
}

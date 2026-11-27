import Image from "next/image";

export function BrandLogo({ preload = false }: { preload?: boolean }) {
  return (
    <span className="brand-logo-frame">
      <Image
        className="brand-logo"
        src="/jr-africa-logo-regular.png"
        alt="JR Africa"
        width={1983}
        height={793}
        preload={preload}
        sizes="(max-width: 740px) 118.75px, (max-width: 900px) 112.5px, 137.5px"
      />
    </span>
  );
}

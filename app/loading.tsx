import Image from "next/image";

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background/45 text-foreground backdrop-blur-[2px]"
      aria-label="Carregando Dragg"
      aria-live="polite"
    >
      <div className="relative grid size-24 place-items-center">
        <div className="dragg-loading-loader grid size-14 place-items-center rounded-full bg-primary">
          <Image
            src="/icon.svg"
            alt=""
            width={32}
            height={32}
            className="size-8 brightness-0"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

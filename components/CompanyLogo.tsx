import Image from "next/image";

type CompanyLogoProps = {
  logo: string;
  name: string;
  className?: string;
};

export default function CompanyLogo({
  logo,
  name,
  className = "flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50",
}: CompanyLogoProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null;
  let imageUrl = false;
  try {
    const url = new URL(logo);
    imageUrl =
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.origin === supabaseOrigin &&
      url.pathname.startsWith(
        "/storage/v1/object/public/feria-game-images/",
      );
  } catch {
    imageUrl = false;
  }

  return (
    <div className={className}>
      {imageUrl ? (
        <Image
          src={logo}
          alt={`Logo de ${name}`}
          width={96}
          height={96}
          unoptimized
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span
          aria-label={`Inicial de ${name}`}
          className="font-bold text-sky-800"
        >
          {name.trim().charAt(0).toLocaleUpperCase() || "E"}
        </span>
      )}
    </div>
  );
}

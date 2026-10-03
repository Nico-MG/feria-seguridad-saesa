import type { Product } from "@/types/event";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({
  product,
}: ProductCardProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
        🛡️
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        {product.name}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {product.description}
      </p>

      <button className="mt-4 text-sm font-semibold text-sky-600">
        Ver información →
      </button>
    </div>
  );
}
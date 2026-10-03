import {
  companies,
  products,
  stands,
} from "@/data/mock";

import type {
  Company,
  Product,
  Stand,
  Talk,
} from "@/types/event";

export function getCompanyById(
  companyId: number
): Company | undefined {
  return companies.find(
    (company) => company.id === companyId
  );
}

export function getStandBySlug(
  slug: string
): Stand | undefined {
  return stands.find(
    (stand) => stand.slug === slug
  );
}

export function getProductsByCompany(
  companyId: number
): Product[] {
  return products.filter(
    (product) => product.companyId === companyId
  );
}

export function getTalkCompany(
  talk: Talk
): Company | undefined {
  return getCompanyById(talk.companyId);
}

export function getStandCompany(
  stand: Stand
): Company | undefined {
  return getCompanyById(stand.companyId);
}
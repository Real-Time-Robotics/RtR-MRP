import { CustomersTable } from "@/components/customers/customers-table";
import prisma from "@/lib/prisma";

async function getCustomers() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });

  return customers.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    country: c.country,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    billingAddress: c.billingAddress,
    paymentTerms: c.paymentTerms,
    creditLimit: c.creditLimit,
    status: c.status,
  }));
}

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomersTable initialData={customers} />;
}

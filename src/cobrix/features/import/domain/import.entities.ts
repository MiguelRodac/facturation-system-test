/**
 * Canonical Domain Entities Re-exported for Import Feature
 * Points to the authoritative models in customers, contracts, invoices, and runs
 */

export type { CustomerEntity } from '../../customers/domain/customer.entities.ts'
export type { ContractEntity } from '../../contracts/domain/contract.entity.ts'
export type { InvoiceEntity } from '../../invoices/domain/invoice.entity.ts'
export type { SyncRunEntity, SyncRunItemEntity } from '../../runs/domain/runs.entities.ts'

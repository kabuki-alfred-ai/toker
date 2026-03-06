// Mock for Prisma generated client — used by Jest (ESM incompatibility with Prisma 6 generated files)
export class PrismaClient {
  $connect = jest.fn()
  $disconnect = jest.fn()
  $transaction = jest.fn()
  user = { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() }
  creditWallet = { create: jest.fn(), findUnique: jest.fn() }
  transcription = { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() }
}

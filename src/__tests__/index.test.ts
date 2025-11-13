import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../backup', () => ({
  executeBackupProcess: vi.fn()
}))

const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
}

// Mock process.exitCode
const originalExitCode = process.exitCode

describe('index module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('should execute backup process successfully', async () => {
    const { executeBackupProcess } = await import('../backup')
    vi.mocked(executeBackupProcess).mockResolvedValue(undefined)

    await import('../index')
    await new Promise((resolve) => setImmediate(resolve))

    expect(executeBackupProcess).toHaveBeenCalled()
    expect(process.exitCode).toBeUndefined()
    expect(consoleSpy.error).not.toHaveBeenCalled()
  })
})

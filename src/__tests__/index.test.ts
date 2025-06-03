import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the backup module
vi.mock('../backup', () => ({
  executeBackupProcess: vi.fn()
}))

// Mock console methods
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
    // Arrange
    const { executeBackupProcess } = await import('../backup')
    vi.mocked(executeBackupProcess).mockResolvedValue(undefined)

    // Act
    await import('../index')
    await new Promise((resolve) => setImmediate(resolve))

    // Assert
    expect(executeBackupProcess).toHaveBeenCalled()
    expect(process.exitCode).toBeUndefined()
    expect(consoleSpy.error).not.toHaveBeenCalled()
  })

  // Note: Testing the error case is complex due to module import timing
  // The error handling is covered by integration tests
})

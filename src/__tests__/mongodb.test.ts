import { type ChildProcess, spawn } from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureDirectoryExists } from '../lib/filesystem'
import { createMongoBackup } from '../lib/mongodb'

// Mock child_process spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}))

// Mock filesystem module
vi.mock('../lib/filesystem', () => ({
  ensureDirectoryExists: vi.fn()
}))

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
}

// Mock Date for consistent timestamps
const mockDate = new Date('2023-01-01T12:00:00.000Z')

describe('mongodb utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(
      mockDate.toISOString()
    )
    vi.mocked(ensureDirectoryExists).mockResolvedValue(undefined)
  })

  describe('createMongoBackup', () => {
    it('should create backup successfully', async () => {
      // Arrange
      const mongoUri = 'mongodb://localhost:27017/test'
      const backupDir = '/tmp/backups'

      const mockMongodump = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              // Simulate stdout data
              setImmediate(() => callback(Buffer.from('backup progress...')))
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate successful completion
            setImmediate(() => callback(0))
          }
        })
      }

      vi.mocked(spawn).mockReturnValue(mockMongodump as unknown as ChildProcess)

      // Act
      const result = await createMongoBackup(mongoUri, backupDir)

      // Assert
      expect(ensureDirectoryExists).toHaveBeenCalledWith(backupDir)
      expect(spawn).toHaveBeenCalledWith('mongodump', [
        `--uri=${mongoUri}`,
        expect.stringContaining('--archive='),
        '--gzip'
      ])
      expect(result).toEqual({
        backupFilePath: expect.stringContaining(
          'mongodb-backup-2023-01-01T12-00-00-000Z.gz'
        ),
        backupFileName: 'mongodb-backup-2023-01-01T12-00-00-000Z.gz'
      })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Backup created successfully')
      )
    })

    it('should handle mongodump failure with exit code', async () => {
      // Arrange
      const mongoUri = 'mongodb://localhost:27017/test'
      const backupDir = '/tmp/backups'
      const errorMessage = 'Connection failed'

      const mockMongodump = {
        stdout: {
          on: vi.fn()
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from(errorMessage)))
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate failure with exit code 1
            setImmediate(() => callback(1))
          }
        })
      }

      vi.mocked(spawn).mockReturnValue(mockMongodump as unknown as ChildProcess)

      // Act & Assert
      await expect(createMongoBackup(mongoUri, backupDir)).rejects.toThrow(
        `mongodump failed with exit code 1: ${errorMessage}`
      )
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'mongodump stderr:',
        errorMessage
      )
    })

    it('should handle mongodump error event', async () => {
      // Arrange
      const mongoUri = 'mongodb://localhost:27017/test'
      const backupDir = '/tmp/backups'
      const error = new Error('Command not found')

      const mockMongodump = {
        stdout: {
          on: vi.fn()
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            setImmediate(() => callback(error))
          }
        })
      }

      vi.mocked(spawn).mockReturnValue(mockMongodump as unknown as ChildProcess)

      // Act & Assert
      await expect(createMongoBackup(mongoUri, backupDir)).rejects.toThrow(
        'mongodump failed: Command not found'
      )
    })

    it('should handle mongodump failure with no stderr', async () => {
      // Arrange
      const mongoUri = 'mongodb://localhost:27017/test'
      const backupDir = '/tmp/backups'

      const mockMongodump = {
        stdout: {
          on: vi.fn()
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate failure with exit code 1 but no stderr
            setImmediate(() => callback(1))
          }
        })
      }

      vi.mocked(spawn).mockReturnValue(mockMongodump as unknown as ChildProcess)

      // Act & Assert
      await expect(createMongoBackup(mongoUri, backupDir)).rejects.toThrow(
        'mongodump failed with exit code 1: No error details'
      )
    })

    it('should log stdout when backup is successful', async () => {
      // Arrange
      const mongoUri = 'mongodb://localhost:27017/test'
      const backupDir = '/tmp/backups'
      const stdoutMessage = 'Writing test.collection to archive'

      const mockMongodump = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setImmediate(() => callback(Buffer.from(stdoutMessage)))
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback(0))
          }
        })
      }

      vi.mocked(spawn).mockReturnValue(mockMongodump as unknown as ChildProcess)

      // Act
      await createMongoBackup(mongoUri, backupDir)

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'mongodump output:',
        stdoutMessage
      )
    })
  })
})

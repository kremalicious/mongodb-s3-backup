import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeBackupProcess } from '../backup'
import { getRequiredEnvVariables } from '../lib/env'
import { removeDirectory, removeLocalFile } from '../lib/filesystem'
import { createMongoBackup } from '../lib/mongodb'
import { uploadFileToS3 } from '../lib/s3'

// Mock all dependencies
vi.mock('../lib/env')
vi.mock('../lib/filesystem')
vi.mock('../lib/mongodb')
vi.mock('../lib/s3')

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('backup process', () => {
  const mockEnvVars = {
    mongoUri: 'mongodb://localhost:27017/test',
    s3BucketName: 'test-bucket',
    awsAccessKeyId: 'test-access-key',
    awsSecretAccessKey: 'test-secret-key',
    awsRegion: 'us-east-1'
  }

  const mockBackupResult = {
    backupFilePath: '/tmp/mongo_backups/backup.gz',
    backupFileName: 'backup.gz'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequiredEnvVariables).mockReturnValue(mockEnvVars)
    vi.mocked(createMongoBackup).mockResolvedValue(mockBackupResult)
    vi.mocked(uploadFileToS3).mockResolvedValue({ ETag: '"abc123"' } as never)
    vi.mocked(removeLocalFile).mockResolvedValue(undefined)
    vi.mocked(removeDirectory).mockResolvedValue(undefined)
  })

  describe('executeBackupProcess', () => {
    it('should execute backup process successfully', async () => {
      // Act
      await executeBackupProcess()

      // Assert
      expect(getRequiredEnvVariables).toHaveBeenCalled()
      expect(createMongoBackup).toHaveBeenCalledWith(
        mockEnvVars.mongoUri,
        expect.stringContaining('tmp_mongo_backups')
      )
      expect(uploadFileToS3).toHaveBeenCalledWith(
        {
          region: mockEnvVars.awsRegion,
          accessKeyId: mockEnvVars.awsAccessKeyId,
          secretAccessKey: mockEnvVars.awsSecretAccessKey
        },
        mockEnvVars.s3BucketName,
        mockBackupResult.backupFilePath,
        mockBackupResult.backupFileName
      )
      expect(removeLocalFile).toHaveBeenCalledWith(
        mockBackupResult.backupFilePath
      )
      expect(removeDirectory).toHaveBeenCalledWith(
        expect.stringContaining('tmp_mongo_backups')
      )
    })

    it('should handle backup creation failure', async () => {
      // Arrange
      const error = new Error('MongoDB connection failed')
      vi.mocked(createMongoBackup).mockRejectedValue(error)

      // Act & Assert
      await expect(executeBackupProcess()).rejects.toThrow(
        'MongoDB connection failed'
      )
      expect(consoleSpy.error).toHaveBeenCalledWith('Backup failed:', error)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error details:',
        error.message
      )
      expect(consoleSpy.error).toHaveBeenCalledWith('Stack trace:', error.stack)
      expect(uploadFileToS3).not.toHaveBeenCalled()
      expect(removeDirectory).toHaveBeenCalledWith(
        expect.stringContaining('tmp_mongo_backups')
      )
    })

    it('should handle S3 upload failure', async () => {
      // Arrange
      const error = new Error('S3 upload failed')
      vi.mocked(uploadFileToS3).mockRejectedValue(error)

      // Act & Assert
      await expect(executeBackupProcess()).rejects.toThrow('S3 upload failed')
      expect(consoleSpy.error).toHaveBeenCalledWith('Backup failed:', error)
      expect(removeLocalFile).toHaveBeenCalledWith(
        mockBackupResult.backupFilePath
      )
      expect(removeDirectory).toHaveBeenCalledWith(
        expect.stringContaining('tmp_mongo_backups')
      )
    })

    it('should handle cleanup failure gracefully', async () => {
      // Arrange
      const cleanupError = new Error('Cleanup failed')
      vi.mocked(removeLocalFile).mockRejectedValue(cleanupError)

      // Act
      await executeBackupProcess()

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Cleanup failed but continuing:',
        cleanupError
      )
    })

    it('should handle directory cleanup failure gracefully', async () => {
      // Arrange
      const cleanupError = new Error('Directory cleanup failed')
      vi.mocked(removeDirectory).mockRejectedValue(cleanupError)

      // Act
      await executeBackupProcess()

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Cleanup failed but continuing:',
        cleanupError
      )
    })

    it('should handle env variable failure', async () => {
      // Arrange
      const error = new Error('MONGO_URL environment variable is not set.')
      vi.mocked(getRequiredEnvVariables).mockImplementation(() => {
        throw error
      })

      // Act & Assert
      await expect(executeBackupProcess()).rejects.toThrow(
        'MONGO_URL environment variable is not set.'
      )
      expect(consoleSpy.error).toHaveBeenCalledWith('Backup failed:', error)
      expect(createMongoBackup).not.toHaveBeenCalled()
      expect(removeDirectory).toHaveBeenCalledWith(
        expect.stringContaining('tmp_mongo_backups')
      )
    })

    it('should handle non-Error objects thrown', async () => {
      // Arrange
      const errorString = 'Non-Error object thrown'
      vi.mocked(createMongoBackup).mockRejectedValue(errorString)

      // Act & Assert
      await expect(executeBackupProcess()).rejects.toBe(errorString)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Backup failed:',
        errorString
      )
      // Should not call error.message or error.stack for non-Error objects
      expect(consoleSpy.error).not.toHaveBeenCalledWith(
        'Error details:',
        expect.anything()
      )
    })

    it('should perform cleanup even when no backup file path exists', async () => {
      // Arrange
      const error = new Error('Early failure')
      vi.mocked(getRequiredEnvVariables).mockImplementation(() => {
        throw error
      })

      // Act & Assert
      await expect(executeBackupProcess()).rejects.toThrow('Early failure')
      expect(removeLocalFile).not.toHaveBeenCalled()
      expect(removeDirectory).toHaveBeenCalledWith(
        expect.stringContaining('tmp_mongo_backups')
      )
    })
  })
})

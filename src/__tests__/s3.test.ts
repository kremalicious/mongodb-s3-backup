import { createReadStream } from 'node:fs'
import { S3Client } from '@aws-sdk/client-s3'
import { type Progress, Upload } from '@aws-sdk/lib-storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type S3ClientConfig, uploadFileToS3 } from '../lib/s3'

// Mock node:fs
vi.mock('node:fs', () => ({
  createReadStream: vi.fn()
}))

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn()
}))

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: vi.fn()
}))

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
}

// Mock process.stdout.write
const mockStdoutWrite = vi
  .spyOn(process.stdout, 'write')
  .mockImplementation(() => true)

describe('s3 utility', () => {
  const mockS3Config: S3ClientConfig = {
    region: 'us-east-1',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key'
  }

  const mockFileStream = {
    destroy: vi.fn()
  }

  const mockS3Client = {
    destroy: vi.fn()
  }

  const mockUpload = {
    on: vi.fn(),
    done: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createReadStream).mockReturnValue(mockFileStream as never)
    vi.mocked(S3Client).mockImplementation(() => mockS3Client as never)
    vi.mocked(Upload).mockImplementation(() => mockUpload as never)
  })

  describe('uploadFileToS3', () => {
    it('should upload file successfully without progress', async () => {
      // Arrange
      const bucketName = 'test-bucket'
      const filePath = '/path/to/file.gz'
      const s3Key = 'backup-file.gz'
      const mockResult = { ETag: '"abc123"' }

      mockUpload.done.mockResolvedValue(mockResult)

      // Act
      const result = await uploadFileToS3(
        mockS3Config,
        bucketName,
        filePath,
        s3Key
      )

      // Assert
      expect(createReadStream).toHaveBeenCalledWith(filePath)
      expect(S3Client).toHaveBeenCalledWith({
        region: mockS3Config.region,
        credentials: {
          accessKeyId: mockS3Config.accessKeyId,
          secretAccessKey: mockS3Config.secretAccessKey
        }
      })
      expect(Upload).toHaveBeenCalledWith({
        client: mockS3Client,
        params: {
          Bucket: bucketName,
          Key: s3Key,
          Body: mockFileStream
        }
      })
      expect(result).toBe(mockResult)
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `Uploading ${s3Key} to S3 bucket ${bucketName}...`
      )
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `File uploaded successfully to S3: s3://${bucketName}/${s3Key}`
      )
      expect(mockFileStream.destroy).toHaveBeenCalled()
      expect(mockS3Client.destroy).toHaveBeenCalled()
    })

    it('should handle upload progress', async () => {
      // Arrange
      const bucketName = 'test-bucket'
      const filePath = '/path/to/file.gz'
      const s3Key = 'backup-file.gz'
      const mockResult = { ETag: '"abc123"' }

      mockUpload.on.mockImplementation(
        (event: string, callback: (progress: Progress) => void) => {
          if (event === 'httpUploadProgress') {
            // Simulate progress callback
            setImmediate(() => {
              callback({ loaded: 1024 * 1024, total: 2 * 1024 * 1024 }) // 1MB of 2MB
              callback({ loaded: 2 * 1024 * 1024, total: 2 * 1024 * 1024 }) // Complete
            })
          }
        }
      )
      mockUpload.done.mockResolvedValue(mockResult)

      // Act
      const result = await uploadFileToS3(
        mockS3Config,
        bucketName,
        filePath,
        s3Key
      )

      // Assert
      expect(mockUpload.on).toHaveBeenCalledWith(
        'httpUploadProgress',
        expect.any(Function)
      )
      expect(mockStdoutWrite).toHaveBeenCalledWith('\n')
      expect(result).toBe(mockResult)
    })

    it('should handle upload error', async () => {
      // Arrange
      const bucketName = 'test-bucket'
      const filePath = '/path/to/file.gz'
      const s3Key = 'backup-file.gz'
      const error = new Error('Upload failed')

      mockUpload.done.mockRejectedValue(error)

      // Act & Assert
      await expect(
        uploadFileToS3(mockS3Config, bucketName, filePath, s3Key)
      ).rejects.toThrow('Upload failed')

      expect(mockStdoutWrite).toHaveBeenCalledWith('\n')
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error uploading file to S3:',
        error
      )
      expect(mockFileStream.destroy).toHaveBeenCalled()
      expect(mockS3Client.destroy).toHaveBeenCalled()
    })

    it('should handle progress without total size', async () => {
      // Arrange
      const bucketName = 'test-bucket'
      const filePath = '/path/to/file.gz'
      const s3Key = 'backup-file.gz'
      const mockResult = { ETag: '"abc123"' }

      mockUpload.on.mockImplementation(
        (event: string, callback: (progress: Progress) => void) => {
          if (event === 'httpUploadProgress') {
            // Simulate progress without total
            setImmediate(() => callback({ loaded: 1024 * 1024 }))
          }
        }
      )
      mockUpload.done.mockResolvedValue(mockResult)

      // Act
      const result = await uploadFileToS3(
        mockS3Config,
        bucketName,
        filePath,
        s3Key
      )

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalledWith(
        expect.stringContaining('Upload progress:')
      )
      expect(result).toBe(mockResult)
    })

    it('should handle progress without loaded size', async () => {
      // Arrange
      const bucketName = 'test-bucket'
      const filePath = '/path/to/file.gz'
      const s3Key = 'backup-file.gz'
      const mockResult = { ETag: '"abc123"' }

      mockUpload.on.mockImplementation(
        (event: string, callback: (progress: Progress) => void) => {
          if (event === 'httpUploadProgress') {
            // Simulate progress without loaded
            setImmediate(() => callback({ total: 2 * 1024 * 1024 }))
          }
        }
      )
      mockUpload.done.mockResolvedValue(mockResult)

      // Act
      const result = await uploadFileToS3(
        mockS3Config,
        bucketName,
        filePath,
        s3Key
      )

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalledWith(
        expect.stringContaining('Upload progress:')
      )
      expect(result).toBe(mockResult)
    })
  })
})

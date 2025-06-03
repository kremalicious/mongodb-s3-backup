import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type RequiredEnvVariables, getRequiredEnvVariables } from '../lib/env'

describe('env utility', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getRequiredEnvVariables', () => {
    it('should return all required environment variables when they are set', () => {
      // Arrange
      process.env.MONGO_URL = 'mongodb://localhost:27017/test'
      process.env.S3_BUCKET_NAME = 'test-bucket'
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.AWS_REGION = 'us-east-1'

      // Act
      const result: RequiredEnvVariables = getRequiredEnvVariables()

      // Assert
      expect(result).toEqual({
        mongoUri: 'mongodb://localhost:27017/test',
        s3BucketName: 'test-bucket',
        awsAccessKeyId: 'test-access-key',
        awsSecretAccessKey: 'test-secret-key',
        awsRegion: 'us-east-1'
      })
    })

    it('should throw error when MONGO_URL is not set', () => {
      // Arrange
      process.env.MONGO_URL = undefined
      process.env.S3_BUCKET_NAME = 'test-bucket'
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.AWS_REGION = 'us-east-1'

      // Act & Assert
      expect(() => getRequiredEnvVariables()).toThrow(
        'MONGO_URL environment variable is not set.'
      )
    })

    it('should throw error when S3_BUCKET_NAME is not set', () => {
      // Arrange
      process.env.MONGO_URL = 'mongodb://localhost:27017/test'
      process.env.S3_BUCKET_NAME = undefined
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.AWS_REGION = 'us-east-1'

      // Act & Assert
      expect(() => getRequiredEnvVariables()).toThrow(
        'S3_BUCKET_NAME environment variable is not set.'
      )
    })

    it('should throw error when AWS_ACCESS_KEY_ID is not set', () => {
      // Arrange
      process.env.MONGO_URL = 'mongodb://localhost:27017/test'
      process.env.S3_BUCKET_NAME = 'test-bucket'
      process.env.AWS_ACCESS_KEY_ID = undefined
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.AWS_REGION = 'us-east-1'

      // Act & Assert
      expect(() => getRequiredEnvVariables()).toThrow(
        'AWS_ACCESS_KEY_ID environment variable is not set.'
      )
    })

    it('should throw error when AWS_SECRET_ACCESS_KEY is not set', () => {
      // Arrange
      process.env.MONGO_URL = 'mongodb://localhost:27017/test'
      process.env.S3_BUCKET_NAME = 'test-bucket'
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
      process.env.AWS_SECRET_ACCESS_KEY = undefined
      process.env.AWS_REGION = 'us-east-1'

      // Act & Assert
      expect(() => getRequiredEnvVariables()).toThrow(
        'AWS_SECRET_ACCESS_KEY environment variable is not set.'
      )
    })

    it('should throw error when AWS_REGION is not set', () => {
      // Arrange
      process.env.MONGO_URL = 'mongodb://localhost:27017/test'
      process.env.S3_BUCKET_NAME = 'test-bucket'
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.AWS_REGION = undefined

      // Act & Assert
      expect(() => getRequiredEnvVariables()).toThrow(
        'AWS_REGION environment variable is not set.'
      )
    })

    it('should throw error when multiple environment variables are not set', () => {
      // Arrange
      process.env.MONGO_URL = undefined
      process.env.S3_BUCKET_NAME = undefined

      // Act & Assert
      expect(() => getRequiredEnvVariables()).toThrow(
        'MONGO_URL environment variable is not set.'
      )
    })
  })
})

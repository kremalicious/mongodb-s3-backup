import { promises as fsPromises } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureDirectoryExists,
  removeDirectory,
  removeLocalFile
} from '../lib/filesystem'

// Mock fs promises
vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn()
  }
}))

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('filesystem utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ensureDirectoryExists', () => {
    it('should create directory successfully', async () => {
      // Arrange
      const directoryPath = '/test/directory'
      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined)

      // Act
      await ensureDirectoryExists(directoryPath)

      // Assert
      expect(fsPromises.mkdir).toHaveBeenCalledWith(directoryPath, {
        recursive: true
      })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `Temporary backup directory ensured: ${directoryPath}`
      )
    })

    it('should handle directory creation error', async () => {
      // Arrange
      const directoryPath = '/test/directory'
      const error = new Error('Permission denied')
      vi.mocked(fsPromises.mkdir).mockRejectedValue(error)

      // Act & Assert
      await expect(ensureDirectoryExists(directoryPath)).rejects.toThrow(
        'Permission denied'
      )
      expect(consoleSpy.error).toHaveBeenCalledWith(
        `Error creating or ensuring directory ${directoryPath}:`,
        error
      )
    })
  })

  describe('removeLocalFile', () => {
    it('should remove file successfully', async () => {
      // Arrange
      const filePath = '/test/file.txt'
      vi.mocked(fsPromises.unlink).mockResolvedValue(undefined)

      // Act
      await removeLocalFile(filePath)

      // Assert
      expect(fsPromises.unlink).toHaveBeenCalledWith(filePath)
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `Successfully deleted local backup file: ${filePath}`
      )
    })

    it('should handle file removal error', async () => {
      // Arrange
      const filePath = '/test/file.txt'
      const error = new Error('File not found')
      vi.mocked(fsPromises.unlink).mockRejectedValue(error)

      // Act & Assert
      await expect(removeLocalFile(filePath)).rejects.toThrow('File not found')
      expect(consoleSpy.error).toHaveBeenCalledWith(
        `Error deleting local file ${filePath}:`,
        error
      )
    })
  })

  describe('removeDirectory', () => {
    it('should remove directory successfully', async () => {
      // Arrange
      const directoryPath = '/test/directory'
      vi.mocked(fsPromises.rm).mockResolvedValue(undefined)

      // Act
      await removeDirectory(directoryPath)

      // Assert
      expect(fsPromises.rm).toHaveBeenCalledWith(directoryPath, {
        recursive: true,
        force: true
      })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `Successfully deleted temporary directory: ${directoryPath}`
      )
    })

    it('should handle directory removal error', async () => {
      // Arrange
      const directoryPath = '/test/directory'
      const error = new Error('Directory not empty')
      vi.mocked(fsPromises.rm).mockRejectedValue(error)

      // Act & Assert
      await expect(removeDirectory(directoryPath)).rejects.toThrow(
        'Directory not empty'
      )
      expect(consoleSpy.error).toHaveBeenCalledWith(
        `Error deleting directory ${directoryPath}:`,
        error
      )
    })
  })
})

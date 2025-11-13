import { promises as fsPromises } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureDirectoryExists,
  removeDirectory,
  removeLocalFile
} from '../lib/filesystem'

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn()
  }
}))

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
      const directoryPath = '/test/directory'
      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined)

      await ensureDirectoryExists(directoryPath)

      expect(fsPromises.mkdir).toHaveBeenCalledWith(directoryPath, {
        recursive: true
      })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `Temporary backup directory ensured: ${directoryPath}`
      )
    })

    it('should handle directory creation error', async () => {
      const directoryPath = '/test/directory'
      const error = new Error('Permission denied')
      vi.mocked(fsPromises.mkdir).mockRejectedValue(error)

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
      const filePath = '/test/file.txt'
      vi.mocked(fsPromises.unlink).mockResolvedValue(undefined)

      await removeLocalFile(filePath)

      expect(fsPromises.unlink).toHaveBeenCalledWith(filePath)
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `Successfully deleted local backup file: ${filePath}`
      )
    })

    it('should handle file removal error', async () => {
      const filePath = '/test/file.txt'
      const error = new Error('File not found')
      vi.mocked(fsPromises.unlink).mockRejectedValue(error)

      await expect(removeLocalFile(filePath)).rejects.toThrow('File not found')
      expect(consoleSpy.error).toHaveBeenCalledWith(
        `Error deleting local file ${filePath}:`,
        error
      )
    })
  })

  describe('removeDirectory', () => {
    it('should remove directory successfully', async () => {
      const directoryPath = '/test/directory'
      vi.mocked(fsPromises.rm).mockResolvedValue(undefined)

      await removeDirectory(directoryPath)

      expect(fsPromises.rm).toHaveBeenCalledWith(directoryPath, {
        recursive: true,
        force: true
      })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `Successfully deleted temporary directory: ${directoryPath}`
      )
    })

    it('should handle directory removal error', async () => {
      const directoryPath = '/test/directory'
      const error = new Error('Directory not empty')
      vi.mocked(fsPromises.rm).mockRejectedValue(error)

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

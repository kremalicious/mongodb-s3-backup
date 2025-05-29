import { promises as fsPromises } from 'node:fs'

export async function ensureDirectoryExists(
  directoryPath: string
): Promise<void> {
  try {
    await fsPromises.mkdir(directoryPath, { recursive: true })
    console.log(`Temporary backup directory ensured: ${directoryPath}`)
  } catch (error) {
    console.error(
      `Error creating or ensuring directory ${directoryPath}:`,
      error
    )
    throw error
  }
}

export async function removeLocalFile(filePath: string): Promise<void> {
  try {
    await fsPromises.unlink(filePath)
    console.log(`Successfully deleted local backup file: ${filePath}`)
  } catch (error) {
    console.error(`Error deleting local file ${filePath}:`, error)
    throw error
  }
}

export async function removeDirectory(directoryPath: string): Promise<void> {
  try {
    await fsPromises.rm(directoryPath, { recursive: true, force: true })
    console.log(`Successfully deleted temporary directory: ${directoryPath}`)
  } catch (error) {
    console.error(`Error deleting directory ${directoryPath}:`, error)
    throw error
  }
}

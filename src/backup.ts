import { access } from 'node:fs/promises'
import path from 'node:path'
import { getRequiredEnvVariables } from './lib/env'
import { removeDirectory, removeLocalFile } from './lib/filesystem'
import { createMongoBackup } from './lib/mongodb'
import { uploadFileToS3 } from './lib/s3'

const TEMP_BACKUP_DIR: string = path.join(process.cwd(), 'tmp_mongo_backups')

export async function executeBackupProcess(): Promise<void> {
  let backupFilePath: string | undefined

  try {
    const {
      mongoUri,
      s3BucketName,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion
    } = getRequiredEnvVariables()

    const s3Config = {
      region: awsRegion,
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey
    }

    const backupResult = await createMongoBackup(mongoUri, TEMP_BACKUP_DIR)

    backupFilePath = backupResult.backupFilePath

    try {
      await access(backupFilePath)
    } catch {
      throw new Error(`Backup file was not created: ${backupFilePath}`)
    }

    await uploadFileToS3(
      s3Config,
      s3BucketName,
      backupFilePath,
      backupResult.backupFileName
    )
  } catch (error) {
    console.error('Backup failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
    throw error
  } finally {
    try {
      if (backupFilePath) await removeLocalFile(backupFilePath)
      await removeDirectory(TEMP_BACKUP_DIR)
    } catch (cleanupError) {
      console.error('Cleanup failed but continuing:', cleanupError)
    }
  }
}

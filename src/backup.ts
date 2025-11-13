import os from 'node:os'
import path from 'node:path'
import { getEnvVariables } from './lib/env'
import { removeDirectory, removeLocalFile } from './lib/filesystem'
import { createMongoBackup } from './lib/mongodb'
import { type S3ClientConfig, uploadFileToS3 } from './lib/s3'

const TEMP_BACKUP_DIR: string = path.join(os.tmpdir(), 'tmp_mongo_backups')

export async function executeBackupProcess(): Promise<void> {
  let backupFilePath: string | undefined

  try {
    const {
      mongoUri,
      s3BucketName,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion,
      awsEndpointUrl
    } = getEnvVariables()

    const s3Config: S3ClientConfig = {
      region: awsRegion,
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
      endpointUrl: awsEndpointUrl
    }

    const backupResult = await createMongoBackup(mongoUri, TEMP_BACKUP_DIR)
    backupFilePath = backupResult.backupFilePath

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

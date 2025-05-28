import { spawn } from 'node:child_process'
import path from 'node:path'
import { ensureDirectoryExists } from './filesystem'

export interface CreateMongoBackupResult {
  readonly backupFilePath: string
  readonly backupFileName: string
}

export async function createMongoBackup(
  mongoUri: string,
  backupDir: string
): Promise<CreateMongoBackupResult> {
  await ensureDirectoryExists(backupDir)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFileName = `mongodb-backup-${timestamp}.gz`
  const backupFilePath = path.join(backupDir, backupFileName)

  // using spawn to prevent injection vulnerabilities
  const mongodump = spawn('mongodump', [
    '--uri',
    mongoUri,
    '--archive',
    backupFilePath,
    '--gzip'
  ])

  return new Promise<CreateMongoBackupResult>((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    mongodump.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    mongodump.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    mongodump.on('close', (code) => {
      if (code === 0) {
        console.log(`Backup created successfully: ${backupFilePath}`)
        if (stdout) console.log('mongodump output:', stdout)
        resolve({ backupFilePath, backupFileName })
      } else {
        console.error('mongodump stderr:', stderr)
        reject(
          new Error(
            `mongodump failed with exit code ${code}: ${stderr || 'No error details'}`
          )
        )
      }
    })

    mongodump.on('error', (error) => {
      reject(new Error(`mongodump failed: ${error.message}`))
    })
  })
}

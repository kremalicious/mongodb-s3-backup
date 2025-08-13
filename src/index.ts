import { executeBackupProcess } from './backup'

executeBackupProcess().catch(() => {
  process.exitCode = 1
})

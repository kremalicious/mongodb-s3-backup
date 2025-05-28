import { executeBackupProcess } from './backup'

executeBackupProcess().catch((topLevelError) => {
  console.error(
    'A critical unexpected error occurred at the top level:',
    topLevelError
  )
  process.exitCode = 1
})

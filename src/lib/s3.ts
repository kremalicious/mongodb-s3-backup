import { createReadStream } from 'node:fs'
import { type PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3'
import { type Progress, Upload } from '@aws-sdk/lib-storage'

export interface S3ClientConfig {
  readonly region: string
  readonly accessKeyId: string
  readonly secretAccessKey: string
}

function createS3Client(config: S3ClientConfig): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  })
}

export async function uploadFileToS3(
  s3Config: S3ClientConfig,
  bucketName: string,
  filePath: string,
  s3Key: string
): Promise<PutObjectCommandOutput> {
  const s3Client = createS3Client(s3Config)
  console.log(`Uploading ${s3Key} to S3 bucket ${bucketName}...`)

  const fileStream = createReadStream(filePath)

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        // biome-ignore lint/style/useNamingConvention: S3 API
        Bucket: bucketName,
        // biome-ignore lint/style/useNamingConvention: S3 API
        Key: s3Key,
        // biome-ignore lint/style/useNamingConvention: S3 API
        Body: fileStream
      }
    })

    upload.on('httpUploadProgress', (progress: Progress) => {
      if (progress.loaded && progress.total) {
        const percentage: number = Math.round(
          (progress.loaded / progress.total) * 100
        )
        const loaded = (progress.loaded / 1024 / 1024).toFixed(2)
        const total = (progress.total / 1024 / 1024).toFixed(2)
        process.stdout.write(
          `Upload progress: ${percentage}% (${loaded}/${total} MB)\r`
        )
      }
    })

    const result: PutObjectCommandOutput = await upload.done()
    process.stdout.write('\n')
    console.log(`File uploaded successfully to S3: s3://${bucketName}/${s3Key}`)
    return result
  } catch (error) {
    process.stdout.write('\n')
    console.error('Error uploading file to S3:', error)
    throw error
  } finally {
    fileStream.destroy()
    s3Client.destroy()
  }
}

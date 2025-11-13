export interface EnvVariables {
  readonly mongoUri: string
  readonly s3BucketName: string
  readonly awsAccessKeyId: string
  readonly awsSecretAccessKey: string
  readonly awsRegion: string
  readonly awsEndpointUrl?: string
}

function validateEnvVariable(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} environment variable is not set.`)
  return value
}

export function getEnvVariables(): EnvVariables {
  return {
    mongoUri: validateEnvVariable(process.env.MONGO_URL, 'MONGO_URL'),
    s3BucketName: validateEnvVariable(
      process.env.S3_BUCKET_NAME,
      'S3_BUCKET_NAME'
    ),
    awsAccessKeyId: validateEnvVariable(
      process.env.AWS_ACCESS_KEY_ID,
      'AWS_ACCESS_KEY_ID'
    ),
    awsSecretAccessKey: validateEnvVariable(
      process.env.AWS_SECRET_ACCESS_KEY,
      'AWS_SECRET_ACCESS_KEY'
    ),
    awsRegion: validateEnvVariable(process.env.AWS_REGION, 'AWS_REGION'),
    awsEndpointUrl: process.env.AWS_ENDPOINT_URL
  }
}

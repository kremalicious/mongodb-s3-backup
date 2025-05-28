# MongoDB S3 Backup

A robust, strongly-typed MongoDB backup script that creates compressed database backups and uploads them to AWS S3 with extensive error handling.

- [Features](#features)
- [Docker Usage (Recommended)](#docker-usage-recommended)
  - [Build and Run](#build-and-run)
  - [Using Environment File](#using-environment-file)
- [Local Development (Alternative to Docker)](#local-development-alternative-to-docker)
- [Required Environment Variables](#required-environment-variables)
- [Error Handling](#error-handling)

## Features

- **Bulletproof error handling** - Comprehensive error catching and validation
- **Strongly typed** - Full TypeScript implementation with strict type checking
- **Docker-first** - Designed for containerized deployment
- Compressed MongoDB backups using `mongodump`
- S3 upload with progress tracking
- Automatic cleanup of temporary files


## Docker Usage (Recommended)

### Build and Run

```bash
# Build the image
docker build -t mongodb-s3-backup .

# Run with environment variables
docker run \
  -e MONGO_URL="mongodb://host.docker.internal:27017/your-database" \
  -e S3_BUCKET_NAME="your-s3-bucket" \
  -e AWS_ACCESS_KEY_ID="your-access-key" \
  -e AWS_SECRET_ACCESS_KEY="your-secret-key" \
  -e AWS_REGION="eu-central-1" \
  mongodb-s3-backup
```

### Using Environment File

Create `.env` file:

```env
MONGO_URL=mongodb://host.docker.internal:27017/your-database
S3_BUCKET_NAME=your-s3-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-central-1
```

Run with env file:
```bash
docker run --env-file .env mongodb-s3-backup
```

## Local Development (Alternative to Docker)

If you prefer running locally without Docker:

Create `.env` file:

```env
MONGO_URL=mongodb://host.docker.internal:27017/your-database
S3_BUCKET_NAME=your-s3-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-central-1
```

Then use these commands:

```bash
npm install
npm run build
npm start
```

**Note**: Ensure you have MongoDB tools (`mongodump`) installed locally when running outside Docker.

## Required Environment Variables

All environment variables are **strictly validated** at startup:

- `MONGO_URL` - MongoDB connection string
- `S3_BUCKET_NAME` - Target S3 bucket name
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (e.g., eu-central-1)

## Error Handling

The application will fail fast with clear error messages if:

- Any required environment variables are missing
- MongoDB connection fails
- S3 upload fails
- File system operations fail

Backup files are named: `mongodb-backup-YYYY-MM-DDTHH-MM-SS-SSSZ.gz`
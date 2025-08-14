#!/usr/bin/env bash
set -euo pipefail

# Usage (examples):
#   BUCKET=my-unique-bucket REGION=eu-central-1 USER=user-name bash create-s3-bucket-and-user.sh
#   BUCKET=my-unique-bucket REGION=eu-central-1 USER=user-name PERM=rw PREFIX=inbox/ bash create-s3-bucket-and-user.sh

# ---- config ----
BUCKET="${BUCKET:?set BUCKET}"
REGION="${REGION:?set REGION}"          # e.g., eu-central-1
USER="${USER:-user-name}"               # IAM username
PERM="${PERM:-writeonly}"               # writeonly | rw
PREFIX="${PREFIX:-}"                    # optional (e.g. inbox/)

S3API=(aws --region "$REGION" s3api)
IAM=(aws iam)

# ---- bucket (idempotent) ----
if "${S3API[@]}" head-bucket --bucket "$BUCKET" 2>/dev/null; then
  :
else
  if [ "$REGION" = "us-east-1" ]; then
    "${S3API[@]}" create-bucket --bucket "$BUCKET" >/dev/null
  else
    "${S3API[@]}" create-bucket --bucket "$BUCKET" \
      --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
  fi
fi

# Make it private & encrypted
"${S3API[@]}" put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null
"${S3API[@]}" put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null

# ---- user (idempotent-ish) ----
if ! "${IAM[@]}" get-user --user-name "$USER" >/dev/null 2>&1; then
  "${IAM[@]}" create-user --user-name "$USER" >/dev/null
fi

# ---- access key (creates ONE new pair) ----
read ACCESS_KEY_ID SECRET_ACCESS_KEY < <(
  "${IAM[@]}" create-access-key --user-name "$USER" \
    --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
)

# ---- policy (least-privilege) ----
BUCKET_ARN="arn:aws:s3:::$BUCKET"
if [ -n "$PREFIX" ]; then
  [[ "$PREFIX" == */ ]] || PREFIX="${PREFIX}/"
  OBJECTS_ARN="$BUCKET_ARN/${PREFIX}*"
  LIST_COND='"Condition":{"StringLike":{"s3:prefix":["'"$PREFIX"'*"]}}'
else
  OBJECTS_ARN="$BUCKET_ARN/*"
  LIST_COND=""
fi

if [ "$PERM" = "rw" ]; then
  POLICY_JSON=$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Sid":"List","Effect":"Allow","Action":["s3:ListBucket"],"Resource":"$BUCKET_ARN"${LIST_COND:+,$LIST_COND}},
  {"Sid":"RW","Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:AbortMultipartUpload","s3:CreateMultipartUpload","s3:UploadPart","s3:CompleteMultipartUpload"],"Resource":"$OBJECTS_ARN"}
]}
JSON
)
  POLICY_NAME="${USER}-s3-rw-$BUCKET"
else
  POLICY_JSON=$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Sid":"WriteOnly","Effect":"Allow","Action":["s3:PutObject","s3:AbortMultipartUpload","s3:CreateMultipartUpload","s3:UploadPart","s3:CompleteMultipartUpload"],"Resource":"$OBJECTS_ARN"}
]}
JSON
)
  POLICY_NAME="${USER}-s3-writeonly-$BUCKET"
fi

"${IAM[@]}" put-user-policy --user-name "$USER" --policy-name "$POLICY_NAME" --policy-document "$POLICY_JSON" >/dev/null

# ---- final output ----
echo "export AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
echo "export AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
echo "export AWS_REGION=$REGION"

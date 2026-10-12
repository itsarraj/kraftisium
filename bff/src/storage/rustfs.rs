use bytes::Bytes;
use chrono::Utc;
use hmac::{Hmac, Mac};
use object_store::aws::AmazonS3Builder;
use object_store::path::Path;
use object_store::{
    Attribute, Attributes, ObjectStore, ObjectStoreExt, PutMode, PutOptions, PutPayload,
};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

const EMPTY_PAYLOAD_SHA256: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("S3 error: {0}")]
    S3(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub struct RustFsStorage {
    store: Arc<dyn ObjectStore>,
    endpoint: String,
    bucket: String,
    access_key_id: String,
    secret_access_key: String,
    region: String,
    http: reqwest::Client,
}

impl RustFsStorage {
    pub fn new(
        endpoint: &str,
        bucket: &str,
        access_key_id: &str,
        secret_access_key: &str,
        region: &str,
    ) -> Self {
        let mut builder = AmazonS3Builder::new()
            .with_bucket_name(bucket)
            .with_region(region)
            .with_endpoint(endpoint)
            .with_access_key_id(access_key_id)
            .with_secret_access_key(secret_access_key)
            .with_virtual_hosted_style_request(false);
        if endpoint.starts_with("http://") {
            builder = builder.with_allow_http(true);
        }
        let store = builder
            .build()
            .expect("RustFS / S3 object store configuration");
        Self {
            store: Arc::new(store),
            endpoint: endpoint.to_string(),
            bucket: bucket.to_string(),
            access_key_id: access_key_id.to_string(),
            secret_access_key: secret_access_key.to_string(),
            region: region.to_string(),
            http: reqwest::Client::new(),
        }
    }

    /// Issues a SigV4-signed `PUT /{bucket}` (S3 CreateBucket) so a fresh RustFS/MinIO
    /// instance doesn't need the bucket provisioned out-of-band. Idempotent: an
    /// already-existing bucket owned by these credentials is treated as success.
    /// `object_store` only exposes object-level operations, not bucket management,
    /// so this is hand-signed rather than going through the `ObjectStore` trait.
    async fn ensure_bucket_exists(&self) -> Result<(), StorageError> {
        let host = self
            .endpoint
            .split("://")
            .nth(1)
            .unwrap_or(&self.endpoint)
            .trim_end_matches('/');
        let url = format!("{}/{}", self.endpoint.trim_end_matches('/'), self.bucket);

        let now = Utc::now();
        let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
        let date_stamp = now.format("%Y%m%d").to_string();
        let canonical_uri = format!("/{}", self.bucket);
        let canonical_headers = format!(
            "host:{host}\nx-amz-content-sha256:{EMPTY_PAYLOAD_SHA256}\nx-amz-date:{amz_date}\n"
        );
        let signed_headers = "host;x-amz-content-sha256;x-amz-date";
        let canonical_request = format!(
            "PUT\n{canonical_uri}\n\n{canonical_headers}\n{signed_headers}\n{EMPTY_PAYLOAD_SHA256}"
        );
        let credential_scope = format!("{date_stamp}/{}/s3/aws4_request", self.region);
        let string_to_sign = format!(
            "AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n{}",
            hex::encode(Sha256::digest(canonical_request.as_bytes()))
        );

        let sign = |key: &[u8], msg: &str| -> Vec<u8> {
            let mut mac = HmacSha256::new_from_slice(key).expect("HMAC accepts any key length");
            mac.update(msg.as_bytes());
            mac.finalize().into_bytes().to_vec()
        };
        let k_date = sign(format!("AWS4{}", self.secret_access_key).as_bytes(), &date_stamp);
        let k_region = sign(&k_date, &self.region);
        let k_service = sign(&k_region, "s3");
        let k_signing = sign(&k_service, "aws4_request");
        let signature = hex::encode(sign(&k_signing, &string_to_sign));

        let authorization = format!(
            "AWS4-HMAC-SHA256 Credential={}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}",
            self.access_key_id
        );

        let response = self
            .http
            .put(&url)
            .header("Host", host)
            .header("x-amz-content-sha256", EMPTY_PAYLOAD_SHA256)
            .header("x-amz-date", &amz_date)
            .header("Authorization", authorization)
            .send()
            .await
            .map_err(|e| StorageError::S3(format!("CreateBucket request failed: {e}")))?;

        // 409 covers BucketAlreadyOwnedByYou/BucketAlreadyExists -- already provisioned is success.
        if response.status().is_success() || response.status().as_u16() == 409 {
            Ok(())
        } else {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            Err(StorageError::S3(format!("CreateBucket failed ({status}): {body}")))
        }
    }

    pub async fn create_bucket_if_not_exists(&self) -> Result<(), StorageError> {
        self.ensure_bucket_exists().await?;

        let probe = Path::from("__kraftisium_bucket_init__");
        let _ = self.store.delete(&probe).await;
        match self
            .store
            .put(&probe, PutPayload::from_bytes(Bytes::new()))
            .await
        {
            Ok(_) => {
                let _ = self.store.delete(&probe).await;
                Ok(())
            }
            Err(e) => Err(StorageError::S3(format!("{e:?}"))),
        }
    }

    fn object_key(user_id: Uuid, resume_id: Uuid, file_name: &str) -> String {
        format!("resumes/{}/{}/{}", user_id, resume_id, file_name)
    }

    pub async fn store(
        &self,
        user_id: Uuid,
        resume_id: Uuid,
        file_name: &str,
        data: &[u8],
        content_type: &str,
    ) -> Result<String, StorageError> {
        let key = Self::object_key(user_id, resume_id, file_name);
        let path = Path::from(key.as_str());
        let mut attrs = Attributes::new();
        attrs.insert(Attribute::ContentType, content_type.to_string().into());
        let opts = PutOptions {
            mode: PutMode::Overwrite,
            attributes: attrs,
            ..Default::default()
        };
        self.store
            .put_opts(
                &path,
                PutPayload::from_bytes(Bytes::copy_from_slice(data)),
                opts,
            )
            .await
            .map_err(|e| StorageError::S3(format!("{e:?}")))?;
        Ok(key)
    }

    pub async fn delete(&self, storage_path: &str) -> Result<(), StorageError> {
        let path = Path::from(storage_path);
        self.store
            .delete(&path)
            .await
            .map_err(|e| StorageError::S3(format!("{e:?}")))
    }

    pub async fn get(&self, storage_path: &str) -> Result<Vec<u8>, StorageError> {
        let path = Path::from(storage_path);
        let result = self
            .store
            .get(&path)
            .await
            .map_err(|e| StorageError::S3(format!("{e:?}")))?;
        let bytes = result
            .bytes()
            .await
            .map_err(|e| StorageError::S3(format!("{e:?}")))?;
        Ok(bytes.to_vec())
    }
}

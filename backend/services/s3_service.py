import os
import uuid
import shutil
import boto3
from typing import BinaryIO, Tuple
from dotenv import load_dotenv

load_dotenv()

USE_LOCAL_STORAGE = os.getenv("USE_LOCAL_STORAGE", "true").lower() == "true"
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_BUCKET_EVIDENCIAS = os.getenv("AWS_BUCKET_EVIDENCIAS", "ecoraee-cloud-evidencias")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".pdf": "PDF",
    ".jpg": "JPG",
    ".jpeg": "JPG",
    ".png": "PNG",
    ".docx": "DOCX",
}


def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
    )


def detect_tipo_archivo(filename: str) -> Tuple[str, str]:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extensión '{ext}' no permitida. Solo se aceptan PDF, JPG, PNG, DOCX.")
    return ALLOWED_EXTENSIONS[ext], ext


def upload_evidence_file(file_obj: BinaryIO, filename: str, content_type: str) -> Tuple[str, str]:
    tipo_archivo, ext = detect_tipo_archivo(filename)
    unique_key = f"evidencia_{uuid.uuid4().hex[:12]}{ext}"

    file_obj.seek(0)

    if USE_LOCAL_STORAGE or not AWS_ACCESS_KEY_ID:
        local_path = os.path.join(UPLOAD_DIR, unique_key)
        with open(local_path, "wb") as out_file:
            shutil.copyfileobj(file_obj, out_file)
        file_url = f"{BACKEND_BASE_URL}/uploads/{unique_key}"
        return tipo_archivo, file_url

    s3_client = get_s3_client()
    s3_client.upload_fileobj(
        file_obj,
        AWS_BUCKET_EVIDENCIAS,
        unique_key,
        ExtraArgs={"ContentType": content_type},
    )
    s3_url = f"https://{AWS_BUCKET_EVIDENCIAS}.s3.{AWS_REGION}.amazonaws.com/{unique_key}"
    return tipo_archivo, s3_url


def delete_evidence_file(file_url: str) -> bool:
    if not file_url:
        return False

    try:
        key = file_url.split("/")[-1]
        if USE_LOCAL_STORAGE or "/uploads/" in file_url:
            local_path = os.path.join(UPLOAD_DIR, key)
            if os.path.exists(local_path):
                os.remove(local_path)
            return True

        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=AWS_BUCKET_EVIDENCIAS, Key=key)
        return True
    except Exception as e:
        print(f"Error al eliminar archivo de evidencia ({file_url}): {e}")
        return False


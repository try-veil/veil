import os
import requests
import logging
import json

from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error

# Load .env file and print status
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
loaded = load_dotenv(dotenv_path)
if loaded:
    print("Successfully loaded .env file")
else:
    print(f"Failed to load .env file at {dotenv_path}")

# Set up logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load credentials from environment variables
GRAFANA_URL = os.environ.get("GRAFANA_URL", "http://localhost:3001")
GRAFANA_ADMIN_USER = os.environ.get("GRAFANA_ADMIN_USER", "admin")
GRAFANA_ADMIN_PASSWORD = os.environ.get("GRAFANA_ADMIN_PASSWORD", "admin")

# FusionAuth config
FUSIONAUTH_URL = os.environ.get("FUSIONAUTH_URL")
FUSIONAUTH_API_KEY = os.environ.get("FUSIONAUTH_API_KEY")
FUSIONAUTH_APP_ID = os.environ.get("FUSIONAUTH_APP_ID")

if not FUSIONAUTH_URL or not FUSIONAUTH_API_KEY or not FUSIONAUTH_APP_ID:
    raise ValueError("Missing required FusionAuth environment variables: FUSIONAUTH_URL, FUSIONAUTH_API_KEY, or FUSIONAUTH_APP_ID")

print("FUSIONAUTH_URL:", os.environ.get("FUSIONAUTH_URL"))
print("FUSIONAUTH_API_KEY:", os.environ.get("FUSIONAUTH_API_KEY"))
print("FUSIONAUTH_APP_ID:", os.environ.get("FUSIONAUTH_APP_ID"))

# Set provider_id dynamically for each provider
provider_id = "provider1"  # Replace with your logic

# Generate unique bucket name
bucket_name = f"{provider_id}-logs"

# Initialize MinIO client
minio_client = Minio(
    "localhost:9000",
    access_key="minioadmin",      # Use your MinIO credentials
    secret_key="minioadmin",      # Use your MinIO credentials
    secure=False
)

# Create the bucket if it doesn't exist
if not minio_client.bucket_exists(bucket_name):
    minio_client.make_bucket(bucket_name)
    print(f"Bucket '{bucket_name}' created for provider '{provider_id}'.")
else:
    print(f"Bucket '{bucket_name}' already exists for provider '{provider_id}'.")

provider_email = "provider1@example.com"
provider_login = "provider1"
provider_password = "password123"

auth = (GRAFANA_ADMIN_USER, GRAFANA_ADMIN_PASSWORD)
headers = {"Content-Type": "application/json"}

try:
    # --- FusionAuth: Create user and register to Grafana app ---
    fusionauth_headers = {
        "Authorization": FUSIONAUTH_API_KEY,
        "Content-Type": "application/json"
    }
    # 0.1 Create FusionAuth user (if not exists)
    user_payload = {
        "user": {
            "email": provider_email,
            "username": provider_id,
            "password": provider_password,
            "active": True
        }
    }
    logger.info("Creating/checking FusionAuth user...")
    resp = requests.post(f"{FUSIONAUTH_URL}/api/user", json=user_payload, headers=fusionauth_headers)
    if resp.status_code in [200, 201]:
        fusionauth_user_id = resp.json()["user"]["id"]
        logger.info(f"FusionAuth user created: {fusionauth_user_id}")
    elif resp.status_code == 400 and "duplicate" in resp.text:
        # User exists, fetch user id
        resp2 = requests.get(f"{FUSIONAUTH_URL}/api/user?email={provider_email}", headers=fusionauth_headers)
        if resp2.status_code == 200:
            fusionauth_user_id = resp2.json()["user"]["id"]
            logger.info(f"FusionAuth user already exists: {fusionauth_user_id}")
        else:
            logger.error(f"Error fetching FusionAuth user: {resp2.text}")
            exit(1)
    else:
        logger.error(f"Error creating FusionAuth user: {resp.text}")
        exit(1)
    # 0.2 Register user to Grafana app in FusionAuth
    provider_fa_role = "provider"
    registration_payload = {
        "registration": {
            "applicationId": FUSIONAUTH_APP_ID,
            "roles": [provider_fa_role]
        }
    }
    logger.info("Registering user to FusionAuth Grafana app...")
    resp = requests.post(f"{FUSIONAUTH_URL}/api/user/registration/{fusionauth_user_id}", json=registration_payload, headers=fusionauth_headers)
    if resp.status_code in [200, 201]:
        logger.info("FusionAuth user registered to Grafana app.")
    elif resp.status_code == 409:
        logger.info("FusionAuth user already registered to Grafana app.")
    else:
        logger.error(f"Error registering FusionAuth user: {resp.text}")
        exit(1)

    # 0. Add Loki as a data source (if not already present)
    loki_datasource = {
        "name": "Loki",
        "type": "loki",
        "access": "proxy",
        "url": "http://host.docker.internal:3100",
        "uid" : "loki",
        "basicAuth": False,
        "isDefault": True
    }
    logger.info("Adding Loki data source...")
    resp = requests.post(f"{GRAFANA_URL}/api/datasources", auth=auth, json=loki_datasource)
    if resp.status_code == 409:
        logger.info("Loki data source already exists.")
    else:
        resp.raise_for_status()
        logger.info("Loki data source added successfully.")


    # 1. Create user
    new_user = {
        "name": f"Provider {provider_id}",
        "email": provider_email,
        "login": provider_login,
        "password": provider_password,
        "role": "Editor"
    }
    logger.info("Creating user...")
    resp = requests.post(f"{GRAFANA_URL}/api/admin/users", auth=auth, json=new_user)
    resp.raise_for_status()
    user_id = resp.json()["id"]
    logger.info(f"User created successfully. ID: {user_id}")

    # 1a. Explicitly add user to organization with Editor role
    org_add_url = f"{GRAFANA_URL}/api/org/users"
    org_payload = {
        "loginOrEmail": provider_login,
        "role": "Editor"
    }
    logger.info("Adding user to organization with Editor role...")
    resp = requests.post(org_add_url, auth=auth, json=org_payload)
    if resp.status_code == 409:
        logger.info("User already in organization, updating role if needed...")
        # Update the user's role
        update_role_url = f"{GRAFANA_URL}/api/org/users/{user_id}"
        update_payload = {"role": "Editor"}
        resp2 = requests.patch(update_role_url, auth=auth, json=update_payload)
        resp2.raise_for_status()
        logger.info("User role updated to Editor.")
    else:
        resp.raise_for_status()
        logger.info("User added to organization with Editor role successfully.")

    # 2. Create folder
    folder = {
        "uid": f"{provider_id}-folder",
        "title": f"{provider_id} Folder"
    }
    logger.info("Creating folder...")
    resp = requests.post(f"{GRAFANA_URL}/api/folders", auth=auth, json=folder)
    resp.raise_for_status()
    folder_uid = resp.json()["uid"]
    logger.info(f"Folder created successfully. UID: {folder_uid}")

    # 3. Set folder permissions
    permissions = {
        "items": [
            {
                "userId": user_id,
                "permission": 1  # 1 = View
            }
        ]
    }
    logger.info("Setting folder permissions...")
    resp = requests.post(f"{GRAFANA_URL}/api/folders/{folder_uid}/permissions", auth=auth, json=permissions)
    resp.raise_for_status()
    logger.info("Folder permissions set successfully.")


    dashboard = {
        "dashboard": {
            "id": None,
            "uid": f"{provider_id}-dashboard",
            "title": f"{provider_id} Dashboard",
            "tags": [provider_id],
            "timezone": "browser",
            "schemaVersion": 16,
            "version": 0,
            "panels": [
                {
                    "id": 1,
                    "gridPos": {"x": 0, "y": 0, "w": 24, "h": 9},
                    "title": "Logs",
                    "type": "logs",
                    "datasource": {"type": "loki", "uid": "loki"},
                    "targets": [{"expr": f'{{provider_id="{provider_id}"}}', "refId": "A"}]
                }
            ]
        },
        "folderUid": folder_uid,
        "overwrite": False
    }
    logger.info("Creating dashboard...")
    resp = requests.post(f"{GRAFANA_URL}/api/dashboards/db", auth=auth, json=dashboard)
    resp.raise_for_status()
    logger.info("Dashboard created successfully.")

    # Save dashboard JSON to file
    dashboard_filename = f"{provider_id}-dashboard.json"
    with open(dashboard_filename, "w") as f:
        json.dump(dashboard, f, indent=2)

    # Upload to MinIO
    minio_client.fput_object(
        bucket_name,           # Use your provider's bucket or a shared one
        dashboard_filename,    # Object name in MinIO
        dashboard_filename     # Local file path
    )
    print(f"Dashboard JSON uploaded to MinIO bucket '{bucket_name}' as '{dashboard_filename}'")

    print(f"Provider {provider_id} setup complete! User ID: {user_id}, Folder UID: {folder_uid}")

except requests.exceptions.HTTPError as e:
    logger.error(f"HTTP Error: {e.response.status_code} - {e.response.text}")
except Exception as e:
    logger.error(f"Error: {str(e)}")
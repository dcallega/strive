"""encrypt sensitive data

Revision ID: encrypt_sensitive_data
Revises: e5ea00b82916
Create Date: 2024-03-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from app.utils.encryption import encryption

# revision identifiers, used by Alembic.
revision = 'encrypt_sensitive_data'
down_revision = 'e5ea00b82916'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Get all existing records
    connection = op.get_bind()
    results = connection.execute(
        text("SELECT athlete_id, access_token, refresh_token FROM stravaaccount")
    ).fetchall()
    
    # Encrypt each record
    for row in results:
        athlete_id, access_token, refresh_token = row
        if access_token and not access_token.startswith('g'):  # Check if not already encrypted
            encrypted_access_token = encryption.encrypt(access_token)
            encrypted_refresh_token = encryption.encrypt(refresh_token)
            
            # Update the record with encrypted values
            connection.execute(
                text("UPDATE stravaaccount SET access_token = :access_token, refresh_token = :refresh_token WHERE athlete_id = :athlete_id"),
                {
                    "access_token": encrypted_access_token,
                    "refresh_token": encrypted_refresh_token,
                    "athlete_id": athlete_id
                }
            )

def downgrade() -> None:
    # Get all existing records
    connection = op.get_bind()
    results = connection.execute(
        text("SELECT athlete_id, access_token, refresh_token FROM stravaaccount")
    ).fetchall()
    
    # Decrypt each record
    for row in results:
        athlete_id, access_token, refresh_token = row
        if access_token and access_token.startswith('g'):  # Check if encrypted
            decrypted_access_token = encryption.decrypt(access_token)
            decrypted_refresh_token = encryption.decrypt(refresh_token)
            
            # Update the record with decrypted values
            connection.execute(
                text("UPDATE stravaaccount SET access_token = :access_token, refresh_token = :refresh_token WHERE athlete_id = :athlete_id"),
                {
                    "access_token": decrypted_access_token,
                    "refresh_token": decrypted_refresh_token,
                    "athlete_id": athlete_id
                }
            ) 
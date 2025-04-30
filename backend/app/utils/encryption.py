from cryptography.fernet import Fernet
import os
from base64 import b64encode, b64decode
from dotenv import load_dotenv

load_dotenv()

class Encryption:
    def __init__(self):
        # Get the encryption key from environment variable
        key = os.getenv('ENCRYPTION_KEY')
        if not key:
            raise ValueError("ENCRYPTION_KEY not found in environment variables. Please set it in your .env file.")
        self.fernet = Fernet(key if isinstance(key, bytes) else key.encode())

    def encrypt(self, data: str) -> str:
        """Encrypt a string and return the encrypted value as a base64 string."""
        if not data:
            return data
        encrypted_data = self.fernet.encrypt(data.encode())
        return b64encode(encrypted_data).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt a base64 encoded encrypted string."""
        if not encrypted_data:
            return encrypted_data
        try:
            decrypted_data = self.fernet.decrypt(b64decode(encrypted_data))
            return decrypted_data.decode()
        except Exception as e:
            print(f"Error decrypting data: {e}")
            return None

# Create a singleton instance
encryption = Encryption() 
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', '192.168.86.100')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'aquiferpe')
DB_USER = os.getenv('DB_USER', 'aquifer_app')
DB_PASSWORD = os.getenv('DB_PASSWORD')

def add_column():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()
        
        print("Adding 'verified' column to 'client' table...")
        cur.execute("ALTER TABLE client ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;")
        
        conn.commit()
        print("Column added successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_column()

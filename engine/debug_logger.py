import logging
import os
import sys
import functools
import time
import traceback
from datetime import datetime

# Get the data directory for logs
DATA_DIR = os.environ.get("BLANKWHALE_DATA_DIR", os.path.expanduser("~"))
LOG_FILE = os.path.join(DATA_DIR, "blankwhale_debug.log")

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, mode='a', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("blankwhale.debug")

def log_function(func):
    """Decorator to log function entry, exit, and any exceptions."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        func_name = func.__name__
        logger.debug(f"ENTER → {func_name} (args={args}, kwargs={kwargs})")
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"EXIT  → {func_name} (Duration: {duration:.4f}s)")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"FATAL → {func_name} failed after {duration:.4f}s")
            logger.error(f"Error: {str(e)}")
            logger.error(traceback.format_exc())
            raise e
    return wrapper

def log_info(msg): logger.info(msg)
def log_debug(msg): logger.debug(msg)
def log_warn(msg): logger.warning(msg)
def log_error(msg): logger.error(msg)

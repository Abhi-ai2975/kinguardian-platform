import asyncio
import time
import logging
from functools import wraps

logger = logging.getLogger(__name__)

"""
resilience.py
====================================
Purpose:
    Provides stability patterns for network-bound operations, including 
    asynchronous rate limiting (throttling) and exponential backoff retry logic.
"""

class RateLimiter:
    """ 
    Purpose:
        Keeps track of the time to ensure we don't hit a website too often.
        Acts as a guardian for external API quotas and server health.
    """
    def __init__(self, delay_seconds: int):
        """
        Purpose: Initializes the rate limiter with a specific delay.

        Args:
            delay_seconds (int): Minimum interval required between subsequent calls.
        """
        self.delay = delay_seconds
        self.last_call = 0
        self.lock = asyncio.Lock()

    async def throttle(self):
        """ 
        Purpose:
            Ensures the configured delay has passed since the last execution. 
            Call this before any network request.

        Returns:
            None
        """
        async with self.lock:
            elapsed = time.time() - self.last_call
            if elapsed < self.delay:
                wait_time = self.delay - elapsed
                logger.debug(f"Throttling: waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
            self.last_call = time.time()
    
def retry(attempts: int, delay: int):
    """ 
    Purpose:
        A decorator that tries a function again if it crashes. 
        Implements an exponential backoff strategy.

    Args:
        attempts (int): Maximum number of times to try the operation.
        delay (int): Initial wait time between retries in seconds.

    Returns:
        Callable: The decorated asynchronous function.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_delay = delay
            for i in range(attempts):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if i == attempts - 1:
                        logger.error(f"Final attempt failed in {func.__name__}: {e}")
                        raise e

                    logger.warning(
                        f"Attempt {i+1} failed in {func.__name__}. "
                        f"Retrying in {current_delay}s... Error: {e}"
                        )
                    await asyncio.sleep(current_delay)
                    current_delay *= 2
        return wrapper
    return decorator
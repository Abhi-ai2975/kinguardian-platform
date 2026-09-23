# import asyncio
# import time
# import logging
# from src.custom.utils.resilience import RateLimiter, retry

# # Setup logging to visualize the execution timeline
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
# logger = logging.getLogger(__name__)

# """
# test_resilience.py
# ====================================
# Purpose:
#     Validation suite for the Resilience module. This file simulates real-world 
#     network instability and API rate limits to ensure that the RateLimiter and 
#     Retry logic behave correctly in an asynchronous environment.

# Test Logic:
#     The test simulates a sequence of paper downloads. It validates two core behaviors:
#     1. Throttling: Ensures a mandatory 3-second gap between requests.
#     2. Resilience: Uses a mock function that intentionally fails to prove that 
#        the exponential backoff and retry mechanism can recover from "Network Blips."
# """

# @retry(attempts=3, delay=1)
# async def mock_download_paper(paper_id: str) -> dict:
#     """
#     Purpose:
#         A simulated "unstable" network function used to test the @retry decorator.
    
#     Behavior:
#         - Maintains an internal 'attempts' counter per paper_id.
#         - Step 1 & 2: Intentionally raises a ConnectionError (simulating a crash).
#         - Step 3: Successfully returns metadata.
    
#     Args:
#         paper_id (str): Unique identifier for the simulated paper.

#     Returns:
#         dict: Success metadata including the paper ID and status.

#     Raises:
#         ConnectionError: Simulated network failure for the first two attempts.
#     """
#     if not hasattr(mock_download_paper, "attempts"):
#         mock_download_paper.attempts = {}

#     attempt_count = mock_download_paper.attempts.get(paper_id, 1)

#     if attempt_count < 3:
#         mock_download_paper.attempts[paper_id] = attempt_count + 1
#         logger.info(f"  [Paper {paper_id}] simulating a crash...")
#         raise ConnectionError("Network blip!")

#     logger.info(f"  [Paper {paper_id}] Success! Download metadata.")
#     return {"id": paper_id, "status": "success"}


# async def run_test():
#     """
#     Purpose:
#         Orchestrates the sequential test flow for multiple paper IDs.
    
#     Test Flow:
#         1. Initializes RateLimiter with a 3-second delay (ArXiv standard).
#         2. Iterates through a list of paper IDs: ["111", "222", "333"].
#         3. For each ID, it triggers 'limiter.throttle()' to enforce the wait.
#         4. Calls 'mock_download_paper', which triggers the @retry logic.
#         5. Calculates total execution time to verify that both the throttling 
#            and retries happened in the expected time window (~9 seconds).
#     """
#     limiter = RateLimiter(delay_seconds=3) 
#     paper_ids = ["111", "222", "333"]
    
#     logger.info("Starting Resiliency Test...")
#     start_time = time.time()

#     for pid in paper_ids:
#         # 1. Test Throttling (Speed bump)
#         logger.info(f"Requesting Paper {pid}...")
#         await limiter.throttle()
        
#         # 2. Test Retrying (Safety net)
#         result = await mock_download_paper(pid)
        
#     total_time = time.time() - start_time
#     logger.info(f"Test Finished in {total_time:.2f} seconds.")
#     logger.info("Expected time: ~9 seconds (3 papers * 3s delay).")

# if __name__ == "__main__":
#     asyncio.run(run_test())